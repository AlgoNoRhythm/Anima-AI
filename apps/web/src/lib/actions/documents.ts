'use server';

import { createDatabase, projectQueries, documentQueries, chunkQueries, analyticsQueries, apiKeyQueries, personalityQueries } from '@anima-ai/database';
import { createStorageClient } from '@anima-ai/storage';
import { getUserId } from '../auth-helpers';
import { requireProjectAccess } from '../project-auth';
import { enqueueProcessing } from '../queue-client';
import { decryptApiKey } from '../crypto';
import { MAX_FILE_SIZE_MB, MAX_DOCUMENTS_PER_PROJECT, SUPPORTED_FILE_TYPES, DEFAULT_MODEL_PROVIDER, createLogger } from '@anima-ai/shared';

const log = createLogger('action:documents');

// Upload rate limiting: max 10 uploads per 60 seconds per user
const uploadTimestamps = new Map<string, number[]>();
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_WINDOW_MS = 60_000;

const uploadCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of uploadTimestamps) {
    const valid = timestamps.filter((t) => now - t < UPLOAD_RATE_WINDOW_MS);
    if (valid.length === 0) {
      uploadTimestamps.delete(userId);
    } else {
      uploadTimestamps.set(userId, valid);
    }
  }
}, 5 * 60_000);
uploadCleanupInterval.unref();

/** @internal — exposed for test cleanup only */
export async function _resetUploadRateLimit() {
  uploadTimestamps.clear();
}

function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = uploadTimestamps.get(userId) ?? [];
  const valid = timestamps.filter((t) => now - t < UPLOAD_RATE_WINDOW_MS);
  if (valid.length >= UPLOAD_RATE_LIMIT) {
    return false;
  }
  valid.push(now);
  uploadTimestamps.set(userId, valid);
  return true;
}

function validateFileMagicBytes(buffer: Buffer, mimeType: string): string | null {
  if (mimeType === 'application/pdf') {
    // PDF magic bytes: %PDF (0x25504446)
    if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return 'File does not appear to be a valid PDF';
    }
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // DOCX magic bytes: PK (ZIP format, 0x504B)
    if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      return 'File does not appear to be a valid DOCX';
    }
  }
  // TXT/MD/HTML: no reliable magic bytes, skip validation
  return null;
}

export async function uploadDocument(projectId: string, formData: FormData) {
  try {
    const access = await requireProjectAccess(projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }
    const project = access.project!;
    const userId = await getUserId();

    // Rate limit check
    if (!checkUploadRateLimit(userId)) {
      return { success: false, error: 'Upload rate limit exceeded. Please wait before uploading more files.' };
    }

    const db = createDatabase();

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (!(SUPPORTED_FILE_TYPES as readonly string[]).includes(file.type)) {
      return { success: false, error: 'Only PDF files are supported' };
    }

    // Validate file size
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { success: false, error: `File must be under ${MAX_FILE_SIZE_MB}MB` };
    }

    // Check document limit
    const docs = documentQueries(db);
    const docCount = await docs.countByProjectId(projectId);
    if (docCount >= MAX_DOCUMENTS_PER_PROJECT) {
      return { success: false, error: `Maximum ${MAX_DOCUMENTS_PER_PROJECT} documents per project` };
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file magic bytes
    const magicError = validateFileMagicBytes(buffer, file.type);
    if (magicError) {
      return { success: false, error: magicError };
    }

    // Upload to storage
    const storageUrl = `projects/${projectId}/documents/${crypto.randomUUID()}/${file.name}`;
    const storage = createStorageClient();
    await storage.put(storageUrl, buffer, file.type);

    // Create DB record
    const doc = await docs.create({
      projectId,
      filename: file.name,
      title: file.name.replace(/\.pdf$/i, ''),
      storageUrl,
      fileSize: file.size,
    });

    // Determine which provider the project uses so we fetch the right API key
    const personality = await personalityQueries(db).findByProjectId(projectId);
    const provider = (personality?.modelProvider ?? DEFAULT_MODEL_PROVIDER) as string;

    // Retrieve API key for indexing: stored key (Settings) takes priority over env var
    let indexingApiKey: string | undefined;
    try {
      const storedKey = await apiKeyQueries(db).findByUserAndProvider(userId, provider);
      if (storedKey) {
        indexingApiKey = decryptApiKey(storedKey.encryptedKey);
      }
    } catch (keyErr) {
      log.warn('Failed to retrieve stored API key', { error: keyErr instanceof Error ? keyErr.message : String(keyErr) });
    }

    // Fall back to env var
    if (!indexingApiKey) {
      indexingApiKey = provider === 'anthropic'
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;
    }

    if (!indexingApiKey) {
      const providerLabel = provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
      const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
      return {
        success: false,
        error: `${providerLabel} API key is required for document processing. Add it in Settings or set ${envVar} environment variable.`,
      };
    }

    // Enqueue processing (or process locally)
    await enqueueProcessing(doc.id, projectId, storageUrl, file.name, buffer, indexingApiKey, provider);

    // Log analytics event for document upload
    try {
      const analytics = analyticsQueries(db);
      await analytics.logEvent({
        projectId,
        eventType: 'document_viewed',
        metadata: { action: 'document_uploaded', documentId: doc.id, filename: file.name },
      });
    } catch (analyticsErr) {
      // Non-fatal: don't fail the upload if analytics logging fails
      log.error('Failed to log document_uploaded analytics event', { error: analyticsErr instanceof Error ? analyticsErr.message : analyticsErr });
    }

    return { success: true, documentId: doc.id };
  } catch (error) {
    log.error('uploadDocument error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred during upload' };
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const db = createDatabase();
    const docs = documentQueries(db);

    const doc = await docs.findById(documentId);
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }

    // Verify user has editor access to the project
    const access = await requireProjectAccess(doc.projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    // Delete from storage
    try {
      const storage = createStorageClient();
      await storage.delete(doc.storageUrl);
    } catch {
      // Storage deletion failure is non-fatal
    }

    // Delete from DB (cascades to chunks)
    await docs.delete(documentId);

    return { success: true };
  } catch (error) {
    log.error('deleteDocument error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateDocumentEntity(documentId: string, entity: string) {
  try {
    const db = createDatabase();
    const docs = documentQueries(db);

    const doc = await docs.findById(documentId);
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }

    const access = await requireProjectAccess(doc.projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const trimmed = entity.trim();
    await docs.updateEntity(documentId, trimmed || null);

    return { success: true };
  } catch (error) {
    log.error('updateDocumentEntity error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function reprocessDocument(documentId: string) {
  try {
    const userId = await getUserId();
    const db = createDatabase();
    const docs = documentQueries(db);

    const doc = await docs.findById(documentId);
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }

    // Verify user has editor access to the project
    const access = await requireProjectAccess(doc.projectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }

    // Delete existing chunks so we start fresh
    await chunkQueries(db).deleteByDocumentId(documentId);

    // Reset document status to pending
    await docs.updateStatus(documentId, 'pending');

    // Get the file from storage and read as buffer
    const storage = createStorageClient();
    const buffer = await storage.get(doc.storageUrl);
    if (!buffer) {
      return { success: false, error: 'Original file not found in storage' };
    }

    // Determine provider and API key for reprocessing
    const personality = await personalityQueries(db).findByProjectId(doc.projectId);
    const reProvider = (personality?.modelProvider ?? DEFAULT_MODEL_PROVIDER) as string;
    let reApiKey: string | undefined;
    try {
      const storedKey = await apiKeyQueries(db).findByUserAndProvider(userId, reProvider);
      if (storedKey) {
        reApiKey = decryptApiKey(storedKey.encryptedKey);
      }
    } catch { /* fall through to env */ }
    if (!reApiKey) {
      reApiKey = reProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
    }

    // Enqueue processing again
    await enqueueProcessing(doc.id, doc.projectId, doc.storageUrl, doc.filename, buffer, reApiKey, reProvider);

    return { success: true };
  } catch (error) {
    log.error('reprocessDocument error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred during reprocessing' };
  }
}
