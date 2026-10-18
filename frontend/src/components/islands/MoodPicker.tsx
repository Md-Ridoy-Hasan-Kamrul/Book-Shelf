import { useEffect, useState, useTransition } from 'react';
import type { MoodEnum } from '@bookverse/shared';
import { MoodChip } from '../ui/MoodChip';
import { Button } from '../ui/Button';
import { classifyMoodText, fetchDiscoverConfig, logMood } from '../../lib/discoverApi';
import { ApiError } from '../../lib/apiClient';

const CHIP_MOODS: MoodEnum[] = [
  'happy',
  'calm',
  'sad',
  'motivated',
  'curious',
  'romantic',
  'lonely',
  'stressed',
  'adventurous',
  'focused',
];

type MoodMeta = { id: MoodEnum; label: string; labelBn: string };

export default function MoodPicker() {
  const [moods, setMoods] = useState<MoodMeta[]>([]);
  const [disclaimer, setDisclaimer] = useState('these books may match your mood');
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void fetchDiscoverConfig()
      .then((cfg) => {
        if (cancelled) return;
        setMoods(cfg.moods);
        setDisclaimer(cfg.disclaimer);
        setLlmEnabled(cfg.featureMoodLlm);
      })
      .catch(() => {
        if (!cancelled) {
          setMoods(
            CHIP_MOODS.map((id) => ({
              id,
              label: id,
              labelBn: id,
            })),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goMood = (mood: MoodEnum, source: 'chip' | 'llm' | 'fallback' = 'chip') => {
    startTransition(() => {
      void (async () => {
        setError(null);
        if (consent) {
          try {
            await logMood(mood, source);
          } catch (err) {
            if (!(err instanceof ApiError && err.code === 'UNAUTHORIZED')) {
              /* non-blocking */
            }
          }
        }
        window.location.href = `/mood?mood=${mood}`;
      })();
    });
  };

  const onClassify = () => {
    startTransition(() => {
      void (async () => {
        setError(null);
        try {
          const res = await classifyMoodText(freeText);
          goMood(res.mood, res.source);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not classify mood');
        }
      })();
    });
  };

  const list = moods.length > 0 ? moods : CHIP_MOODS.map((id) => ({ id, label: id, labelBn: id }));

  return (
    <section
      aria-labelledby="mood-picker-title"
      className="rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-[var(--shadow-warm)]"
    >
      <h2 id="mood-picker-title" className="m-0 font-display text-xl font-bold text-ink-900">
        Mood discovery
      </h2>
      <p className="mt-2 text-sm text-ink-500">{disclaimer} — we never diagnose emotions.</p>

      <ul className="mt-4 m-0 flex list-none flex-wrap gap-2 p-0">
        {list.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={pending}
              className="border-0 bg-transparent p-0"
              onClick={() => goMood(m.id, 'chip')}
              aria-label={`${m.labelBn} (${m.label})`}
            >
              <MoodChip mood={m.id} label={m.labelBn} />
            </button>
          </li>
        ))}
      </ul>

      <label className="mt-4 flex items-start gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>Save my mood pick (optional consent for MoodLog)</span>
      </label>

      {llmEnabled && (
        <div className="mt-4 border-t border-line pt-4">
          <label htmlFor="mood-free-text" className="block text-sm font-semibold text-ink-900">
            Describe how you feel (optional)
          </label>
          <textarea
            id="mood-free-text"
            rows={2}
            maxLength={500}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            className="mt-2 w-full rounded-[var(--radius-card)] border border-line bg-cream px-3 py-2 text-sm text-ink-900"
            placeholder="e.g. want something calm to unwind…"
          />
          <div className="mt-2">
            <Button
              type="button"
              disabled={pending || freeText.trim().length < 3}
              onClick={onClassify}
            >
              Match a mood
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-urgent-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
