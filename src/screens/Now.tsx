import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { useNow } from '../hooks/useSpeech';
import { useSpeechInput } from '../hooks/useSpeech';
import { buildPortfolio, rankedTasks, suggestionReason, todayCompleted } from '../lib/engine';
import {
  addDaysToKey,
  countdown,
  dueLabel,
  faNum,
  formatFullDate,
  formatTime,
  greetingFor,
  minutesLabel,
  todayKey,
} from '../lib/date';
import { ENERGY_LABEL, recoveryMessage } from '../lib/content';
import { Icon } from '../components/Icon';
import {
  AreaBadge,
  EnergyBars,
  EnergyPicker,
  Meta,
  PageHeader,
  ProgressRing,
  SectionTitle,
} from '../components/bits';

const START_SUGGESTIONS = [
  { title: '۱۰ دقیقه پیاده‌روی', energy: 'low' as const, icon: 'leaf' as const },
  { title: 'تماس با یک دوست قدیمی', energy: 'low' as const, icon: 'heart' as const },
  { title: 'نوشتن سه خط از امروز', energy: 'low' as const, icon: 'edit' as const },
];

export function NowScreen() {
  const { state, dispatch, recovery } = useStore();
  const {
    toast,
    openAddTask,
    openDelegate,
    completeTask,
    deferTask,
    archiveTask,
    addTask,
    setFocus,
    advisorSay,
  } = useUi();
  const [quick, setQuick] = useState('');
  const [quickError, setQuickError] = useState('');
  const deepActive = Boolean(
    state.settings.deepWorkUntil &&
      new Date(state.settings.deepWorkUntil).getTime() > Date.now(),
  );
  const now = useNow(deepActive ? 1000 : 30_000);
  const today = todayKey(now);
  const speech = useSpeechInput();

  useEffect(() => {
    return () => speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portfolio = useMemo(() => buildPortfolio(state, now), [state, now]);
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
  const queue = ranked.slice(1, 4);
  const done = todayCompleted(state, now);
  const activeCount = state.tasks.filter((t) => t.status === 'active').length;
  const overdueCount = state.tasks.filter(
    (t) => t.status === 'active' && t.due !== null && t.due < today,
  ).length;
  const focusArea = state.areas.find((a) => a.id === state.settings.focusAreaId) ?? null;
  const reviewedToday = state.reviews.find((r) => r.date === today);
  const topArea = top ? state.areas.find((a) => a.id === top.task.areaId) : undefined;
  const topGoal = top?.task.goalId
    ? state.goals.find((g) => g.id === top.task.goalId)
    : undefined;
  const due = top?.task.due ? dueLabel(top.task.due, today) : null;

  const quickSubmit = () => {
    if (!quick.trim()) {
      setQuickError('یک عنوان کوتاه بنویس.');
      return;
    }
    addTask({
      title: quick,
      areaId: focusArea?.id ?? null,
      energy: state.settings.energy,
    });
    setQuick('');
    setQuickError('');
    speech.stop();
  };

  const startVoice = () => {
    speech.start(
      (text) => {
        setQuick(text);
        setQuickError('');
      },
      (message) => toast(message),
    );
  };

  const startRecovery = () => {
    const overdue = state.tasks.filter(
      (t) => t.status === 'active' && t.due !== null && t.due < today,
    );
    if (!overdue.length) {
      dispatch({ type: 'dismissRecovery', today });
      toast('چیزی برای بازتنظیم نمانده. از یک قدم کوچک شروع کن.');
      return;
    }
    const snapshot = overdue;
    const at = new Date().toISOString();
    for (const task of overdue) {
      dispatch({
        type: 'updateTask',
        id: task.id,
        patch: {
          due: addDaysToKey(today, 1),
          updatedAt: at,
        },
      });
    }
    dispatch({ type: 'dismissRecovery', today });
    dispatch({ type: 'setEnergy', energy: 'low' });
    advisorSay(recoveryMessage(overdue.length, top?.task.title), 'recovery');
    toast(`${faNum(overdue.length)} کار عقب‌افتاده به فردا منتقل شد؛ بدون فشار.`, {
      actionLabel: 'بازگردان',
      onAction: () => {
        dispatch({ type: 'restoreEntities', tasks: snapshot });
        toast('برنامهٔ قبلی برگشت.');
      },
    });
  };

  const dismissRecovery = () => {
    dispatch({ type: 'dismissRecovery', today });
    toast('باشه. هر وقت خواستی، از مشاور «بازیابی» را انتخاب کن.');
  };

  const clearFocus = () => {
    setFocus(null);
    toast('تمرکز حوزه برداشته شد.');
  };

  const deepProgress = (() => {
    if (!state.settings.deepWorkUntil || !state.settings.deepWorkStartedAt) return 0;
    const start = new Date(state.settings.deepWorkStartedAt).getTime();
    const end = new Date(state.settings.deepWorkUntil).getTime();
    const total = end - start;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, (now.getTime() - start) / total));
  })();

  const greeting = greetingFor(now);
  const name = state.profile.name.trim();

  return (
    <div className="screen now-screen">
      <PageHeader
        eyebrow={
          <>
            <span>{formatFullDate(today)}</span>
            <span className="sep">·</span>
            <span>{formatTime(now)}</span>
          </>
        }
        title={name ? `${greeting}، ${name}` : greeting}
        subtitle={
          focusArea
            ? `امروز روی «${focusArea.title}» تمرکز کردی. من بقیه را برایت کنار می‌گذارم.`
            : 'بیا ببینیم همین حالا چه چیزی ارزش توجه دارد.'
        }
        actions={
          <div className="header-energy">
            <span className="header-energy-label">انرژی الان</span>
            <EnergyPicker
              value={state.settings.energy}
              onChange={(energy) => dispatch({ type: 'setEnergy', energy })}
            />
          </div>
        }
      />

      {recovery ? (
        <section className="banner banner--recovery">
          <div className="banner-icon">
            <Icon name="rotate" size={20} />
          </div>
          <div className="banner-copy">
            <strong>خوش برگشتی. لازم نیست چیزی را جبران کنی.</strong>
            <p>
              {overdueCount > 0
                ? `${faNum(overdueCount)} کار عقب‌افتاده را می‌بینم. می‌خواهی بدون سروصدا برای فردا بازتنظیمشان کنم؟`
                : 'برنامه کمی به‌هم ریخته. با هم آرام بازش می‌کنیم.'}
            </p>
          </div>
          <div className="banner-actions">
            <button type="button" className="btn btn--gold btn--sm" onClick={startRecovery}>
              شروع سبک
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={dismissRecovery}>
              بعداً
            </button>
          </div>
        </section>
      ) : null}

      {deepActive && state.settings.deepWorkUntil ? (
        <section className="banner banner--deep">
          <div className="banner-icon">
            <Icon name="shield" size={20} />
          </div>
          <div className="banner-copy">
            <strong>زمان عمیق محافظت‌شده</strong>
            <p>کارهای عمیق را جلو انداختم و سبک‌ها را عقب. گوشی را دور بگذار؛ من مراقب زمانم.</p>
            <div className="deep-progress">
              <i style={{ width: `${deepProgress * 100}%` }} />
            </div>
          </div>
          <div className="deep-clock">
            <span>{countdown(state.settings.deepWorkUntil, now)}</span>
            <small>باقی‌مانده</small>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              dispatch({ type: 'endDeepWork' });
              toast('بلوک تمرکز بسته شد. خسته نباشی.');
            }}
          >
            پایان
          </button>
        </section>
      ) : null}

      {focusArea ? (
        <div className="focus-strip">
          <span className={`focus-dot area-${focusArea.color}`} aria-hidden="true" />
          <span>
            تمرکز امروز: <strong>{focusArea.title}</strong>
          </span>
          <button type="button" className="link-btn" onClick={clearFocus}>
            برداشتن تمرکز
          </button>
        </div>
      ) : null}

      <form
        className={`quick-add ${speech.listening ? 'is-listening' : ''}`}
        onSubmit={(event) => {
          event.preventDefault();
          quickSubmit();
        }}
        data-testid="quick-form"
      >
        <span className="quick-add-spark" aria-hidden="true">
          <Icon name="sparkles" size={18} />
        </span>
        <input
          className="quick-add-input"
          placeholder="یک قدم تازه بنویس... (Enter)"
          value={quick}
          onChange={(event) => {
            setQuick(event.target.value);
            setQuickError('');
          }}
          aria-label="ورود سریع کار تازه"
          maxLength={120}
          data-testid="quick-input"
        />
        {speech.listening ? <span className="live-dot" aria-label="در حال شنیدن" /> : null}
        <button
          type="button"
          className={`quick-mic ${speech.listening ? 'is-listening' : ''}`}
          onClick={startVoice}
          aria-label="ثبت با صدا"
          title="ثبت با صدا"
        >
          <Icon name="mic" size={17} />
        </button>
        <button
          type="button"
          className="quick-more"
          onClick={() => openAddTask({ title: quick, areaId: focusArea?.id ?? null })}
          aria-label="جزئیات بیشتر"
          title="جزئیات بیشتر"
        >
          <Icon name="sliders" size={17} />
        </button>
        <button type="submit" className="quick-submit" aria-label="افزودن" data-testid="quick-add">
          <Icon name="plus" size={18} />
          <span>افزودن</span>
        </button>
      </form>
      {quickError ? <p className="form-error quick-error">{quickError}</p> : null}

      <div className="now-grid">
        <div className="now-main">
          {top ? (
            <article className="hero" data-testid="now-hero">
              <div className="hero-glow" aria-hidden="true" />
              <div className="hero-orbit" aria-hidden="true">
                <BrandOrbit />
              </div>
              <div className="hero-top">
                <span className="hero-eyebrow">
                  <Icon name="sparkles" size={14} />
                  پیشنهاد رهیار برای همین لحظه
                </span>
                <span className="hero-live">
                  <i /> {formatTime(now)}
                </span>
              </div>

              <h2 className="hero-title">{top.task.title}</h2>

              <div className="hero-meta">
                {topArea ? <AreaBadge area={topArea} /> : null}
                {due ? (
                  <Meta
                    icon="calendar"
                    tone={due.tone === 'overdue' ? 'danger' : due.tone === 'today' ? 'gold' : 'neutral'}
                  >
                    {due.tone === 'overdue' ? `موعد گذشته · ${due.label}` : `موعد: ${due.label}`}
                  </Meta>
                ) : (
                  <Meta icon="calendar">بدون موعد</Meta>
                )}
                <Meta icon="bolt">{ENERGY_LABEL[top.task.energy]}</Meta>
                {top.task.estimateMin ? <Meta icon="clock">{minutesLabel(top.task.estimateMin)}</Meta> : null}
                {top.task.deep ? <Meta icon="target" tone="gold">تمرکز عمیق</Meta> : null}
                {top.task.ritualId ? <Meta icon="repeat">آیین امروز</Meta> : null}
              </div>

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn--gold hero-primary"
                  onClick={() => completeTask(top.task.id)}
                  data-testid="complete-now"
                >
                  <Icon name="check" size={19} />
                  انجام شد
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => deferTask(top.task.id, 1)}
                >
                  <Icon name="clock" size={17} />
                  فردا
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => openDelegate(top.task.id)}
                >
                  <Icon name="users" size={17} />
                  واگذاری
                </button>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => archiveTask(top.task.id)}
                >
                  <Icon name="archive" size={17} />
                  کنار بگذار
                </button>
              </div>

              <div className="why">
                <span className="why-icon">
                  <Icon name="compass" size={18} />
                </span>
                <div>
                  <span className="why-label">چرا این کار، الان؟</span>
                  <p>{suggestionReason(top)}</p>
                  {topGoal ? (
                    <span className="why-goal">
                      <Icon name="flag" size={13} /> متصل به «{topGoal.title}»
                    </span>
                  ) : null}
                </div>
              </div>

              {top.task.note ? <p className="hero-note">«{top.task.note}»</p> : null}
            </article>
          ) : (
            <article className="hero hero--empty">
              <div className="hero-empty-ring" aria-hidden="true">
                <ProgressRing value={1} size={92} stroke={4} color="rgba(231,194,125,.45)" />
              </div>
              <div>
                <span className="hero-eyebrow">
                  <Icon name="check" size={14} />
                  {done.count > 0 ? 'امروز را خوب پیش بردی' : 'برنامه‌ات خالی است'}
                </span>
                <h2 className="hero-title">
                  {done.count > 0 ? 'همهٔ کارهای امروز انجام شد.' : 'از یک قدم کوچک شروع کنیم.'}
                </h2>
                <p className="hero-empty-copy">
                  {done.count > 0
                    ? 'این لحظه مال خودت است. اگر خواستی، یک کار تازه اضافه کن یا امروز را ببند.'
                    : 'لازم نیست بزرگ باشد. یکی از این پیشنهادها را انتخاب کن یا خودت بنویس.'}
                </p>
                {done.count === 0 ? (
                  <div className="start-suggestions">
                    {START_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.title}
                        type="button"
                        className="start-suggestion"
                        onClick={() =>
                          addTask({
                            title: suggestion.title,
                            energy: suggestion.energy,
                            due: today,
                          })
                        }
                      >
                        <Icon name={suggestion.icon} size={16} />
                        {suggestion.title}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="hero-actions">
                  <button type="button" className="btn btn--gold" onClick={() => openAddTask()}>
                    <Icon name="plus" size={17} />
                    یک قدم تازه
                  </button>
                  {done.count > 0 ? (
                    <a className="btn btn--ghost" href="#review">
                      <Icon name="moon" size={17} />
                      بستن روز
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          )}

          <section className="card queue-card">
            <SectionTitle
              title="بعد از این"
              hint={queue.length ? 'اگر خواستی یکی را جلوتر بیندازی' : 'فعلاً چیز دیگری روی میز نیست'}
              action={
                <a className="link-btn" href="#plan">
                  همهٔ کارها
                  <Icon name="chevron-left" size={14} />
                </a>
              }
            />
            {queue.length ? (
              <ul className="queue-list">
                {queue.map((item) => {
                  const area = state.areas.find((a) => a.id === item.task.areaId);
                  const label = item.task.due ? dueLabel(item.task.due, today) : null;
                  return (
                    <li key={item.task.id} className="queue-row">
                      <button
                        type="button"
                        className="task-check"
                        onClick={() => completeTask(item.task.id)}
                        aria-label={`انجام شد: ${item.task.title}`}
                      >
                        <Icon name="check" size={13} />
                      </button>
                      <div className="queue-copy">
                        <span className="queue-title">{item.task.title}</span>
                        <span className="queue-meta">
                          {area ? (
                            <span className={`queue-area area-${area.color}`}>
                              {area.emoji} {area.title}
                            </span>
                          ) : null}
                          {label ? (
                            <span className={`queue-due due-${label.tone}`}>{label.label}</span>
                          ) : null}
                          {item.task.estimateMin ? (
                            <span>{minutesLabel(item.task.estimateMin)}</span>
                          ) : null}
                        </span>
                      </div>
                      <span className="queue-energy" title={ENERGY_LABEL[item.task.energy]}>
                        <EnergyBars energy={item.task.energy} size="sm" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="queue-empty">میزت خالی است. نفس راحت بکش.</p>
            )}
          </section>

          <section className="card review-prompt">
            <span className="review-prompt-icon">
              <Icon name={reviewedToday ? 'check' : 'moon'} size={20} />
            </span>
            <div className="review-prompt-copy">
              <strong>{reviewedToday ? 'امروز مرور شد.' : 'امروز را زیر یک دقیقه ببند.'}</strong>
              <p>
                {reviewedToday
                  ? `انرژی امروزت «${ENERGY_LABEL[reviewedToday.energy]}» ثبت شد. اگر خواستی، جملهٔ فردا را ویرایش کن.`
                  : 'چه چیزی جلو رفت، انرژی‌ات چطور بود، و یک جمله برای فردا. همین.'}
              </p>
            </div>
            <a className="btn btn--soft btn--sm" href="#review">
              {reviewedToday ? 'دیدن مرور' : 'شروع مرور'}
              <Icon name="chevron-left" size={14} />
            </a>
          </section>
        </div>

        <aside className="now-side">
          <section className="card pulse-card">
            <SectionTitle title="نبض امروز" hint="بدون شمارش روزهای پیوسته" />
            <div className="pulse-main">
              <ProgressRing
                value={done.count + activeCount === 0 ? 0 : done.count / (done.count + activeCount)}
                size={136}
                stroke={9}
              >
                <strong>{faNum(done.count)}</strong>
                <span>قدم امروز</span>
              </ProgressRing>
              <div className="pulse-stats">
                <div>
                  <span>روی میز</span>
                  <strong>{faNum(activeCount)}</strong>
                </div>
                <div>
                  <span>عقب‌افتاده</span>
                  <strong className={overdueCount ? 'is-warn' : ''}>{faNum(overdueCount)}</strong>
                </div>
                <div>
                  <span>تمرکز</span>
                  <strong>{focusArea ? focusArea.title : 'همه'}</strong>
                </div>
              </div>
            </div>

            <div className="pulse-attention">
              <div className="pulse-attention-head">
                <span>سهم توجه · ۱۴ روز</span>
                <span>{faNum(portfolio.totalCompleted)} قدم</span>
              </div>
              {portfolio.areas.length ? (
                <ul>
                  {[...portfolio.areas]
                    .sort((a, b) => b.attentionShare - a.attentionShare)
                    .slice(0, 4)
                    .map((stat) => {
                      const max = Math.max(
                        ...portfolio.areas.map((s) => s.attentionShare),
                        0.001,
                      );
                      return (
                        <li key={stat.area.id}>
                          <span className="pulse-area-name">
                            <i className={`dot-bg area-${stat.area.color}`} />
                            {stat.area.title}
                          </span>
                          <span className="pulse-bar">
                            <i
                              className={`bar-fill area-${stat.area.color}`}
                              style={{ width: `${Math.max(3, (stat.attentionShare / max) * 100)}%` }}
                            />
                          </span>
                          <span className="pulse-pct">{faNum(Math.round(stat.attentionShare * 100))}٪</span>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="pulse-empty">اولین حوزه‌ات را در پرتفوی بساز.</p>
              )}
              <a className="link-btn" href="#portfolio">
                دیدن پرتفوی کامل
                <Icon name="chevron-left" size={13} />
              </a>
            </div>

            <p className="pulse-quote">
              «مسیر، از یک قدم کوچک شروع می‌شود؛ نه از یک برنامهٔ کامل.»
            </p>
          </section>

          {state.settings.energy === 'low' ? (
            <section className="card side-note">
              <Icon name="leaf" size={18} />
              <div>
                <strong>امروز سبک بگیر.</strong>
                <p>انرژی کم را جدی بگیر؛ رهیار قدم‌های کوتاه را جلو می‌اندازد.</p>
              </div>
            </section>
          ) : (
            <section className="card side-note">
              <Icon name="bolt" size={18} />
              <div>
                <strong>ظرفیت امروزت را می‌بینی.</strong>
                <p>اگر انرژی عوض شد، همین بالا تغییرش بده؛ پیشنهاد «الان» بلافاصله هماهنگ می‌شود.</p>
              </div>
            </section>
          )}

          {!deepActive ? (
            <section className="card side-deep">
              <div className="side-deep-head">
                <span className="side-deep-icon">
                  <Icon name="shield" size={17} />
                </span>
                <strong>زمان عمیق</strong>
              </div>
              <p>یک بلوک تمرکز بساز تا کارهای مهم جلو بیفتند.</p>
              <div className="row gap-6">
                {[25, 50, 90].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      dispatch({
                        type: 'startDeepWork',
                        minutes,
                        at: new Date().toISOString(),
                      });
                      toast(`بلوک ${faNum(minutes)} دقیقه‌ای شروع شد.`);
                    }}
                  >
                    {faNum(minutes)} دقیقه
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function BrandOrbit() {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="110" cy="110" r="92" stroke="rgba(231,194,125,.12)" />
      <circle cx="110" cy="110" r="68" stroke="rgba(231,194,125,.08)" strokeDasharray="1 7" />
      <circle cx="110" cy="110" r="44" stroke="rgba(111,217,190,.08)" />
      <circle cx="110" cy="18" r="2.5" fill="rgba(231,194,125,.6)" />
      <circle cx="190" cy="140" r="1.8" fill="rgba(111,217,190,.5)" />
    </svg>
  );
}
