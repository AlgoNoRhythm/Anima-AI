import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before imports - factories must NOT reference outer const/let variables.

vi.mock('../../lib/auth-helpers', () => ({
  getUserId: vi.fn().mockResolvedValue('user-123'),
}));

vi.mock('../../lib/project-auth', () => ({
  requireProjectAccess: vi.fn(),
}));

vi.mock('@anima-ai/storage', () => ({
  createStorageClient: vi.fn(() => ({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('../../lib/queue-client', () => ({
  enqueueProcessing: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/crypto', () => ({
  decryptApiKey: vi.fn().mockReturnValue('decrypted-key'),
}));

vi.mock('@anima-ai/database', () => ({
  createDatabase: vi.fn(() => ({})),
  projectQueries: vi.fn(() => ({
    findByIdAndUser: vi.fn(),
    findByIdAndMember: vi.fn(),
  })),
  documentQueries: vi.fn(() => ({
    countByProjectId: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  })),
  chunkQueries: vi.fn(() => ({
    deleteByDocumentId: vi.fn(),
  })),
  analyticsQueries: vi.fn(() => ({
    logEvent: vi.fn().mockResolvedValue(undefined),
  })),
  apiKeyQueries: vi.fn(() => ({
    findByUserAndProvider: vi.fn().mockResolvedValue(null),
  })),
  personalityQueries: vi.fn(() => ({
    findByProjectId: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('@anima-ai/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anima-ai/shared')>();
  return {
    ...actual,
    MAX_FILE_SIZE_MB: 50,
    MAX_DOCUMENTS_PER_PROJECT: 100,
    SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain', 'text/markdown', 'text/html'],
    DEFAULT_MODEL_PROVIDER: 'anthropic',
  };
});

import { createStorageClient } from '@anima-ai/storage';
import { enqueueProcessing } from '../../lib/queue-client';
import { requireProjectAccess } from '../../lib/project-auth';
import { documentQueries, analyticsQueries, apiKeyQueries } from '@anima-ai/database';
import { uploadDocument, _resetUploadRateLimit } from '../../lib/actions/documents';

const PROJECT_ID = 'project-abc';
const mockRequireAccess = vi.mocked(requireProjectAccess);

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes).fill(65); // fill with 'A'
  // Add magic bytes for known formats so validation passes
  if (type === 'application/pdf' && sizeBytes >= 4) {
    content[0] = 0x25; // %
    content[1] = 0x50; // P
    content[2] = 0x44; // D
    content[3] = 0x46; // F
  }
  return new File([content], name, { type });
}

function makeFormData(file?: File): FormData {
  const fd = new FormData();
  if (file) fd.set('file', file);
  return fd;
}

function getDocMocks() {
  const q = vi.mocked(documentQueries)({} as any);
  return {
    countByProjectId: vi.mocked(q.countByProjectId),
    create: vi.mocked(q.create),
  };
}

function getStorageMocks() {
  const client = vi.mocked(createStorageClient)();
  return { put: vi.mocked(client.put) };
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetUploadRateLimit();
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.ANTHROPIC_API_KEY = 'test-key';

  // Default: requireProjectAccess succeeds as editor
  mockRequireAccess.mockResolvedValue({
    project: { id: PROJECT_ID, userId: 'user-123', name: 'Test', slug: 'test', mode: 'both', settings: {}, description: null, createdAt: new Date(), updatedAt: new Date() } as any,
    role: 'editor',
  });

  vi.mocked(documentQueries).mockReturnValue({
    countByProjectId: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ id: 'doc-1', filename: 'test.pdf' }),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  } as any);

  vi.mocked(analyticsQueries).mockReturnValue({
    logEvent: vi.fn().mockResolvedValue(undefined),
  } as any);

  vi.mocked(apiKeyQueries).mockReturnValue({
    findByUserAndProvider: vi.fn().mockResolvedValue(null),
  } as any);

  vi.mocked(createStorageClient).mockReturnValue({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    delete: vi.fn(),
  } as any);

  vi.mocked(enqueueProcessing).mockResolvedValue(undefined);
});

describe('uploadDocument', () => {
  describe('validation', () => {
    it('returns error when no file is provided', async () => {
      const result = await uploadDocument(PROJECT_ID, makeFormData());
      expect(result).toEqual({ success: false, error: 'No file provided' });
    });

    it('returns error when user lacks editor access', async () => {
      mockRequireAccess.mockResolvedValue({ error: 'Project not found' } as any);

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: false, error: 'Project not found' });
    });

    it('returns permission error for viewers', async () => {
      mockRequireAccess.mockResolvedValue({ error: 'You do not have permission to perform this action' } as any);

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: false, error: 'You do not have permission to perform this action' });
    });

    it('returns error for unsupported file type', async () => {
      const file = makeFile('malware.exe', 'application/octet-stream', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: false, error: 'Only PDF files are supported' });
    });

    it('returns error when file exceeds 50 MB', async () => {
      const overSizeBytes = 51 * 1024 * 1024; // 51 MB
      const file = makeFile('large.pdf', 'application/pdf', overSizeBytes);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: false, error: 'File must be under 50MB' });
    });

    it('returns error when document limit is reached', async () => {
      vi.mocked(documentQueries).mockReturnValue({
        countByProjectId: vi.fn().mockResolvedValue(100),
        create: vi.fn(),
        findById: vi.fn(),
        updateStatus: vi.fn(),
        delete: vi.fn(),
      } as any);

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({
        success: false,
        error: 'Maximum 100 documents per project',
      });
    });
  });

  describe('successful upload', () => {
    it('uploads a valid PDF and returns documentId', async () => {
      const file = makeFile('manual.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));

      expect(result).toEqual({ success: true, documentId: 'doc-1' });
    });

    it('calls storage.put with the correct storage URL and mime type', async () => {
      const storageMocks = getStorageMocks();
      const file = makeFile('report.pdf', 'application/pdf', 2048);
      await uploadDocument(PROJECT_ID, makeFormData(file));

      expect(storageMocks.put).toHaveBeenCalledOnce();
      const [storageUrl, _buffer, mimeType] = storageMocks.put.mock.calls[0] as [string, Buffer, string];
      expect(storageUrl).toContain(`projects/${PROJECT_ID}/documents/`);
      expect(storageUrl).toContain('report.pdf');
      expect(mimeType).toBe('application/pdf');
    });

    it('creates a DB record with correct project, filename and size', async () => {
      const docMocks = getDocMocks();
      const file = makeFile('guide.pdf', 'application/pdf', 512);
      await uploadDocument(PROJECT_ID, makeFormData(file));

      expect(docMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: PROJECT_ID,
          filename: 'guide.pdf',
          fileSize: 512,
        }),
      );
    });

    it('enqueues processing after upload with correct arguments', async () => {
      const file = makeFile('doc.pdf', 'application/pdf', 1024);
      await uploadDocument(PROJECT_ID, makeFormData(file));

      expect(vi.mocked(enqueueProcessing)).toHaveBeenCalledWith(
        'doc-1',
        PROJECT_ID,
        expect.any(String),
        'doc.pdf',
        expect.any(Buffer),
        'test-key', // falls back to ANTHROPIC_API_KEY env var when no stored key
        'anthropic',
      );
    });

    it('accepts text/plain files', async () => {
      const file = makeFile('readme.txt', 'text/plain', 512);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: true, documentId: 'doc-1' });
    });

    it('accepts text/markdown files', async () => {
      const file = makeFile('notes.md', 'text/markdown', 256);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: true, documentId: 'doc-1' });
    });

    it('succeeds even when analytics logging throws (non-fatal)', async () => {
      vi.mocked(analyticsQueries).mockReturnValue({
        logEvent: vi.fn().mockRejectedValue(new Error('analytics down')),
      } as any);

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({ success: true, documentId: 'doc-1' });
    });

    it('requires editor role', async () => {
      const file = makeFile('test.pdf', 'application/pdf', 1024);
      await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(mockRequireAccess).toHaveBeenCalledWith(PROJECT_ID, 'editor');
    });
  });

  describe('error handling', () => {
    it('returns error when no API key is available', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({
        success: false,
        error: 'An AI provider API key is required for document processing. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment, or add one in Settings.',
      });
    });

    it('returns error on storage failure', async () => {
      vi.mocked(createStorageClient).mockReturnValue({
        put: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
        get: vi.fn(),
        delete: vi.fn(),
      } as any);

      const file = makeFile('test.pdf', 'application/pdf', 1024);
      const result = await uploadDocument(PROJECT_ID, makeFormData(file));
      expect(result).toEqual({
        success: false,
        error: 'An unexpected error occurred during upload',
      });
    });
  });
});
