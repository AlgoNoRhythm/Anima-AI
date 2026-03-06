'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '@/components/toast';
import { FeedbackResponsesSection } from './feedback-responses-section';

interface AnalyticsChartsProps {
  projectId: string;
  initialData: {
    messagesToday: number;
    totalSessions: number;
    dailyData: Array<{
      date: string;
      message_sent?: number;
      session_start?: number;
      [key: string]: unknown;
    }>;
    feedbackCounts?: {
      positive: number;
      negative: number;
    };
    surveyCount?: number;
    avgStarRating?: number | null;
  };
  feedbackConfig?: {
    ratings: Array<{ id: string; label: string }>;
    questions: Array<{ id: string; label: string }>;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AnalyticsCharts({ projectId, initialData, feedbackConfig }: AnalyticsChartsProps) {
  const { data } = useSWR<AnalyticsChartsProps['initialData']>(
    `/api/projects/${projectId}/analytics`,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 30000,
    },
  );

  const [exporting, setExporting] = useState(false);
  const toastCtx = useToast();

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }));
        toastCtx.error(err.error || 'Export failed');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] ?? `conversations-${projectId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastCtx.success('Export downloaded');
    } catch {
      toastCtx.error('Failed to export conversations');
    } finally {
      setExporting(false);
    }
  }, [projectId, toastCtx]);

  const messagesToday = data?.messagesToday ?? initialData.messagesToday;
  const totalSessions = data?.totalSessions ?? initialData.totalSessions;
  const dailyData = data?.dailyData ?? initialData.dailyData;
  const feedbackCounts = data?.feedbackCounts ?? initialData.feedbackCounts;
  const surveyCount = data?.surveyCount ?? initialData.surveyCount ?? 0;
  const avgStarRating = data?.avgStarRating ?? initialData.avgStarRating;

  const feedbackTotal = (feedbackCounts?.positive ?? 0) + (feedbackCounts?.negative ?? 0);
  const feedbackDisplay = feedbackTotal > 0
    ? `${Math.round((feedbackCounts!.positive / feedbackTotal) * 100)}%`
    : 'N/A';

  const surveyDisplay = avgStarRating != null ? `${avgStarRating.toFixed(1)} / 5` : 'N/A';

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex justify-end">
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:shadow-md disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Exporting...' : 'Export Conversations'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Messages Today</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{messagesToday}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Sessions</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{totalSessions}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Avg. Feedback</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{feedbackDisplay}</p>
          {feedbackTotal > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {feedbackCounts!.positive} positive / {feedbackCounts!.negative} negative
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Survey Responses</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{surveyCount}</p>
          {surveyCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Avg. rating: {surveyDisplay}
            </p>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="rounded-xl border bg-card p-6 shadow-elevated">
        <h3 className="font-semibold mb-4">Messages Over Time</h3>
        {dailyData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a227" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="message_sent"
                  stroke="#c9a227"
                  strokeWidth={2}
                  fill="url(#goldGradient)"
                  name="Messages"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center rounded-lg bg-muted/30 border border-dashed">
            <div className="text-center">
              <svg
                className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm text-muted-foreground">Chart will appear when data is available</p>
            </div>
          </div>
        )}
      </div>

      <FeedbackResponsesSection
        projectId={projectId}
        feedbackConfig={feedbackConfig ?? null}
      />
    </div>
  );
}
