import type {
  Area,
  AreaStat,
  AppState,
  Energy,
  Goal,
  Portfolio,
  Ritual,
  ScoredTask,
  Task,
} from '../types';
import { clamp } from './id';
import { dateKey, diffDays, todayKey } from './date';
import { bestHours } from './brain';

const ENERGY_RANK: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
const WINDOW_DAYS = 14;
const PRIOR = 4;

export function buildPortfolio(
  state: Pick<AppState, 'areas' | 'tasks' | 'rituals'>,
  now: Date = new Date(),
): Portfolio {
  const today = todayKey(now);
  const areas = state.areas;
  const intentTotal = areas.reduce((sum, a) => sum + clamp(a.intent, 1, 5), 0);

  if (!areas.length) {
    return { areas: [], totalCompleted: 0, windowDays: WINDOW_DAYS };
  }

  const intentShares = new Map<string, number>();
  for (const area of areas) {
    intentShares.set(area.id, intentTotal > 0 ? clamp(area.intent, 1, 5) / intentTotal : 1 / areas.length);
  }

  const counts = new Map<string, number>();
  const lastActivity = new Map<string, number>();
  let totalCompleted = 0;

  const register = (areaId: string | null, dayKey: string) => {
    if (!areaId) return;
    const age = diffDays(today, dayKey);
    if (age < 0) return;
    if (age < WINDOW_DAYS) {
      counts.set(areaId, (counts.get(areaId) ?? 0) + 1);
      totalCompleted += 1;
    }
    const prev = lastActivity.get(areaId);
    if (prev === undefined || age < prev) lastActivity.set(areaId, age);
  };

  for (const task of state.tasks) {
    if (task.status === 'done' && task.completedAt && !task.ritualId) {
      register(task.areaId, dateKey(new Date(task.completedAt)));
    }
  }

  for (const ritual of state.rituals) {
    for (const day of ritual.log) register(ritual.areaId, day);
  }

  const stats: AreaStat[] = areas.map((area) => {
    const raw = counts.get(area.id) ?? 0;
    const intentShare = intentShares.get(area.id) ?? 0;
    const attentionShare =
      totalCompleted + PRIOR > 0 ? (raw + PRIOR * intentShare) / (totalCompleted + PRIOR) : intentShare;
    const active = state.tasks.filter(
      (t) => t.status === 'active' && t.areaId === area.id,
    );
    const overdue = active.filter((t) => t.due !== null && diffDays(t.due, today) < 0).length;
    const ageDays = diffDays(today, dateKey(new Date(area.createdAt)));
    const days = lastActivity.get(area.id) ?? null;
    const dormant = days === null ? ageDays >= 7 : days >= 7;

    return {
      area,
      intentShare,
      attentionShare,
      completed: raw,
      active: active.length,
      overdue,
      lastActivityDays: days,
      dormant,
    };
  });

  return { areas: stats, totalCompleted, windowDays: WINDOW_DAYS };
}

export interface EngineInput {
  now?: Date;
  energy: Energy;
  areas: Area[];
  tasks: Task[];
  goals: Goal[];
  rituals: Ritual[];
  focusAreaId: string | null;
  deepWorkUntil: string | null;
  recovery: boolean;
}

function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'active');
}

export function scoreTask(task: Task, ctx: EngineContextLite): ScoredTask {
  const now = ctx.now;
  const today = todayKey(now);
  const reasons: string[] = [];
  let score = 24;

  const d = task.due ? diffDays(task.due, today) : null;
  if (d !== null) {
    if (d < 0) {
      if (ctx.recovery) {
        score += Math.min(20, 18 + Math.min(-d, 4) * 1);
        reasons.push('موعدش گذشته؛ در حالت بازیابی، یک بازتنظیم آرام کافی است.');
      } else {
        score += 40 + Math.min(-d, 7) * 3;
        reasons.push('موعدش گذشته و هنوز روی میز است؛ وقتش رسیده تعیین تکلیف شود.');
      }
    } else if (d === 0) {
      score += 34;
      reasons.push('موعدش امروز است.');
    } else if (d === 1) {
      score += 22;
      reasons.push('فردا موعدش است.');
    } else if (d <= 3) {
      score += 11;
      reasons.push('طی چند روز آینده موعدش می‌رسد.');
    } else if (d <= 7) {
      score += 4;
    } else {
      score -= 2;
    }
  }

  const taskRank = ENERGY_RANK[task.energy];
  const nowRank = ENERGY_RANK[ctx.energy];
  if (taskRank === nowRank) {
    score += 16;
    reasons.push('با انرژی الان تو جور درمی‌آید.');
  } else if (taskRank > nowRank) {
    score -= (taskRank - nowRank) * 11;
    if (taskRank - nowRank >= 2) {
      reasons.push('کمی بیشتر از انرژی الان تو می‌خواهد؛ اگر آماده‌ای شروع کن.');
    }
  } else {
    score += 5;
  }

  const stat = ctx.portfolio.areas.find((a) => a.area.id === task.areaId);
  if (stat) {
    const gap = stat.intentShare - stat.attentionShare;
    if (gap > 0.015) {
      score += Math.round(clamp(gap * 95, 0, 18));
      reasons.push(`حوزهٔ «${stat.area.title}» این روزها کمتر دیده شده.`);
    }
    if (stat.dormant) {
      score += 5;
    }
  }

  if (task.goalId) {
    const goal = ctx.goals.find((g) => g.id === task.goalId && g.status === 'active');
    if (goal) {
      score += 6;
      reasons.push(`به هدف «${goal.title}» نزدیک‌ترت می‌کند.`);
    }
  }

  const deepActive = ctx.deepWorkUntil !== null && new Date(ctx.deepWorkUntil).getTime() > now.getTime();
  if (deepActive) {
    if (task.deep) {
      score += 26;
      reasons.push('برای بلوک تمرکز عمیق، انتخاب درستی است.');
    } else {
      score -= 8;
    }
  }

  if (task.pinned) score += 16;

  if (task.ritualId) {
    score += 6;
    reasons.push('یکی از آیین‌های تکرارشونده‌ات امروز موعدش است.');
  }

  if (task.deferCount > 0) {
    score -= Math.min(task.deferCount * 3, 10);
    if (task.deferCount >= 2) {
      reasons.push('چند بار عقب افتاده؛ شاید وقت شکستن به یک قدم کوچک‌تر باشد.');
    }
  }

  const ageHours = (now.getTime() - new Date(task.createdAt).getTime()) / 3_600_000;
  if (ageHours >= 0 && ageHours < 48) score += 3;

  if (task.estimateMin !== null) {
    if (task.estimateMin <= 15) {
      score += ctx.energy === 'low' ? 9 : 4;
      reasons.push('کوتاه است؛ در چند دقیقه از ذهنت بیرون می‌رود.');
    } else if (task.estimateMin <= 25 && ctx.energy === 'low') {
      score += 4;
    }
  }

  if (ctx.focusAreaId && task.areaId === ctx.focusAreaId) {
    score += 10;
  }

  if (ctx.recovery) {
    if (task.energy === 'high') score -= 10;
    if (task.estimateMin !== null && task.estimateMin <= 15) score += 6;
  }

  if (ctx.goldenHours.includes(now.getHours()) && task.energy !== 'low') {
    score += 4;
    reasons.push('این ساعت معمولاً از پربازده‌ترین ساعت‌های توست.');
  }

  if (!task.areaId) score -= 3;

  if (!reasons.length) {
    reasons.push('بهترین تعادل را بین اهمیت، انرژی و زمانِ الان تو دارد.');
  }

  return { task, score, reasons };
}

interface EngineContextLite {
  now: Date;
  energy: Energy;
  areas: Area[];
  tasks: Task[];
  goals: Goal[];
  focusAreaId: string | null;
  deepWorkUntil: string | null;
  recovery: boolean;
  portfolio: Portfolio;
  goldenHours: number[];
}

function buildContext(input: EngineInput): EngineContextLite {
  const now = input.now ?? new Date();
  const portfolio = buildPortfolio(
    { areas: input.areas, tasks: input.tasks, rituals: input.rituals },
    now,
  );
  return {
    now,
    energy: input.energy,
    areas: input.areas,
    tasks: input.tasks,
    goals: input.goals,
    focusAreaId: input.focusAreaId,
    deepWorkUntil: input.deepWorkUntil,
    recovery: input.recovery,
    portfolio,
    goldenHours: bestHours(input.tasks),
  };
}

export function rankedTasks(input: EngineInput, limit = 20): ScoredTask[] {
  const ctx = buildContext(input);
  let pool = activeTasks(input.tasks);
  if (ctx.focusAreaId) {
    const focused = pool.filter((t) => t.areaId === ctx.focusAreaId);
    if (focused.length) pool = focused;
  }
  const scored = pool.map((task) => scoreTask(task, ctx));
  scored.sort(compareScored);
  return scored.slice(0, limit);
}

function compareScored(a: ScoredTask, b: ScoredTask): number {
  if (b.score !== a.score) return b.score - a.score;
  const ad = a.task.due ?? '9999-12-31';
  const bd = b.task.due ?? '9999-12-31';
  if (ad !== bd) return ad < bd ? -1 : 1;
  const ae = a.task.estimateMin ?? 999;
  const be = b.task.estimateMin ?? 999;
  if (ae !== be) return ae - be;
  if (a.task.createdAt !== b.task.createdAt) return a.task.createdAt < b.task.createdAt ? -1 : 1;
  return a.task.id.localeCompare(b.task.id);
}

export function nextAction(input: EngineInput): ScoredTask | null {
  return rankedTasks(input, 1)[0] ?? null;
}

export function suggestionReason(scored: ScoredTask): string {
  return scored.reasons.slice(0, 2).join(' ');
}

export function todayCompleted(
  state: Pick<AppState, 'tasks' | 'rituals'>,
  now: Date = new Date(),
): { count: number; tasks: Task[]; rituals: { ritual: Ritual; done: boolean }[] } {
  const today = todayKey(now);
  const tasks = state.tasks.filter(
    (t) =>
      t.status === 'done' &&
      t.completedAt &&
      !t.ritualId &&
      dateKey(new Date(t.completedAt)) === today,
  );
  const rituals = state.rituals.map((ritual) => ({ ritual, done: ritual.log.includes(today) }));
  const ritualCount = rituals.filter((r) => r.done).length;
  return { count: tasks.length + ritualCount, tasks, rituals };
}

export interface Insight {
  id: string;
  tone: 'gold' | 'mint' | 'rose' | 'violet';
  title: string;
  body: string;
}

export function buildInsights(
  state: Pick<AppState, 'areas' | 'tasks' | 'rituals' | 'reviews'>,
  portfolio: Portfolio,
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = [];
  if (!state.areas.length) return insights;

  const sorted = [...portfolio.areas].sort(
    (a, b) => b.intentShare - b.attentionShare - (a.intentShare - a.attentionShare),
  );
  const gap = sorted[0];
  if (gap && gap.intentShare - gap.attentionShare > 0.02) {
    const pct = Math.round((gap.intentShare - gap.attentionShare) * 100);
    insights.push({
      id: 'gap',
      tone: 'gold',
      title: 'فاصلهٔ نیت و توجه',
      body: `«${gap.area.title}» ${pct.toLocaleString('fa-IR')}٪ از نیت تو را دارد، اما در دو هفتهٔ اخیر کمتر از سهمش دیده شده. یک قدم کوچک در همین حوزه، تعادل را برمی‌گرداند.`,
    });
  }

  const dormant = portfolio.areas
    .filter((a) => a.dormant)
    .sort((a, b) => (b.lastActivityDays ?? 99) - (a.lastActivityDays ?? 99))[0];
  if (dormant) {
    const days = dormant.lastActivityDays;
    insights.push({
      id: 'dormant',
      tone: 'rose',
      title: 'حوزهٔ خاموش',
      body:
        days === null
          ? `«${dormant.area.title}» هنوز اولین قدم ثبت‌شده‌اش را ندارد. لازم نیست بزرگ باشد؛ یک قدم کافی است.`
          : `«${dormant.area.title}» ${days.toLocaleString('fa-IR')} روز است خبری نداده. بدون سرزنش، فقط یک یادآوری مهربان.`,
    });
  }

  const mostDeferred = [...state.tasks]
    .filter((t) => t.status === 'active' && t.deferCount > 0)
    .sort((a, b) => b.deferCount - a.deferCount)[0];
  if (mostDeferred) {
    insights.push({
      id: 'defer',
      tone: 'violet',
      title: 'الگوی تعویق',
      body: `«${mostDeferred.title}» ${mostDeferred.deferCount.toLocaleString('fa-IR')} بار به تعویق افتاده. شاید وقتش رسیده آن را به دو قدم کوچک‌تر بشکنی.`,
    });
  }

  const lastWeek = state.tasks.filter((t) => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const age = diffDays(todayKey(now), dateKey(new Date(t.completedAt)));
    return age >= 0 && age < 7;
  }).length;
  const prevWeek = state.tasks.filter((t) => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const age = diffDays(todayKey(now), dateKey(new Date(t.completedAt)));
    return age >= 7 && age < 14;
  }).length;
  if (lastWeek > 0) {
    insights.push({
      id: 'trend',
      tone: 'mint',
      title: 'نبض دو هفته',
      body:
        prevWeek === 0
          ? `${lastWeek.toLocaleString('fa-IR')} قدم در هفت روز اخیر؛ شروع شده. همین ریتم را نگه دار.`
          : `${lastWeek.toLocaleString('fa-IR')} قدم در هفت روز اخیر، در برابر ${prevWeek.toLocaleString('fa-IR')} قدم هفتهٔ قبل. ${
              lastWeek >= prevWeek ? 'ریتمت گرم است.' : 'یک قدم کوچک، دوباره راه می‌اندازد.'
            }`,
    });
  }

  const review = [...state.reviews].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (review && insights.length < 4) {
    const energyText = review.energy === 'high' ? 'بالا' : review.energy === 'medium' ? 'متوسط' : 'کم';
    insights.push({
      id: 'review',
      tone: 'gold',
      title: 'از دفتر مرور',
      body: `آخرین مرور تو با انرژی «${energyText}» بسته شد. جملهٔ تو برای فردا: «${review.note || '—'}»`,
    });
  }

  return insights.slice(0, 4);
}

export function assertEnergy(value: unknown): value is Energy {
  return value === 'low' || value === 'medium' || value === 'high';
}
