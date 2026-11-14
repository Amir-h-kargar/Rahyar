import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { useNow } from '../hooks/useSpeech';
import { nextAction, rankedTasks, todayCompleted } from '../lib/engine';
import {
  addDaysToKey,
  countdown,
  faNum,
  formatTime,
  todayKey,
} from '../lib/date';
import {
  advisorGreeting,
  clearedFocusMessage,
  deepWorkMessage,
  ENERGY_LABEL,
  focusMessage,
  lightenMessage,
  motivationalMessage,
  recoveryMessage,
  summaryMessage,
} from '../lib/content';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/bits';
import { ConfirmDialog } from '../components/Sheet';

type FocusMode = 'none' | 'focus' | 'deep';

const COMMANDS: {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tone: string;
}[] = [
  { id: 'lighten', title: 'امروز را سبک‌تر کن', description: 'کارهای سنگین را بی‌سروصدا به فردا می‌برد.', icon: 'leaf', tone: 'mint' },
  { id: 'focus', title: 'تمرکز روی یک حوزه', description: 'امروز را روی یک حوزهٔ زندگی روشن کن.', icon: 'target', tone: 'gold' },
  { id: 'deep', title: 'محافظت از زمان عمیق', description: 'یک بلوک تمرکز بساز تا مهم‌ها جلو بیفتند.', icon: 'shield', tone: 'violet' },
  { id: 'recovery', title: 'بازیابی بعد از وقفه', description: 'بدون سرزنش، برنامه را آرام بازتنظیم کن.', icon: 'rotate', tone: 'sky' },
  { id: 'summary', title: 'خلاصهٔ امروز', description: 'یک نگاه کوتاه به آنچه جلو رفته.', icon: 'chart', tone: 'gold' },
  { id: 'motivate', title: 'پیام انگیزشی', description: 'یک جملهٔ گرم، مخصوص همین لحظه.', icon: 'heart', tone: 'rose' },
];

export function AdvisorScreen() {
  const { state, dispatch, recovery } = useStore();
  const { toast, advisorSay, advisorHear, setFocus } = useUi();
  const now = useNow(60_000);
  const today = todayKey(now);
  const [panel, setPanel] = useState<FocusMode>('none');
  const [clearOpen, setClearOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLElement>(null);

  const done = todayCompleted(state, now);
  const ranked = useMemo(
    () =>
      rankedTasks({
        now,
        energy: state.settings.energy,
        areas: state.areas,
        tasks: state.tasks,
        goals: state.goals,
        rituals: state.rituals,
        focusAreaId: state.settings.focusAreaId,
        deepWorkUntil: state.settings.deepWorkUntil,
        recovery,
      }),
    [state, now, recovery],
  );
  const top = ranked[0] ?? null;
  const topArea = top ? state.areas.find((a) => a.id === top.task.areaId) : undefined;
  const focusArea = state.areas.find((a) => a.id === state.settings.focusAreaId) ?? null;
  const deepActive = Boolean(
    state.settings.deepWorkUntil &&
      new Date(state.settings.deepWorkUntil).getTime() > now.getTime(),
  );

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  const greeting = advisorGreeting({
    name: state.profile.name,
    now,
    activeCount: state.tasks.filter((t) => t.status === 'active').length,
    doneToday: done.count,
    nextTitle: top?.task.title ?? null,
  });

  const lighten = () => {
    const topId = top?.task.id;
    const heavy = state.tasks
      .filter(
        (task) =>
          task.status === 'active' &&
          task.id !== topId &&
          !task.pinned &&
          (task.energy === 'high' || (task.estimateMin ?? 0) >= 45) &&
          task.due !== null &&
          task.due <= today,
      )
      .slice(0, 2);
    const snapshot = heavy;
    const at = new Date().toISOString();
    for (const task of heavy) {
      dispatch({
        type: 'updateTask',
        id: task.id,
        patch: { due: addDaysToKey(today, 1), updatedAt: at },
      });
    }
    advisorHear('امروز را سبک‌تر کن');
    advisorSay(lightenMessage(heavy, state.settings.energy), 'lighten');
    if (heavy.length) {
      toast(`${faNum(heavy.length)} کار سنگین به فردا رفت.`, {
        actionLabel: 'بازگردان',
        onAction: () => {
          dispatch({ type: 'restoreEntities', tasks: snapshot });
          toast('برنامهٔ قبلی برگشت.');
        },
      });
    }
  };

  const applyFocus = (areaId: string) => {
    const area = state.areas.find((a) => a.id === areaId);
    if (!area) return;
    const count = state.tasks.filter((t) => t.status === 'active' && t.areaId === area.id).length;
    setFocus(area.id);
    advisorHear(`تمرکز روی ${area.title}`);
    advisorSay(focusMessage(area, count), 'focus');
    setPanel('none');
  };

  const clearFocus = () => {
    setFocus(null);
    advisorHear('تمرکز حوزه را بردار');
    advisorSay(clearedFocusMessage(), 'focus');
    setPanel('none');
  };

  const startDeep = (minutes: number) => {
    dispatch({ type: 'startDeepWork', minutes, at: new Date().toISOString() });
    const hasDeep = state.tasks.some((t) => t.status === 'active' && t.deep);
    advisorHear(`یک بلوک ${faNum(minutes)} دقیقه‌ای`);
    advisorSay(deepWorkMessage(minutes, hasDeep), 'deep');
    setPanel('none');
  };

  const endDeep = () => {
    dispatch({ type: 'endDeepWork' });
    advisorSay('بلوک تمرکز بسته شد. خسته نباشی؛ همین که محافظتش کردی کافی است.', 'deep');
    setPanel('none');
  };

  const recover = () => {
    const overdue = state.tasks.filter(
      (t) => t.status === 'active' && t.due !== null && t.due < today,
    );
    if (!overdue.length) {
      advisorHear('بازیابی بعد از وقفه');
      advisorSay(
        'چیزی برای بازیابی پیدا نکردم. برنامه‌ات از قبل مرتب است. اگر احساس می‌کنی عقب افتاده‌ای، فقط یک قدم کوچک بردار؛ همین کافی است.',
        'recovery',
      );
      return;
    }
    const snapshot = overdue;
    const at = new Date().toISOString();
    overdue.forEach((task, index) => {
      dispatch({
        type: 'updateTask',
        id: task.id,
        patch: {
          due: addDaysToKey(today, index === 0 ? 0 : 1),
          updatedAt: at,
        },
      });
    });
    dispatch({ type: 'dismissRecovery', today });
    dispatch({ type: 'setEnergy', energy: 'low' });
    advisorHear('بازیابی بعد از وقفه');
    advisorSay(recoveryMessage(overdue.length, overdue[0]?.title), 'recovery');
    toast(`${faNum(overdue.length)} کار بازتنظیم شد؛ بدون جبران و فشار.`, {
      actionLabel: 'بازگردان',
      onAction: () => {
        dispatch({ type: 'restoreEntities', tasks: snapshot });
        toast('برنامهٔ قبلی برگشت.');
      },
    });
  };

  const summary = () => {
    const next = nextAction({
      now,
      energy: state.settings.energy,
      areas: state.areas,
      tasks: state.tasks,
      goals: state.goals,
      rituals: state.rituals,
      focusAreaId: state.settings.focusAreaId,
      deepWorkUntil: state.settings.deepWorkUntil,
      recovery,
    });
    const activeCount = state.tasks.filter((t) => t.status === 'active').length;
    advisorHear('خلاصهٔ امروز');
    advisorSay(
      summaryMessage({
        done: done.count,
        open: activeCount,
        doneTitles: done.tasks.map((t) => t.title),
        nextTitle: next?.task.title ?? null,
        energy: state.settings.energy,
        focusAreaTitle: focusArea?.title ?? null,
      }),
      'summary',
    );
  };

  const motivate = () => {
    const lastReview = [...state.reviews].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    advisorHear('یک جمله برای من');
    advisorSay(
      motivationalMessage({
        name: state.profile.name,
        areaTitle: focusArea?.title ?? topArea?.title ?? null,
        doneToday: done.count,
        now,
        lastReviewNote: lastReview?.note ?? null,
      }),
      'motivate',
    );
  };

  const runCommand = (id: string) => {
    switch (id) {
      case 'lighten':
        lighten();
        break;
      case 'focus':
        setPanel((p) => (p === 'focus' ? 'none' : 'focus'));
        break;
      case 'deep':
        setPanel((p) => (p === 'deep' ? 'none' : 'deep'));
        break;
      case 'recovery':
        recover();
        break;
      case 'summary':
        summary();
        break;
      case 'motivate':
        motivate();
        break;
      default:
        break;
    }
  };

  const latestAdvisor = [...state.messages].reverse().find((message) => message.role === 'advisor');

  return (
    <div className="screen advisor-screen">
      <PageHeader
        eyebrow={
          <>
            <Icon name="sparkles" size={14} /> دستورهای زمینه‌ای، نه چت بی‌پایان
          </>
        }
        title="مشاور خصوصی"
        subtitle="یک دستور کوتاه انتخاب کن؛ رهیار همان لحظه کاری را که لازم است انجام می‌دهد."
      />

      <section className="advisor-hero">
        <div className="advisor-orb" aria-hidden="true">
          <span className="advisor-orb-ring advisor-orb-ring--1" />
          <span className="advisor-orb-ring advisor-orb-ring--2" />
          <span className="advisor-orb-core">
            <Icon name="compass" size={34} />
          </span>
        </div>
        <div className="advisor-copy">
          <div className="advisor-name-row">
            <strong>رهیار</strong>
            <span className="badge-live">
              <i /> همین حالا کنارت
            </span>
          </div>
          <p className="advisor-greeting">{greeting}</p>
          <div className="advisor-context">
            <span>
              <Icon name="bolt" size={13} /> {ENERGY_LABEL[state.settings.energy]}
            </span>
            <span>
              <Icon name="target" size={13} /> {focusArea ? focusArea.title : 'همهٔ حوزه‌ها'}
            </span>
            <span>
              <Icon name="check" size={13} /> {faNum(done.count)} قدم امروز
            </span>
            {topArea ? (
              <span>
                <Icon name="compass" size={13} /> بعدی: {topArea.title}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {latestAdvisor ? (
        <section className="latest-reply" aria-live="polite">
          <span className="latest-reply-icon">
            <Icon name="spark" size={17} />
          </span>
          <div className="latest-reply-copy">
            <span className="latest-reply-label">
              پاسخ رهیار
              <time>{formatTime(latestAdvisor.at)}</time>
            </span>
            <p>{latestAdvisor.text}</p>
          </div>
          <button
            type="button"
            className="link-btn latest-reply-link"
            onClick={() =>
              conversationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          >
            گفت‌وگوی کامل
            <Icon name="chevron-left" size={13} />
          </button>
        </section>
      ) : null}

      <div className="command-grid">
        {COMMANDS.map((command) => (
          <button
            key={command.id}
            type="button"
            className={`command-card command-${command.tone}`}
            onClick={() => runCommand(command.id)}
            data-testid={`cmd-${command.id}`}
          >
            <span className="command-icon">
              <Icon name={command.icon} size={20} />
            </span>
            <span className="command-copy">
              <strong>{command.title}</strong>
              <small>{command.description}</small>
            </span>
            <span className="command-go" aria-hidden="true">
              <Icon name="chevron-left" size={16} />
            </span>
          </button>
        ))}
      </div>

      {panel === 'focus' ? (
        <section className="card command-panel">
          <div className="command-panel-head">
            <div>
              <strong>امروز روی کدام حوزه تمرکز کنیم؟</strong>
              <p>پیشنهاد «الان» از همین حوزه انتخاب می‌شود. بقیه کنار می‌روند، نه اینکه حذف شوند.</p>
            </div>
            <button type="button" className="icon-btn" onClick={() => setPanel('none')} aria-label="بستن">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="chips-row">
            {state.areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className={`area-choice area-${area.color} ${
                  state.settings.focusAreaId === area.id ? 'is-active' : ''
                }`}
                onClick={() => applyFocus(area.id)}
              >
                <span aria-hidden="true">{area.emoji}</span>
                {area.title}
              </button>
            ))}
            {focusArea ? (
              <button type="button" className="choice-chip" onClick={clearFocus}>
                برداشتن تمرکز
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {panel === 'deep' ? (
        <section className="card command-panel">
          <div className="command-panel-head">
            <div>
              <strong>{deepActive ? 'زمان عمیق در جریان است' : 'چقدر زمان عمیق می‌خواهی؟'}</strong>
              <p>
                {deepActive && state.settings.deepWorkUntil
                  ? `تا ${formatTime(state.settings.deepWorkUntil)} محافظت شده. کارهای عمیق جلو می‌افتند.`
                  : 'در این بلوک، کارهای تمرکزخواه اولویت می‌گیرند و کارهای سبک عقب می‌روند.'}
              </p>
            </div>
            <button type="button" className="icon-btn" onClick={() => setPanel('none')} aria-label="بستن">
              <Icon name="close" size={16} />
            </button>
          </div>
          {deepActive && state.settings.deepWorkUntil ? (
            <div className="deep-active-row">
              <DeepClock until={state.settings.deepWorkUntil} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={endDeep}>
                پایان بلوک
              </button>
            </div>
          ) : (
            <div className="chips-row">
              {[25, 50, 90].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="duration-chip"
                  onClick={() => startDeep(minutes)}
                >
                  <strong>{faNum(minutes)}</strong>
                  <span>دقیقه</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="card conversation-card" ref={conversationRef}>
        <div className="conversation-head">
          <div>
            <h2>گفت‌وگو</h2>
            <p>دستورها و پاسخ‌های کوتاه رهیار، همین‌جا می‌مانند.</p>
          </div>
          {state.messages.length ? (
            <button type="button" className="link-btn" onClick={() => setClearOpen(true)}>
              پاک کردن
            </button>
          ) : null}
        </div>

        {state.messages.length ? (
          <div className="feed" ref={feedRef}>
            {state.messages.map((message) => (
              <div key={message.id} className={`bubble-row bubble-${message.role}`}>
                {message.role === 'advisor' ? (
                  <span className="bubble-avatar">
                    <Icon name="spark" size={15} />
                  </span>
                ) : null}
                <div className={`bubble bubble-${message.role}`}>
                  <p>{message.text}</p>
                  <time>{formatTime(message.at)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="conversation-empty">
            <span className="conversation-empty-icon">
              <Icon name="sparkles" size={20} />
            </span>
            <div>
              <strong>هنوز گفت‌وگویی شروع نشده.</strong>
              <p>یکی از شش دستور بالا را بزن؛ پاسخ، همراه با یک اقدام واقعی می‌آید.</p>
            </div>
          </div>
        )}
      </section>

      <section className="advisor-footnote">
        <Icon name="info" size={15} />
        <p>
          رهیار چت بی‌پایان نمی‌کند. اگر می‌خواهی کارها را خودت ببینی، به
          <a href="#plan"> برنامه </a>
          یا <a href="#portfolio"> پرتفوی </a>
          برو. اینجا فقط تصمیم‌های کوتاه و اقدام‌های روشن است.
        </p>
      </section>

      <ConfirmDialog
        open={clearOpen}
        title="گفت‌وگو پاک شود؟"
        description="پیام‌ها پاک می‌شوند، اما کارها و تنظیمات دست نمی‌خورند."
        confirmLabel="پاک کن"
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'clearMessages' });
          setClearOpen(false);
          toast('گفت‌وگو پاک شد.');
        }}
      />
    </div>
  );
}

function DeepClock({ until }: { until: string }) {
  const now = useNow(1000);
  return <span className="deep-big-clock">{countdown(until, now)}</span>;
}
