import type { Area, AreaColor, Energy, Review, Task } from '../types';
import { dueLabel, faNum, greetingFor, minutesLabel, formatFullDate } from './date';

export interface AreaPreset {
  title: string;
  emoji: string;
  color: AreaColor;
}

export const AREA_PRESETS: AreaPreset[] = [
  { title: 'کسب‌وکار', emoji: '💼', color: 'gold' },
  { title: 'سلامت', emoji: '🌿', color: 'mint' },
  { title: 'خانواده', emoji: '🏡', color: 'rose' },
  { title: 'رشد', emoji: '🧠', color: 'violet' },
  { title: 'مالی', emoji: '💎', color: 'sky' },
  { title: 'شخصی', emoji: '✨', color: 'gold' },
];

export const ENERGY_LABEL: Record<Energy, string> = {
  low: 'انرژی کم',
  medium: 'انرژی متوسط',
  high: 'انرژی بالا',
};

export const ENERGY_HINT: Record<Energy, string> = {
  low: 'امروز قدم‌های کوچک و نرم',
  medium: 'ریتم متعادل روز',
  high: 'ظرفیت کار عمیق',
};

const AREA_REWARD: Record<AreaColor, string[]> = {
  gold: [
    'یک قدم واقعی برای کاری که داری می‌سازی. همین‌ها فردا فرق می‌سازند.',
    'این کار از فهرست بیرون رفت، اما اثرش ماند. کسب‌وکارت یک قدم جلوتر است.',
    'تصمیم گرفتی و انجامش دادی. این همان چیزی است که مسیر را می‌سازد.',
  ],
  mint: [
    'به بدنت وقت دادی. این بهترین سرمایه‌گذاری امروز بود.',
    'سلامتی، همان زیربنایی است که بقیهٔ زندگی رویش می‌ایستد. خوب کردی.',
    'یک نفس عمیق‌تر و بدنی که می‌داند حواست بهش هست.',
  ],
  rose: [
    'برای آدم‌های مهم زندگی‌ات وقت گذاشتی. این را فراموش نکن.',
    'بعضی کارها در فهرست دیده می‌شوند، اما اثرشان در دل آدم‌ها می‌ماند.',
    'یک لحظهٔ واقعی برای خانواده؛ ارزشش از ده کار دیگر بیشتر است.',
  ],
  violet: [
    'ذهن تو امروز یک قدم بزرگ‌تر شد. همین‌طور رشد می‌کند.',
    'سرمایه‌گذاری روی خودت، سود مرکب دارد. شروعش کردی.',
    'کمی عمیق‌تر شدی. این تغییر کوچک، در ماه‌های آینده دیده می‌شود.',
  ],
  sky: [
    'یک تصمیم مالی کوچک، آرامش فردا را می‌سازد.',
    'مبلغ‌ها و حساب‌ها را روشن کردی؛ ذهنت هم سبک‌تر شد.',
    'امروز به پول، به‌عنوان ابزار نگاه کردی؛ نه نگرانی.',
  ],
};

const GENERAL_REWARDS = [
  'این یکی را زمین گذاشتی. حالا سرت کمی سبک‌تر است.',
  'قدم کوچک، مسیر واقعی. همین که انجامش دادی یعنی جلو افتادی.',
  'یک قدم دیگر روی مسیر. به خودت افتخار کن.',
  'انجام شد. نه کامل، نه بی‌نقص؛ فقط جلو رفت. این کافی است.',
  'تو امروز انتخابی کردی که فردا از خودت ممنون می‌شوی.',
];

export interface Reward {
  title: string;
  message: string;
  emoji: string;
}

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

export function rewardFor(
  _task: Pick<Task, 'title'>,
  area: Area | undefined,
  doneToday: number,
  random: () => number = Math.random,
): Reward {
  const templates = area ? AREA_REWARD[area.color] : GENERAL_REWARDS;
  const message = randomItem(templates, random);
  const title =
    doneToday >= 3
      ? `${faNum(doneToday)} قدم امروز؛ روزت دارد شکل می‌گیرد.`
      : doneToday === 2
        ? 'دومین قدم امروز هم برداشته شد.'
        : 'یک قدم جلو رفتی.';

  return { title, message, emoji: area?.emoji ?? '✦' };
}

export function motivationalMessage(input: {
  name: string;
  areaTitle?: string | null;
  doneToday: number;
  now: Date;
  lastReviewNote?: string | null;
  random?: () => number;
}): string {
  const random = input.random ?? Math.random;
  const name = input.name.trim();
  const hello = name ? `${name} جان، ` : '';
  const options = [
    `${hello}لازم نیست همهٔ زندگی را امروز جابه‌جا کنی. همین که یک قدم کوچک را انتخاب کنی، کافی است. من کنارتم.`,
    `${hello}امروز قرار نیست بی‌نقص باشی؛ قرار است یک قدم جلو بروی. همان یک قدم، مسیر را زنده نگه می‌دارد.`,
    `${hello}به ${input.areaTitle ? `«${input.areaTitle}»` : 'چیزی که برایت مهم است'} فکر کن. یک حرکت ده‌دقیقه‌ای، بیشتر از یک نقشهٔ کامل ارزش دارد.`,
    `${hello}${input.doneToday > 0 ? `همین ${faNum(input.doneToday)} قدم امروز نشان می‌دهد داری حرکت می‌کنی.` : 'امروز هنوز شروع نشده؛ هنوز هم وقت هست.'} لازم نیست خودت را ثابت کنی، فقط ادامه بده.`,
    `${hello}آرام باش. بهترین حرکت بعدی همیشه بزرگ‌ترین حرکت نیست؛ روشن‌ترین حرکت است.`,
    input.lastReviewNote
      ? `${hello}دیروز برای امروزت نوشتی: «${input.lastReviewNote}». یک قدم در همان جهت، امروز را معنا می‌کند.`
      : `${hello}یک تصمیم کوچک امروز، یک اطمینان بزرگ فردا می‌سازد. از یک چیز شروع کن.`,
  ];
  return randomItem(options, random);
}

export function advisorGreeting(input: {
  name: string;
  now: Date;
  activeCount: number;
  doneToday: number;
  nextTitle?: string | null;
}): string {
  const greeting = greetingFor(input.now);
  const name = input.name.trim();
  const who = name ? `${greeting}، ${name}.` : `${greeting}.`;
  if (input.activeCount === 0 && input.doneToday === 0) {
    return `${who} امروز هنوز چیزی روی میزت نیست. یک قدم کوچک اضافه کن؛ من کمک می‌کنم کجا شروع کنی.`;
  }
  if (input.doneToday > 0) {
    return `${who} ${faNum(input.doneToday)} قدم امروز برداشته‌ای. ${
      input.nextTitle ? `قدم بعدی که می‌بینم «${input.nextTitle}» است.` : 'برنامه‌ات سبک است؛ از همین سبکی لذت ببر.'
    }`;
  }
  return `${who} ${faNum(input.activeCount)} کار روی میزت هست، اما لازم نیست همه را با هم ببینی. ${
    input.nextTitle ? `از «${input.nextTitle}» شروع کنیم؟` : 'یک دستور کوتاه انتخاب کن.'
  }`;
}

export function lightenMessage(moved: Task[], energy: Energy): string {
  if (!moved.length) {
    return energy === 'low'
      ? 'به نظرم امروزت از قبل سبک است. لازم نیست چیزی را جابه‌جا کنم؛ فقط یک قدم کوچک بردار و بقیه را رها کن.'
      : 'برنامه‌ات سبک است؛ چیزی برای برداشتن پیدا نکردم. اگر کار سنگینی هست که من نمی‌بینم، اول آن را ثبت کن.';
  }
  const titles = moved.map((t) => `«${t.title}»`).join(' و ');
  const countText = moved.length === 1 ? 'یک کار سنگین' : moved.length === 2 ? 'دو کار سنگین' : `${faNum(moved.length)} کار سنگین`;
  return `${countText} را برداشتم روی فردا: ${titles}. امروز فقط باید سبک بمانی و یک قدم کوچک برداری. لازم نیست چیزی را جبران کنی.`;
}

export function focusMessage(area: Area, count: number): string {
  if (count === 0) {
    return `تمرکز امروز را روی «${area.title}» گذاشتم. فعلاً کاری در این حوزه روی میزت نیست؛ می‌خواهی یک قدم کوچک همین حالا اضافه کنی؟`;
  }
  return `تمرکز امروز: «${area.title}». ${faNum(count)} کار در این حوزه هست و پیشنهاد «الان» هم از همین حوزه انتخاب می‌شود. بقیه را برای امروز کنار می‌گذارم.`;
}

export function deepWorkMessage(minutes: number, hasDeepTask: boolean): string {
  if (hasDeepTask) {
    return `یک بلوک ${faNum(minutes)} دقیقه‌ای محافظت شد. کارهای عمیق را جلو می‌اندازم و کارهای سبک را عقب. گوشی را دور بگذار؛ من مراقب زمانم.`;
  }
  return `یک بلوک ${faNum(minutes)} دقیقه‌ای محافظت شد. بین کارهایت چیزی با علامت تمرکز عمیق نیست؛ اگر کاری هست که تمرکز می‌خواهد، حالا وقتش است.`;
}

export function recoveryMessage(rescheduled: number, nextTitle?: string | null): string {
  if (rescheduled === 0) {
    return `برگشتی؛ همین کافی است. چیزی برای جبران نیست. ${
      nextTitle ? `فقط «${nextTitle}» را انتخاب کن و از یک قدم کوچک شروع کن.` : 'یک قدم کوچک انتخاب کن.'
    }`;
  }
  return `برگشتی؛ همین کافی است. ${faNum(rescheduled)} کار عقب‌افتاده را بدون سروصدا برای امروز و فردا بازتنظیم کردم. لازم نیست چیزی را جبران کنی؛ فقط یک قدم کوچک بردار.`;
}

export function summaryMessage(input: {
  done: number;
  open: number;
  doneTitles: string[];
  nextTitle?: string | null;
  energy: Energy;
  focusAreaTitle?: string | null;
}): string {
  const lines: string[] = [];
  if (input.done === 0) {
    lines.push('امروز هنوز قدمی ثبت نشده. این نه شکست است، نه عقب‌افتادگی؛ فقط هنوز شروع نکرده‌ای.');
  } else {
    lines.push(`امروز ${faNum(input.done)} قدم جلو رفتی${input.doneTitles.length ? `: ${input.doneTitles.slice(0, 2).map((t) => `«${t}»`).join(' و ')}` : ''}.`);
  }
  lines.push(`انرژی امروزت «${ENERGY_LABEL[input.energy]}» است${input.focusAreaTitle ? ` و تمرکزت روی «${input.focusAreaTitle}»` : ''}.`);
  lines.push(
    input.nextTitle
      ? `اگر یک قدم دیگر جا داشتی، «${input.nextTitle}» روشن‌ترین انتخاب است. ${faNum(input.open)} کار دیگر روی میزت هست؛ لازم نیست امروز همه را انجام دهی.`
      : 'چیز باز دیگری روی میزت نمانده. امروز را ببند و به خودت استراحت بده.',
  );
  return lines.join('\n');
}

export function clearedFocusMessage(): string {
  return 'تمرکز حوزه را برداشتم. از این به بعد پیشنهاد «الان» از همهٔ حوزه‌ها انتخاب می‌شود.';
}

export function emptyAdvisorMessage(): string {
  return 'یک دستور کوتاه انتخاب کن؛ من فقط همان کاری را می‌کنم که الان به آن نیاز داری.';
}

export function buildBrief(input: {
  task: Task;
  area?: Area;
  to?: string;
  from?: string;
  today: string;
}): string {
  const { task, area, to, from, today } = input;
  const due = task.due ? `${formatFullDate(task.due, true)} (${dueLabel(task.due, today).label})` : 'بدون موعد مشخص';
  const estimate = task.estimateMin ? minutesLabel(task.estimateMin) : 'مشخص نشده';
  const energy = ENERGY_LABEL[task.energy];
  return `بریف واگذاری

کار: ${task.title}
به: ${to?.trim() || '—'}
از طرف: ${from?.trim() || '—'}
حوزه: ${area?.title ?? 'بدون حوزه'}
موعد: ${due}
زمان تقریبی: ${estimate}
سطح انرژی: ${energy}

هدف کار:
${task.note.trim() || 'این کار را برای پیشبرد یکی از اولویت‌های مهم زندگی و کارم می‌سپارم. جزئیات نهایی را با هم هم‌راستا می‌کنیم.'}

خروجی مورد انتظار:
یک نتیجهٔ روشن و قابل‌بازبینی که تا موعد مشخص‌شده آماده شود؛ اگر مسیر تغییر کرد، قبل از ادامه هماهنگ کنیم.

قدم‌های پیشنهادی:
۱. خروجی نهایی را در یک جمله روشن کن و با من هم‌راستا کن.
۲. پیش‌نویس یا اقدام اولیه را آماده کن.
۳. قبل از موعد برای بازبینی بفرست؛ بعد از تأیید نهایی شود.

اگر ابهامی یا مانعی بود، قبل از شروع یک پیام کوتاه بفرست.`;
}

export function reviewSummaryText(review: Review | undefined): string {
  if (!review) return 'امروز هنوز مرور نشده.';
  return `مرور ${formatFullDate(review.date, true)} ثبت شد؛ ${faNum(review.moved)} قدم و انرژی «${ENERGY_LABEL[review.energy]}».`;
}

export function tomorrowNotePrompt(name: string): string {
  return name.trim()
    ? `${name.trim()}، برای فردای خودت یک جمله بنویس. فردا همین جمله را یادت می‌آورم.`
    : 'برای فردای خودت یک جمله بنویس. فردا همین جمله را یادت می‌آورم.';
}
