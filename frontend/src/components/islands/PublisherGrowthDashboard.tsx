import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../lib/apiClient';
import { campaignMetricsSchema } from '@bookverse/shared';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';

const campaignListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    costBdt: z.union([z.string(), z.number()]),
    invoiceStatus: z.string(),
  }),
);

const demandSchema = z.object({
  total: z.number(),
  byDistrict: z.array(z.object({ district: z.string(), count: z.number() })),
  trend: z.array(z.object({ date: z.string(), count: z.number() })),
});

export default function PublisherGrowthDashboard() {
  const [campaigns, setCampaigns] = useState<z.infer<typeof campaignListSchema>>([]);
  const [metrics, setMetrics] = useState<z.infer<typeof campaignMetricsSchema> | null>(null);
  const [demand, setDemand] = useState<z.infer<typeof demandSchema> | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = () => {
    setStatus('loading');
    void Promise.all([
      apiFetch('/publisher/campaigns', campaignListSchema),
      apiFetch('/publisher/reprint-demand', demandSchema),
    ])
      .then(async ([camps, dem]) => {
        setCampaigns(camps);
        setDemand(dem);
        if (camps[0]) {
          const m = await apiFetch(
            `/publisher/campaigns/${camps[0].id}/metrics`,
            campaignMetricsSchema,
          );
          setMetrics(m);
        }
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    load();
  }, []);

  if (status === 'loading') return <Skeleton className="h-40" />;
  if (status === 'error') {
    return (
      <ErrorState message="Enable FEATURE_SPONSORED and sign in as publisher" onRetry={load} />
    );
  }

  return (
    <div className="grid gap-8">
      {metrics && (
        <section aria-labelledby="camp-metrics">
          <h2 id="camp-metrics" className="m-0 font-display text-xl font-bold text-ink-900">
            Campaign · {metrics.name}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 min-[720px]:grid-cols-3">
            {[
              ['CTR', `${(metrics.ctr * 100).toFixed(1)}%`],
              ['Conversion', `${(metrics.conversion * 100).toFixed(1)}%`],
              ['Revenue', `৳${metrics.revenue}`],
              ['Cost', `৳${metrics.cost}`],
              ['ROAS', metrics.roas.toFixed(2)],
              ['Purchases', String(metrics.purchases)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
                <dt className="text-xs text-ink-500">{k}</dt>
                <dd className="m-0 mt-1 font-display text-lg font-bold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="reprint-demand">
        <h2 id="reprint-demand" className="m-0 font-display text-xl font-bold text-ink-900">
          Reprint demand
        </h2>
        <p className="mt-1 text-sm text-ink-500">Total requests: {demand?.total ?? 0}</p>
        <ul className="mt-3 list-none space-y-1 p-0 text-sm">
          {demand?.byDistrict.map((d) => (
            <li key={d.district} className="flex justify-between border-b border-line py-1">
              <span>{d.district}</span>
              <span className="font-semibold">{d.count}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex h-24 items-end gap-1" aria-label="Reprint trend">
          {(demand?.trend ?? []).map((t) => (
            <div
              key={t.date}
              title={`${t.date}: ${t.count}`}
              className="flex-1 rounded-t bg-brand-600"
              style={{ height: `${Math.min(100, t.count * 12)}%` }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="m-0 font-display text-xl font-bold text-ink-900">Campaigns</h2>
        <ul className="mt-3 list-none space-y-2 p-0">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="rounded-[var(--radius-card)] border border-line bg-paper p-3 text-sm"
            >
              <span className="font-semibold">{c.name}</span> · {c.status} · invoice{' '}
              {c.invoiceStatus}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
