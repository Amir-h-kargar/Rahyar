import type {
  AppState,
  Area,
  Decision,
  Goal,
  Review,
  Ritual,
  Task,
} from '../types';
import { addDaysToKey, dateKey, fromKey, todayKey } from './date';
import { uid } from './id';
import { AREA_PRESETS } from './content';

const iso = (key: string, hour = 18): string => {
  const d = fromKey(key);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function createArea(
  preset: { title: string; emoji: string; color: Area['color'] },
  intent: number,
  createdAt: string,
  source?: 'seed',
): Area {
  return {
    id: uid('area'),
    title: preset.title,
    emoji: preset.emoji,
    color: preset.color,
    intent,
    createdAt,
    ...(source ? { source } : {}),
  };
}

interface StarterInput {
  name: string;
  areaTitles: string[];
  demo: boolean;
  now?: Date;
}

export function buildStarterState(input: StarterInput): AppState {
  const now = input.now ?? new Date();
  const today = todayKey(now);
  const created = new Date(now.getTime() - 21 * 86_400_000).toISOString();
  const selected = AREA_PRESETS.filter((a) => input.areaTitles.includes(a.title));
  const presets = selected.length ? selected : AREA_PRESETS.slice(0, 3);

  const areas = presets.map((preset, i) =>
    createArea(preset, i < 3 ? 5 : 3, created),
  );

  const byTitle = (title: string): Area | undefined => areas.find((a) => a.title === title);

  const base: AppState = {
    version: 1,
    onboarded: true,
    profile: {
      name: input.name.trim(),
      createdAt: now.toISOString(),
      demo: input.demo,
    },
    areas,
    tasks: [],
    goals: [],
    rituals: [],
    decisions: [],
    reviews: [],
    messages: [],
    settings: {
      energy: 'medium',
      focusAreaId: null,
      deepWorkUntil: null,
      deepWorkStartedAt: null,
      deepWorkMinutes: null,
      lastVisit: today,
      recoveryDismissedOn: null,
    },
  };

  if (!input.demo) return base;

  const goals: Goal[] = [];
  const addGoal = (
    title: string,
    areaTitle: string,
    targetInDays: number,
    milestones: string[],
    doneMilestones = 0,
  ) => {
    const area = byTitle(areaTitle);
    if (!area) return null;
    const goal: Goal = {
      id: uid('goal'),
      title,
      areaId: area.id,
      targetDate: addDaysToKey(today, targetInDays),
      note: '',
      milestones: milestones.map((m, i) => ({
        id: uid('ms'),
        title: m,
        done: i < doneMilestones,
      })),
      status: 'active',
      createdAt: created,
      source: 'seed',
    };
    goals.push(goal);
    return goal;
  };

  const capitalGoal = addGoal(
    'بستن بستهٔ جذب سرمایه',
    'کسب‌وکار',
    30,
    ['به‌روزرسانی دک سرمایه‌گذاری', 'ساخت مدل مالی سه‌ساله', 'دو جلسهٔ اولیه با سرمایه‌گذار'],
    1,
  );
  const bookGoal = addGoal(
    'تمام کردن کتاب دوم',
    'رشد',
    120,
    ['پیش‌نویس فصل دوم', 'ویرایش فصل اول', 'انتخاب ناشر'],
  );
  addGoal(
    '۴۰ روز حرکت روزانه',
    'سلامت',
    40,
    ['ده روز اول', 'بیست روز میانی', 'ده روز آخر'],
    1,
  );
  addGoal('سفر خانوادگی', 'خانواده', 90, ['انتخاب مقصد', 'رزرو اقامت']);

  const tasks: Task[] = [];

  const addTask = (data: {
    title: string;
    areaTitle: string;
    energy: Task['energy'];
    dueOffset: number | null;
    estimate: number | null;
    deep?: boolean;
    goal?: Goal | null;
    note?: string;
    pinned?: boolean;
    deferCount?: number;
  }) => {
    const area = byTitle(data.areaTitle);
    if (!area) return;
    const due = data.dueOffset === null ? null : addDaysToKey(today, data.dueOffset);
    tasks.push({
      id: uid('task'),
      title: data.title,
      note: data.note ?? '',
      areaId: area.id,
      energy: data.energy,
      due,
      estimateMin: data.estimate,
      deep: Boolean(data.deep),
      goalId: data.goal?.id ?? null,
      ritualId: null,
      status: 'active',
      pinned: data.pinned ?? false,
      deferCount: data.deferCount ?? 0,
      createdAt: new Date(now.getTime() - (2 + tasks.length) * 3_600_000).toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      delegatedTo: null,
      delegatedAt: null,
      brief: null,
      source: 'seed',
    });
  };

  addTask({
    title: 'بازبینی پیشنهاد سرمایه‌گذار برای رهیار',
    areaTitle: 'کسب‌وکار',
    energy: 'high',
    dueOffset: 0,
    estimate: 45,
    deep: true,
    goal: capitalGoal,
    note: 'نسخهٔ سوم دک را بخوانم و سه ایراد اصلی را برای جلسهٔ فردا یادداشت کنم.',
    pinned: true,
  });
  addTask({
    title: '۳۰ دقیقه پیاده‌روی، بدون گوشی',
    areaTitle: 'سلامت',
    energy: 'low',
    dueOffset: 0,
    estimate: 30,
    note: 'مسیر پارک نزدیک خانه؛ فقط قدم زدن و نفس کشیدن.',
  });
  addTask({
    title: 'تماس کوتاه با مادرم',
    areaTitle: 'خانواده',
    energy: 'low',
    dueOffset: 0,
    estimate: 10,
  });
  addTask({
    title: 'نوشتن پیش‌نویس فصل دوم کتاب',
    areaTitle: 'رشد',
    energy: 'high',
    dueOffset: 1,
    estimate: 60,
    deep: true,
    goal: bookGoal,
    note: 'فقط ۶۰۰ کلمهٔ اول؛ قرار نیست کامل باشد.',
  });
  addTask({
    title: 'یک‌به‌یک با تیم محصول',
    areaTitle: 'کسب‌وکار',
    energy: 'medium',
    dueOffset: 1,
    estimate: 30,
  });
  addTask({
    title: 'مرتب کردن هزینه‌های این ماه',
    areaTitle: 'مالی',
    energy: 'medium',
    dueOffset: 2,
    estimate: 25,
  });
  addTask({
    title: 'خرید هدیهٔ تولد سارا',
    areaTitle: 'خانواده',
    energy: 'low',
    dueOffset: null,
    estimate: 20,
    deferCount: 2,
  });
  addTask({
    title: 'پاسخ به ایمیل‌های غیرضروری',
    areaTitle: 'کسب‌وکار',
    energy: 'low',
    dueOffset: null,
    estimate: 15,
  });
  addTask({
    title: 'نیم ساعت برای خودم، بدون کار',
    areaTitle: 'شخصی',
    energy: 'low',
    dueOffset: null,
    estimate: 30,
  });
  addTask({
    title: 'بازبینی قرارداد همکاری',
    areaTitle: 'کسب‌وکار',
    energy: 'high',
    dueOffset: -2,
    estimate: 50,
    deep: true,
    deferCount: 3,
    note: 'بندهای پرداخت و مالکیت معنوی را با هم مقایسه کنم.',
  });

  const done: Task[] = [];
  const addDone = (title: string, areaTitle: string, daysAgo: number, energy: Task['energy']) => {
    const area = byTitle(areaTitle);
    if (!area) return;
    const key = addDaysToKey(today, -daysAgo);
    done.push({
      id: uid('task'),
      title,
      note: '',
      areaId: area.id,
      energy,
      due: key,
      estimateMin: 30,
      deep: false,
      goalId: null,
      ritualId: null,
      status: 'done',
      pinned: false,
      deferCount: 0,
      createdAt: iso(addDaysToKey(today, -daysAgo - 1), 9),
      updatedAt: iso(key),
      completedAt: iso(key),
      delegatedTo: null,
      delegatedAt: null,
      brief: null,
      source: 'seed',
    });
  };

  addDone('جلسهٔ برنامه‌ریزی هفته', 'کسب‌وکار', 2, 'high');
  addDone('پیاده‌روی صبحگاهی', 'سلامت', 1, 'low');
  addDone('شام خانوادگی', 'خانواده', 4, 'medium');
  addDone('مطالعهٔ بیست صفحه', 'رشد', 6, 'low');
  addDone('پرداخت قبض‌ها', 'مالی', 9, 'medium');
  addDone('تماس با یک دوست قدیمی', 'شخصی', 11, 'low');

  const rituals: Ritual[] = [];
  const addRitual = (
    title: string,
    areaTitle: string,
    cadence: Ritual['cadence'],
    weekday: number | null,
    time: string,
    nextDue: string,
    logDaysAgo: number[],
  ) => {
    const area = byTitle(areaTitle);
    if (!area) return;
    const log = logDaysAgo.map((d) => addDaysToKey(today, -d));
    rituals.push({
      id: uid('ritual'),
      title,
      areaId: area.id,
      cadence,
      weekday,
      time,
      nextDue,
      lastDoneAt: log.length ? iso(log[0]) : null,
      log,
      note: '',
      createdAt: created,
      source: 'seed',
    });
  };

  addRitual('سه نفس و مرور صبح', 'رشد', 'daily', null, '07:30', today, [1, 2, 4, 5]);
  addRitual('جلسهٔ هفتگی با خودم', 'رشد', 'weekly', 5, '18:00', addDaysToKey(today, 3), [4]);
  addRitual('قدردانی شبانه', 'خانواده', 'daily', null, '21:30', addDaysToKey(today, 1), [1, 2, 3]);
  addRitual('پیاده‌روی سبک', 'سلامت', 'daily', null, '08:00', addDaysToKey(today, 1), [1, 3]);

  const decisions: Decision[] = [
    {
      id: uid('decision'),
      title: 'پذیرش پروژهٔ مشاورهٔ جدید',
      chosen: 'نه؛ امسال تمرکز روی رهیار',
      alternatives: ['بله، با تیم بزرگ‌تر', 'بله، پاره‌وقت'],
      reason:
        'ظرفیت ذهنی‌ام برای دو تعهد بزرگ هم‌زمان کافی نیست. تمرکز روی رهیار، ارزش بلندمدت بیشتری دارد.',
      areaId: byTitle('کسب‌وکار')?.id ?? null,
      createdAt: iso(addDaysToKey(today, -8), 20),
      source: 'seed',
    },
    {
      id: uid('decision'),
      title: 'خرید لپ‌تاپ جدید',
      chosen: 'تعویق تا فصل بعد',
      alternatives: ['خرید همین ماه', 'تعمیر لپ‌تاپ فعلی'],
      reason: 'لپ‌تاپ فعلی هنوز کار می‌کند؛ این هزینه الان اولویت اول نیست.',
      areaId: byTitle('مالی')?.id ?? null,
      createdAt: iso(addDaysToKey(today, -16), 11),
      source: 'seed',
    },
  ];

  const reviews: Review[] = [
    {
      id: uid('review'),
      date: addDaysToKey(today, -1),
      moved: 3,
      energy: 'medium',
      note: 'فردا صبح، اول دک را باز کنم و بعد پیاده‌روی.',
      createdAt: iso(addDaysToKey(today, -1), 22),
      source: 'seed',
    },
    {
      id: uid('review'),
      date: addDaysToKey(today, -2),
      moved: 2,
      energy: 'low',
      note: 'کمتر قول بده، بیشتر نفس بکش.',
      createdAt: iso(addDaysToKey(today, -2), 21),
      source: 'seed',
    },
  ];

  return {
    ...base,
    tasks: [...tasks, ...done],
    goals,
    rituals,
    decisions,
    reviews,
  };
}

export function buildEmptyState(name = ''): AppState {
  const today = todayKey();
  const now = new Date();
  return {
    version: 1,
    onboarded: true,
    profile: { name: name.trim(), createdAt: now.toISOString(), demo: false },
    areas: AREA_PRESETS.slice(0, 3).map((p, i) => createArea(p, i === 0 ? 5 : 3, now.toISOString())),
    tasks: [],
    goals: [],
    rituals: [],
    decisions: [],
    reviews: [],
    messages: [],
    settings: {
      energy: 'medium',
      focusAreaId: null,
      deepWorkUntil: null,
      deepWorkStartedAt: null,
      deepWorkMinutes: null,
      lastVisit: today,
      recoveryDismissedOn: null,
    },
  };
}

export function areaForTask(state: Pick<AppState, 'areas'>, task: Pick<Task, 'areaId'>): Area | undefined {
  return task.areaId ? state.areas.find((a) => a.id === task.areaId) : undefined;
}

export function dateKeyOfIso(value: string | null): string | null {
  return value ? dateKey(new Date(value)) : null;
}
