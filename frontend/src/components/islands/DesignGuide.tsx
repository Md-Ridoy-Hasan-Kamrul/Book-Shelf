import { useState } from 'react';
import { useUiStore } from '../../stores/ui';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { BookCard } from '../ui/BookCard';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { MoodChip } from '../ui/MoodChip';
import { Price } from '../ui/Price';
import { Rating } from '../ui/Rating';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { SpoilerBlur } from '../ui/SpoilerBlur';
import { Tabs } from '../ui/Tabs';
import { Textarea } from '../ui/Textarea';

const contrastRows = [
  ['Body', 'ink-900 on cream', '13.61', 'PASS'],
  ['Secondary', 'ink-500 on cream', '5.60', 'PASS'],
  ['Secondary', 'ink-500 on paper', '5.98', 'PASS'],
  ['Link', 'brand-700 on cream', '6.28', 'PASS'],
  ['Button', 'paper on brand-600', '5.17', 'PASS'],
  ['CTA', 'ink-900 on cta-500', '5.19', 'PASS'],
  ['CTA alt', 'paper on cta-700', '5.18', 'PASS'],
  ['Success text', 'leaf-700 on leaf-50', '4.79', 'PASS'],
  ['Success btn', 'paper on leaf-700', '5.02', 'PASS'],
  ['Urgent', 'paper on urgent-600', '4.83', 'PASS'],
  ['Premium', 'paper on premium-600', '5.70', 'PASS'],
  ['Offer', 'sun-800 on sun-100', '6.37', 'PASS'],
  ['Like', 'rose-600 on paper', '4.70', 'PASS'],
  ['Mood Happy', 'sun-800 on sun-100', '6.37', 'PASS'],
  ['Mood Calm', 'leaf-700 on leaf-100', '4.79', 'PASS'],
  ['Mood Sad', '#1E3A8A on brand-100', '8.72', 'PASS'],
  ['Mood Motivated', '#9A3412 on cta-50', '5.91', 'PASS'],
  ['Mood Curious', '#115E59 on #CCFBF1', '5.12', 'PASS'],
  ['Mood Romantic', '#9F1239 on #FFE4E6', '5.48', 'PASS'],
  ['Mood Lonely', '#5B21B6 on premium-50', '6.95', 'PASS'],
  ['Mood Stressed', '#075985 on #E0F2FE', '5.89', 'PASS'],
  ['Mood Adventurous', '#3F6212 on #ECFCCB', '5.76', 'PASS'],
  ['Mood Focused', '#1E293B on #E2E8F0', '9.84', 'PASS'],
] as const;

const moods = [
  ['happy', 'Happy'],
  ['calm', 'Calm'],
  ['sad', 'Sad'],
  ['motivated', 'Motivated'],
  ['curious', 'Curious'],
  ['romantic', 'Romantic'],
  ['lonely', 'Lonely'],
  ['stressed', 'Stressed'],
  ['adventurous', 'Adventurous'],
  ['focused', 'Focused'],
] as const;

export default function DesignGuide() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);

  return (
    <div className="space-y-10 pb-24">
      <section aria-labelledby="dg-swatches">
        <h2 id="dg-swatches" className="font-display text-2xl font-bold text-ink-900">
          Token swatches
        </h2>
        <div className="mt-4 grid gap-2 min-[640px]:grid-cols-3">
          <div className="rounded-(--radius-card) border border-line bg-paper p-4 text-ink-900">
            paper
          </div>
          <div className="rounded-(--radius-card) border border-line bg-cream p-4 text-ink-900">
            cream
          </div>
          <div className="rounded-(--radius-card) border border-line bg-sand p-4 text-ink-900">
            sand
          </div>
          <div className="rounded-(--radius-card) bg-brand-600 p-4 text-paper">brand-600</div>
          <div className="rounded-(--radius-card) bg-leaf-700 p-4 text-paper">leaf-700</div>
          <div className="rounded-(--radius-card) bg-cta-500 p-4 text-ink-900">cta-500</div>
        </div>
      </section>

      <section aria-labelledby="dg-moods">
        <h2 id="dg-moods" className="font-display text-2xl font-bold text-ink-900">
          Mood chips
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {moods.map(([m, label]) => (
            <MoodChip key={m} mood={m} label={label} />
          ))}
        </div>
      </section>

      <section aria-labelledby="dg-components">
        <h2 id="dg-components" className="font-display text-2xl font-bold text-ink-900">
          Components
        </h2>
        <div className="mt-4 grid gap-6 min-[960px]:grid-cols-2">
          <Card>
            <div className="flex flex-wrap gap-2">
              <Button variant="brand">Brand</Button>
              <Button variant="leaf">Leaf</Button>
              <Button variant="cta">CTA</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="urgent">Urgent</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="sun">ফ্রি ডেলিভারি</Badge>
              <Badge tone="premium">VIP</Badge>
            </div>
            <p className="mt-4 text-ink-500">
              <Price amount={450} /> · <Price amount={450} localeDigits /> · <Rating value={4} />
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Avatar name="BookVerse" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </Card>
          <Card>
            <Input label="Email" type="email" placeholder="you@example.com" />
            <div className="mt-3">
              <Select
                label="Genre"
                options={[
                  { value: 'fiction', label: 'Fiction' },
                  { value: 'nonfiction', label: 'Non-fiction' },
                ]}
              />
            </div>
            <div className="mt-3">
              <Textarea label="Review" placeholder="আপনার মতামত…" />
            </div>
          </Card>
          <BookCard title="পদ্মজা" author="হুমায়ূন আহমেদ" price={350} />
          <div className="space-y-3">
            <EmptyState title="এখনো কিছু নেই">আপনার তালিকা খালি।</EmptyState>
            <ErrorState message="লোড করা যায়নি" onRetry={() => pushToast('Retry clicked')} />
            <SpoilerBlur text="এটা spoiler টেক্সট: blur থাকলে পLOT ফাঁস হবে না।" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Button variant="cta" onClick={() => pushToast('Toast example')}>
            Toast
          </Button>
        </div>
        <div className="mt-6">
          <Tabs
            items={[
              { id: 'a', label: 'Tab A', panel: <p className="text-ink-700">Panel A content</p> },
              { id: 'b', label: 'Tab B', panel: <p className="text-ink-700">Panel B content</p> },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="dg-wcag">
        <h2 id="dg-wcag" className="font-display text-2xl font-bold text-ink-900">
          WCAG AA contrast (report)
        </h2>
        <div className="mt-4 overflow-x-auto rounded-(--radius-card) border border-line bg-paper">
          <table className="w-full min-w-112 border-collapse text-left text-sm">
            <thead className="border-b border-line bg-sand/80">
              <tr>
                <th className="px-3 py-2">Pair</th>
                <th className="px-3 py-2">Combo</th>
                <th className="px-3 py-2">Ratio</th>
                <th className="px-3 py-2">AA</th>
              </tr>
            </thead>
            <tbody>
              {contrastRows.map(([pair, combo, ratio, pass]) => (
                <tr key={`${pair}-${combo}`} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{pair}</td>
                  <td className="px-3 py-2 text-ink-500">{combo}</td>
                  <td className="px-3 py-2 font-mono">{ratio}</td>
                  <td className="px-3 py-2 font-semibold text-leaf-700">{pass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={modalOpen} title="Sample modal" onClose={() => setModalOpen(false)}>
        <p className="text-ink-700">Native dialog: Esc বা close দিয়ে বন্ধ করুন।</p>
      </Modal>
      <Drawer open={drawerOpen} title="Sample drawer" onClose={() => setDrawerOpen(false)}>
        <p className="text-ink-700">Mobile-friendly drawer panel.</p>
      </Drawer>
    </div>
  );
}
