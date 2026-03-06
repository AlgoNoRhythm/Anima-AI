'use client';

import { useState, useCallback, useRef } from 'react';
import { createProject } from '@/lib/actions/projects';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export function NewProjectForm({ serverError }: { serverError?: string }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(false);
  const autoGenEnabled = useRef(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrors = useCallback(() => {
    setErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, []);

  const handleNameChange = useCallback(() => {
    const value = nameRef.current?.value ?? '';
    if (autoGenEnabled.current && !slugTouched.current && slugRef.current) {
      slugRef.current.value = slugify(value);
    }
    clearErrors();
  }, [clearErrors]);

  const handleSlugChange = useCallback(() => {
    slugTouched.current = true;
    clearErrors();
  }, [clearErrors]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const nameVal = nameRef.current?.value ?? '';
    const slugVal = slugRef.current?.value ?? '';

    const allErrors: Record<string, string> = {};
    if (!nameVal.trim()) allErrors.name = 'Project name is required';
    if (!slugVal.trim()) allErrors.slug = 'URL slug is required';
    else if (!/^[a-z0-9-]+$/.test(slugVal)) allErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens';

    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      e.preventDefault();
    }
  }, []);

  const inputClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-elevated';

  const inputErrorClass =
    'flex h-10 w-full rounded-lg border border-destructive bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive';

  return (
    <>
      {serverError && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <form action={createProject} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Project Name
            </label>
            <input
              ref={nameRef}
              id="name"
              name="name"
              type="text"
              required
              onChange={handleNameChange}
              onBlur={() => { autoGenEnabled.current = false; }}
              className={errors.name ? inputErrorClass : inputClass}
              placeholder="My Coffee Machine Manual"
            />
            {errors.name ? (
              <p className="text-xs text-destructive mt-1.5">{errors.name}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5">
                A descriptive name for your chatbot project.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1.5">
              URL Slug
            </label>
            <input
              ref={slugRef}
              id="slug"
              name="slug"
              type="text"
              required
              onChange={handleSlugChange}
              className={errors.slug ? inputErrorClass : inputClass}
              placeholder="my-coffee-machine"
            />
            {errors.slug ? (
              <p className="text-xs text-destructive mt-1.5">{errors.slug}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5">
                Used in the public URL for your chatbot (e.g. yoursite.com/c/my-coffee-machine).
              </p>
            )}
          </div>
          <div>
            <label htmlFor="mode" className="block text-sm font-medium mb-1.5">
              Mode
            </label>
            <select
              id="mode"
              name="mode"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="both">Chat + PDF Viewer</option>
              <option value="chat">Chat Only</option>
              <option value="pdf">PDF Viewer Only</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">
              Choose how users will interact with your documents.
            </p>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-elevated"
              placeholder="Describe your project..."
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Optional. Describe what this project is about.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Create Project
            </button>
            <a
              href="/projects"
              className="rounded-lg border px-6 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:shadow-md"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
