'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFileSelect: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export function FileUpload({
  accept = 'application/pdf',
  maxSize,
  onFileSelect,
  className,
  disabled = false,
  multiple = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter((f) => {
      if (accept && !accept.split(',').some((t) => f.type.match(t.trim()))) return false;
      if (maxSize && f.size > maxSize) return false;
      return true;
    });
    if (fileArray.length > 0) onFileSelect(fileArray);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-300 cursor-pointer group',
        isDragging
          ? 'border-gold bg-gold/5 shadow-gold'
          : 'border-muted-foreground/25 hover:border-gold/50 hover:shadow-gold',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className={cn(
        'rounded-full p-3 mb-4 transition-colors duration-300',
        isDragging ? 'bg-gold/10' : 'bg-muted group-hover:bg-gold/10',
      )}>
        <Upload className={cn(
          'h-8 w-8 transition-colors duration-300',
          isDragging ? 'text-gold' : 'text-muted-foreground group-hover:text-gold',
        )} />
      </div>
      <p className="text-sm font-medium mb-1">
        Drag & drop files here, or click to browse
      </p>
      <p className="text-xs text-muted-foreground">
        PDF files only{maxSize ? `, max ${Math.round(maxSize / 1024 / 1024)}MB` : ''}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
