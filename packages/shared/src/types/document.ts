export type ProcessingStatus = 'pending' | 'parsing' | 'indexing' | 'completed' | 'failed';

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  title: string | null;
  totalPages: number | null;
  status: ProcessingStatus;
  errorMessage: string | null;
  storageUrl: string;
  fileSize: number;
  treeIndex: unknown[] | null;
  createdAt: Date;
  updatedAt: Date;
}
