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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const autoGenEnabled = useRef(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Project name is required';
        } else {
          delete newErrors.name;
        }
        break;
      case 'slug':
        if (!value.trim()) {
          newErrors.slug = 'URL slug is required';
        } else if (!/^[a-z0-9-]+$/.test(value)) {
          newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens';
        } else {
          delete newErrors.slug;
        }
        break;
    }

    setErrors(newErrors);
    return newErrors;
  }, [errors]);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    if (autoGenEnabled.current && !slugTouched) {
      setSlug(slugify(value));
    }
  }, [slugTouched]);

  const handleSlugChange = useCallback((value: string) => {
    setSlugTouched(true);
    setSlug(value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const nameErrors = validateField('name', name);
    const slugErrors = validateField('slug', slug);
    const allErrors = { ...nameErrors, ...slugErrors };

    // Re-validate all fields
    if (!name.trim()) allErrors.name = 'Project name is required';
    if (!slug.trim()) allErrors.slug = 'URL slug is required';
    else if (!/^[a-z0-9-]+$/.test(slug)) allErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens';

    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      e.preventDefault();
    }
  }, [name, slug, validateField]);

  const hasErrors = Object.keys(errors).length > 0;

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
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => { autoGenEnabled.current = false; validateField('name', name); }}
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
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              onBlur={() => validateField('slug', slug)}
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
              disabled={hasErrors}
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
