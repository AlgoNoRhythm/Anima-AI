'use client';

import { useState, useCallback } from 'react';
import { updateDocumentEntity } from '@/lib/actions/documents';
import { useToast } from '@/components/toast';

export function EntityEditor({
  documentId,
  initialEntity,
}: {
  documentId: string;
  initialEntity: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialEntity ?? '');
  const [saving, setSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(initialEntity);
  const toastCtx = useToast();

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await updateDocumentEntity(documentId, value);
    if (result.success) {
      setDisplayValue(value.trim() || null);
      setEditing(false);
      toastCtx.success('Entity updated');
    } else {
      toastCtx.error(result.error || 'Failed to update entity');
    }
    setSaving(false);
  }, [documentId, value, toastCtx]);

  const handleCancel = useCallback(() => {
    setValue(displayValue ?? '');
    setEditing(false);
  }, [displayValue]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="text-sm font-medium bg-background border rounded-md px-2 py-1 w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Nespresso Vertuo Plus"
          autoFocus
          disabled={saving}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">
        {displayValue || <span className="text-muted-foreground italic">Not detected</span>}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Edit entity"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
}
