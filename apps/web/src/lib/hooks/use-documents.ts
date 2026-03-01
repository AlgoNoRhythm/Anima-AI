'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDocuments(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `/api/projects/${projectId}/documents` : null,
    fetcher,
  );

  return { documents: data, error, isLoading, mutate };
}
