import type { AppState, Task } from '../types';
import { faNum } from './date';
import type { Insight } from './engine';

/**
 * «مغز رفتاری» — یادگیری سبک و کاملاً محلی از رفتار واقعی.
 * همه‌چیز از داده‌های موجود محاسبه می‌شود (بدون state جدید و بدون مهاجرت).
 */

const MIN_SAMPLES_FOR_HOURS = 6;
const MS_DAY = 86_400_000;

type BrainState = Pick<AppState, 'tasks' | 'rituals' | 'reviews' | 'areas'>;

function doneTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'done' && t.completedAt);
}

/** ساعت‌هایی که بیشترین کار در آن‌ها تمام شده (حداکثر ۳ ساعت). */
export function bestHours(tasks: Task[]): number[] {
  const done = doneTasks(tasks);
  if (done.length < MIN_SAMPLES_FOR_HOURS) return [];
  const bins = Array<number>(24).fill(0);
  for (const t of done) bins[new Date(t.completedAt as string).getHours()] += 1;
  return bins
    .map((n, h) => ({ n, h }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n || a.h - b.h)
    .slice(0, 3)
    .map((x) => x.h);
}

/** درصد «شناخت رفتاری» (۰ تا ۹۶) بر پایهٔ حجم و تنوع داده. */
export function brainConfidence(state: BrainState, now: Date = new Date()): number {
  const done = doneTasks(state.tasks);
  const domains = new Set(done.map((t) => t.areaId).filter(Boolean)).size;
  const first = done.reduce(
    (min, t) => Math.min(min, new Date(t.completedAt as string).getTime()),
    now.getTime(),
  );
  const span = Math.max(1, Math.floor((now.getTime() - first) / MS_DAY) + 1);
  let c = 0;
  c += Math.min(40, done.length * 2.2);
  c += Math.min(20, domains * 5);
  if (done.length) c += Math.min(20, span * 1.5);
  c += Math.min(10, state.reviews.length * 2);
  c += Math.min(10, state.rituals.reduce((s, r) => s + r.log.length, 0) * 0.5);
  return Math.round(Math.min(96, c));
}

export interface RitualSuggestion {
  key: string;
  title: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  areaId: string | null;
  confidence: number;
}

function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[۰-۹0-9]/g, ' ')
    .split(/[\s،,.\-_/]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 4)
    .join('|');
}

/** کارهایی که با فاصلهٔ تقریباً ثابت تکرار می‌شوند را به‌عنوان آیین پیشنهاد می‌دهد. */
export function suggestRituals(state: BrainState): RitualSuggestion[] {
  const existing = new Set(state.rituals.map((r) => titleKey(r.title)));
  const groups = new Map<string, Task[]>();
  for (const t of doneTasks(state.tasks)) {
    if (t.ritualId) continue;
    const key = titleKey(t.title);
    if (!key || existing.has(key)) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const out: RitualSuggestion[] = [];
  for (const [key, list] of groups) {
    if (list.length < 3) continue;
    const times = list.map((t) => new Date(t.completedAt as string).getTime()).sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, i) => (t - times[i]) / MS_DAY);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const cadence =
      avg >= 0.8 && avg <= 1.6 ? 'daily' : avg >= 5 && avg <= 10 ? 'weekly' : avg >= 25 && avg <= 40 ? 'monthly' : null;
    if (!cadence) continue;
    out.push({
      key,
      title: list[list.length - 1].title,
      cadence,
      areaId: list[list.length - 1].areaId,
      confidence: Math.min(95, 40 + list.length * 8 + gaps.length * 5),
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/** بینش‌های رفتاری؛ فقط وقتی داده کافی باشد. */
export function brainInsights(state: BrainState, now: Date = new Date()): Insight[] {
  const conf = brainConfidence(state, now);
  const insights: Insight[] = [];
  if (conf < 12) return insights;

  const hours = bestHours(state.tasks);
  if (hours.length) {
    insights.push({
      id: 'brain-hours',
      tone: 'mint',
      title: 'پنجرهٔ طلایی تو',
      body: `بیشترِ کارهایت حوالیِ ساعت‌های ${hours
        .map((h) => faNum(h))
        .join('، ')} تمام شده. کارهای سنگین را در همین ساعت‌ها جلوتر می‌آورم.`,
    });
  }
  for (const s of suggestRituals(state).slice(0, 1)) {
    const label = { daily: 'هر روز', weekly: 'هر هفته', monthly: 'هر ماه' }[s.cadence];
    insights.push({
      id: 'brain-ritual',
      tone: 'violet',
      title: 'آیین پیشنهادی',
      body: `«${s.title}» تقریباً ${label} تکرار شده (اطمینان ${faNum(s.confidence)}٪). اگر بخواهی، آیین ثابتش کن.`,
    });
  }
  return insights;
}
