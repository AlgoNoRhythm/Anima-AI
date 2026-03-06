'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface FeedbackResponsesSectionProps {
  projectId: string;
  feedbackConfig: {
    ratings: Array<{ id: string; label: string }>;
    questions: Array<{ id: string; label: string }>;
  } | null;
}

interface FeedbackResponse {
  id: string;
  ratings: Array<{ ratingId: string; value: number }>;
  answers: Array<{ questionId: string; value: string }>;
  createdAt: string;
}

interface FeedbackData {
  responses: FeedbackResponse[];
  totalCount: number;
  ratingDistribution?: Array<{ value: number; count: number }>;
  ratingAverage?: number | null;
  dailyRatingAverages?: Array<{ date: string; avg: number; count: number }>;
}

const TIME_FILTERS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: null },
] as const;

type RatingView = 'distribution' | 'overtime' | 'individual';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < value ? 'text-gold' : 'text-muted-foreground/30'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function FeedbackResponsesSection({ projectId, feedbackConfig }: FeedbackResponsesSectionProps) {
  const [days, setDays] = useState<number | null>(30);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedFieldType, setSelectedFieldType] = useState<'rating' | 'question'>('rating');
  const [ratingView, setRatingView] = useState<RatingView>('distribution');
  const [offset, setOffset] = useState(0);

  const ratings = feedbackConfig?.ratings ?? [];
  const questions = feedbackConfig?.questions ?? [];

  // Auto-select first field
  const effectiveFieldId = selectedFieldId ?? ratings[0]?.id ?? questions[0]?.id ?? null;
  const effectiveFieldType = selectedFieldId
    ? selectedFieldType
    : ratings.length > 0
      ? 'rating'
      : 'question';

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (days != null) p.set('days', String(days));
    p.set('limit', '50');
    p.set('offset', String(offset));
    if (effectiveFieldType === 'rating' && effectiveFieldId) {
      p.set('ratingId', effectiveFieldId);
    }
    return p.toString();
  }, [days, offset, effectiveFieldType, effectiveFieldId]);

  const { data, isLoading } = useSWR<FeedbackData>(
    feedbackConfig ? `/api/projects/${projectId}/feedback-responses?${queryParams}` : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  if (!feedbackConfig) {
    return (
      <div className="mt-8 mb-16 rounded-xl border bg-card p-6 shadow-elevated">
        <h3 className="font-semibold mb-2">Survey Responses</h3>
        <p className="text-sm text-muted-foreground">
          Configure feedback surveys in the Feedback tab to start collecting responses.
        </p>
      </div>
    );
  }

  if (ratings.length === 0 && questions.length === 0) {
    return (
      <div className="mt-8 mb-16 rounded-xl border bg-card p-6 shadow-elevated">
        <h3 className="font-semibold mb-2">Survey Responses</h3>
        <p className="text-sm text-muted-foreground">No fields configured yet.</p>
      </div>
    );
  }

  const totalCount = data?.totalCount ?? 0;

  // Pad distribution to always show 1–5
  const distributionData = useMemo(() => {
    const dist = data?.ratingDistribution ?? [];
    return [1, 2, 3, 4, 5].map((v) => ({
      label: `${v} star${v > 1 ? 's' : ''}`,
      value: v,
      count: dist.find((d) => d.value === v)?.count ?? 0,
    }));
  }, [data?.ratingDistribution]);

  const handleSelectField = (id: string, type: 'rating' | 'question') => {
    setSelectedFieldId(id);
    setSelectedFieldType(type);
    setOffset(0);
    if (type === 'rating') {
      setRatingView('distribution');
    }
  };

  // Filter responses for the selected question
  const questionAnswers = useMemo(() => {
    if (effectiveFieldType !== 'question' || !effectiveFieldId || !data?.responses) return [];
    return data.responses
      .map((r) => {
        const answer = r.answers.find((a) => a.questionId === effectiveFieldId);
        return answer ? { text: answer.value, createdAt: r.createdAt } : null;
      })
      .filter((a): a is { text: string; createdAt: string } => a != null && a.text.trim() !== '');
  }, [data?.responses, effectiveFieldType, effectiveFieldId]);

  // Filter responses for individual rating view
  const individualRatings = useMemo(() => {
    if (effectiveFieldType !== 'rating' || !effectiveFieldId || !data?.responses) return [];
    return data.responses
      .map((r) => {
        const rating = r.ratings.find((rt) => rt.ratingId === effectiveFieldId);
        return rating ? { value: rating.value, createdAt: r.createdAt } : null;
      })
      .filter((r): r is { value: number; createdAt: string } => r != null);
  }, [data?.responses, effectiveFieldType, effectiveFieldId]);

  return (
    <div className="mt-8 mb-16 rounded-xl border bg-card p-6 shadow-elevated">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Survey Responses</h3>
        <span className="text-sm text-muted-foreground">
          {totalCount} response{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Time filter */}
      <div className="flex gap-1.5 mb-4">
        {TIME_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => { setDays(f.value); setOffset(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === f.value
                ? 'bg-foreground text-background'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Field selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ratings.map((r) => (
          <button
            key={r.id}
            onClick={() => handleSelectField(r.id, 'rating')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              effectiveFieldId === r.id && effectiveFieldType === 'rating'
                ? 'bg-foreground text-background'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {r.label} ★
          </button>
        ))}
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => handleSelectField(q.id, 'question')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              effectiveFieldId === q.id && effectiveFieldType === 'question'
                ? 'bg-foreground text-background'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Rating sub-views */}
      {effectiveFieldType === 'rating' && (
        <div className="flex gap-1.5 mb-4">
          {(['distribution', 'overtime', 'individual'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setRatingView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ratingView === v
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {v === 'distribution' ? 'Distribution' : v === 'overtime' ? 'Over Time' : 'Individual'}
            </button>
          ))}
        </div>
      )}

      {/* Content — fixed min-height prevents layout shift when switching views */}
      <div className="min-h-[14rem]">
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalCount === 0 ? (
        <div className="h-48 flex items-center justify-center rounded-lg bg-muted/30 border border-dashed">
          <p className="text-sm text-muted-foreground">No responses yet for this time period.</p>
        </div>
      ) : effectiveFieldType === 'rating' ? (
        <>
          {ratingView === 'distribution' && (
            <div>
              {data?.ratingAverage != null && (
                <p className="text-sm text-muted-foreground mb-3">
                  Average: <span className="font-semibold text-foreground">{data.ratingAverage.toFixed(1)}</span> / 5
                </p>
              )}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} layout="vertical" margin={{ top: 4, right: 20, left: 60, bottom: 4 }}>
                    <defs>
                      <linearGradient id="goldBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#c9a227" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#c9a227" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} className="text-muted-foreground" width={55} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Bar dataKey="count" fill="url(#goldBarGradient)" radius={[0, 4, 4, 0]} name="Responses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {ratingView === 'overtime' && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.dailyRatingAverages ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGradientOvertime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a227" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '0.875rem',
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'Avg Rating']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#c9a227"
                    strokeWidth={2}
                    fill="url(#goldGradientOvertime)"
                    name="Avg Rating"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {ratingView === 'individual' && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {individualRatings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No individual ratings for this field.
                </p>
              ) : (
                individualRatings.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
                    <StarDisplay value={r.value} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
              {totalCount > offset + 50 && (
                <button
                  onClick={() => setOffset((o) => o + 50)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Load more...
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* Question answers view */
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {questionAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No text answers for this question yet.
            </p>
          ) : (
            questionAnswers.map((a, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-sm">{a.text}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(a.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))
          )}
          {totalCount > offset + 50 && (
            <button
              onClick={() => setOffset((o) => o + 50)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Load more...
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
