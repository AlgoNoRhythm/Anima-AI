'use client';

interface DocumentInfo {
  id: string;
  title: string;
}

interface DocumentSelectorProps {
  documents: DocumentInfo[];
  activeDocumentId: string | null;
  onSelect: (documentId: string) => void;
}

export function DocumentSelector({ documents, activeDocumentId, onSelect }: DocumentSelectorProps) {
  if (documents.length <= 1) return null;

  return (
    <div className="border-b px-3 py-2">
      <select
        value={activeDocumentId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
        aria-label="Select document"
      >
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}
          </option>
        ))}
      </select>
    </div>
  );
}
