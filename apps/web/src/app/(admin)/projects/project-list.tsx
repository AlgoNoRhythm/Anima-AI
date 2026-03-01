'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: string;
  userId: string;
  createdAt: string;
}

interface ProjectListProps {
  projects: Project[];
  roleMap: Record<string, string>;
}

export function ProjectList({ projects, roleMap }: ProjectListProps) {
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();
  const filtered = query
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)),
      )
    : projects;

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-elevated">
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? `No projects matching "${search}"` : 'No projects found.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:border-gold/30"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{project.name}</h3>
                <div className="flex items-center gap-1.5">
                  {roleMap[project.id] !== 'owner' && (
                    <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium capitalize">
                      {roleMap[project.id]}
                    </span>
                  )}
                  <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{project.mode}</span>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>/c/{project.slug}</span>
                <span className="text-muted-foreground/30">|</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
