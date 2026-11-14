import { useEffect, useMemo, useState } from 'react';
import type { Area, AreaColor } from '../types';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { useNow } from '../hooks/useSpeech';
import { buildInsights, buildPortfolio } from '../lib/engine';
import { brainInsights } from '../lib/brain';
import { faNum } from '../lib/date';
import { AREA_HEX } from '../lib/colors';
import { createArea } from '../lib/seed';
import { Icon, type IconName } from '../components/Icon';
import { EmptyState, PageHeader, SectionTitle } from '../components/bits';
import { Sheet, ConfirmDialog } from '../components/Sheet';

type Editor = { mode: 'new' } | { mode: 'edit'; area: Area } | null;

const EMOJIS = ['💼', '🌿', '🏡', '🧠', '💎', '✨', '🎯', '🎨', '🤝', '🏃', '📚', '🌙'];
const COLORS: AreaColor[] = ['gold', 'mint', 'rose', 'violet', 'sky'];
const INTENT_LABEL = ['', 'کم', 'متعادل', 'مهم', 'خیلی مهم', 'اولویت اول'];
const INSIGHT_ICON: Record<string, IconName> = {
  gap: 'target',
  dormant: 'moon',
  defer: 'rotate',
  trend: 'chart',
  review: 'book',
};

export function PortfolioScreen() {
  const { state, dispatch } = useStore();
  const { openAddTask, toast } = useUi();
  const now = useNow(60_000);
  const portfolio = useMemo(() => buildPortfolio(state, now), [state, now]);
  const insights = useMemo(
    () => [...buildInsights(state, portfolio, now), ...brainInsights(state, now)].slice(0, 6),
    [state, portfolio, now],
  );
  const [editor, setEditor] = useState<Editor>(null);
  const [confirmDelete, setConfirmDelete] = useState<Area | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [color, setColor] = useState<AreaColor>('gold');
  const [intent, setIntent] = useState(4);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === 'new') {
      setTitle('');
      setEmoji('✨');
      setColor('gold');
      setIntent(4);
    } else {
      setTitle(editor.area.title);
      setEmoji(editor.area.emoji);
      setColor(editor.area.color);
      setIntent(editor.area.intent);
    }
    setError('');
  }, [editor]);

  const totalAttention = portfolio.areas.reduce((sum, stat) => sum + stat.attentionShare, 0) || 1;
  let cursor = 0;
  const stops = portfolio.areas
    .map((stat) => {
      const start = (cursor / totalAttention) * 360;
      cursor += stat.attentionShare;
      const end = (cursor / totalAttention) * 360;
      return `${AREA_HEX[stat.area.color]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    })
    .join(', ');

  const maxAttention = Math.max(...portfolio.areas.map((s) => s.attentionShare), 0.01);
  const maxIntent = Math.max(...portfolio.areas.map((s) => s.intentShare), 0.01);
  const totalActive = state.tasks.filter((t) => t.status === 'active').length;
  const mostGap = [...portfolio.areas].sort(
    (a, b) => b.intentShare - b.attentionShare - (a.intentShare - a.attentionShare),
  )[0];

  const submit = () => {
    if (!title.trim()) {
      setError('یک نام کوتاه برای حوزه بنویس.');
      return;
    }
    if (editor?.mode === 'edit') {
      dispatch({
        type: 'updateArea',
        id: editor.area.id,
        patch: { title: title.trim(), emoji, color, intent },
      });
      toast('حوزه به‌روز شد.', { tone: 'success' });
    } else {
      const area = createArea({ title: title.trim(), emoji, color }, intent, new Date().toISOString());
      dispatch({ type: 'addArea', area });
      toast(`حوزهٔ «${area.title}» ساخته شد.`, { tone: 'success' });
    }
    setEditor(null);
  };

  const removeArea = (area: Area) => {
    dispatch({ type: 'deleteArea', id: area.id });
    setConfirmDelete(null);
    setEditor(null);
    toast(`حوزهٔ «${area.title}» حذف شد؛ کارهایش بدون حوزه می‌مانند.`);
  };

  return (
    <div className="screen portfolio-screen">
      <PageHeader
        eyebrow={
          <>
            <Icon name="layers" size={14} /> نیت در برابر واقعیت
          </>
        }
        title="پرتفوی زندگی"
        subtitle="حوزه‌ها سطل‌های جدا نیستند؛ سهم‌هایی از یک زندگی‌اند. اینجا می‌بینی توجهت کجا خرج می‌شود."
        actions={
          <button type="button" className="btn btn--gold btn--sm" onClick={() => setEditor({ mode: 'new' })} data-testid="add-area">
            <Icon name="plus" size={16} />
            حوزهٔ تازه
          </button>
        }
      />

      {!state.areas.length ? (
        <EmptyState
          icon="layers"
          title="زندگی‌ات را به چند حوزه تقسیم کنیم."
          body="اولین حوزه را بساز؛ بعد رهیار کمک می‌کند ببینی توجهت چطور بین آن‌ها پخش می‌شود."
          action={
            <button type="button" className="btn btn--gold" onClick={() => setEditor({ mode: 'new' })}>
              <Icon name="plus" size={17} />
              ساختن اولین حوزه
            </button>
          }
        />
      ) : (
        <>
          <section className="card portfolio-hero">
            <div className="donut-wrap">
              <div
                className="donut"
                style={{ background: `conic-gradient(${stops})` }}
                role="img"
                aria-label="نمودار سهم توجه حوزه‌ها در دو هفتهٔ اخیر"
              >
                <div className="donut-hole">
                  <strong>{faNum(portfolio.totalCompleted)}</strong>
                  <span>قدم در ۱۴ روز</span>
                </div>
              </div>
              <span className="donut-caption">سهم توجه واقعی · دو هفتهٔ اخیر</span>
            </div>

            <div className="portfolio-summary">
              <div className="portfolio-summary-top">
                <div>
                  <span className="eyebrow">الان کجای زندگی‌ات هستی؟</span>
                  <h2>توجه، جایی خرج می‌شود که قدم برمی‌داری.</h2>
                </div>
                <span className="portfolio-badge">
                  <i /> {faNum(totalActive)} کار باز
                </span>
              </div>
              <p className="portfolio-lede">
                سهم نیت تو از انتخاب حوزه‌ها می‌آید؛ سهم توجه از کارهایی که واقعاً در دو هفتهٔ اخیر
                بسته‌ای. فاصلهٔ این دو، همان جایی است که رهیار کمک می‌کند.
              </p>
              <div className="legend">
                {portfolio.areas.map((stat) => {
                  const delta = Math.round((stat.attentionShare - stat.intentShare) * 100);
                  return (
                    <div className="legend-row" key={stat.area.id}>
                      <span className="legend-name">
                        <i style={{ background: AREA_HEX[stat.area.color] }} />
                        {stat.area.title}
                      </span>
                      <span className="legend-track">
                        <i
                          style={{
                            width: `${Math.max(2, (stat.attentionShare / maxAttention) * 100)}%`,
                            background: AREA_HEX[stat.area.color],
                          }}
                        />
                      </span>
                      <span className="legend-pct">{faNum(Math.round(stat.attentionShare * 100))}٪</span>
                      <span className={`legend-delta ${delta < -2 ? 'is-down' : delta > 2 ? 'is-up' : ''}`}>
                        {delta === 0
                          ? 'هم‌تراز'
                          : `${faNum(Math.abs(delta))}٪ ${delta > 0 ? 'بیشتر' : 'کمتر'}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              {mostGap ? (
                <div className="portfolio-callout">
                  <Icon name="compass" size={16} />
                  <span>
                    بیشترین فاصلهٔ نیت و توجه: <strong>{mostGap.area.title}</strong> —{' '}
                    {faNum(Math.round(mostGap.intentShare * 100))}٪ نیت،{' '}
                    {faNum(Math.round(mostGap.attentionShare * 100))}٪ توجه.
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <div className="area-section-head">
            <SectionTitle
              title="حوزه‌ها"
              hint="اهمیت هر حوزه را خودت تعیین می‌کنی؛ رهیار فقط نشان می‌دهد."
            />
          </div>

          <div className="area-grid">
            {portfolio.areas.map((stat) => {
              const area = stat.area;
              const last =
                stat.lastActivityDays === null
                  ? 'هنوز قدمی ثبت نشده'
                  : stat.lastActivityDays === 0
                    ? 'امروز دیده شد'
                    : stat.lastActivityDays === 1
                      ? 'دیروز دیده شد'
                      : `${faNum(stat.lastActivityDays)} روز بی‌خبر`;
              return (
                <article key={area.id} className={`card area-card area-card--${area.color}`}>
                  <header className="area-card-head">
                    <span className="area-emoji" aria-hidden="true">
                      {area.emoji}
                    </span>
                    <div className="area-card-title">
                      <h3>{area.title}</h3>
                      <span>{INTENT_LABEL[area.intent] ?? 'مهم'} · {faNum(stat.active)} کار باز</span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditor({ mode: 'edit', area })}
                      aria-label={`ویرایش ${area.title}`}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                  </header>

                  {stat.dormant ? (
                    <span className="dormant-badge">
                      <Icon name="moon" size={12} />
                      {last}
                    </span>
                  ) : (
                    <span className="area-last">{last}</span>
                  )}

                  <div className="area-bars">
                    <div className="area-bar-row">
                      <span>نیت</span>
                      <span className="area-bar">
                        <i
                          className="intent"
                          style={{ width: `${Math.max(4, (stat.intentShare / maxIntent) * 100)}%` }}
                        />
                      </span>
                      <span>{faNum(Math.round(stat.intentShare * 100))}٪</span>
                    </div>
                    <div className="area-bar-row">
                      <span>توجه</span>
                      <span className="area-bar">
                        <i
                          className="attention"
                          style={{
                            width: `${Math.max(4, (stat.attentionShare / maxAttention) * 100)}%`,
                            background: AREA_HEX[area.color],
                          }}
                        />
                      </span>
                      <span>{faNum(Math.round(stat.attentionShare * 100))}٪</span>
                    </div>
                  </div>

                  <div className="area-card-stats">
                    <span>
                      <strong>{faNum(stat.completed)}</strong>
                      <small>قدم ۱۴ روز</small>
                    </span>
                    <span>
                      <strong className={stat.overdue ? 'is-warn' : ''}>{faNum(stat.overdue)}</strong>
                      <small>عقب‌افتاده</small>
                    </span>
                    <span>
                      <strong>{faNum(stat.active)}</strong>
                      <small>روی میز</small>
                    </span>
                  </div>

                  <div className="area-card-actions">
                    <button
                      type="button"
                      className="btn btn--soft btn--sm grow"
                      onClick={() => openAddTask({ areaId: area.id })}
                    >
                      <Icon name="plus" size={14} />
                      کار تازه
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditor({ mode: 'edit', area })}
                      aria-label={`تنظیمات ${area.title}`}
                    >
                      <Icon name="sliders" size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {insights.length ? (
            <section className="insights">
              <SectionTitle title="بینش‌های رفتاری" hint="از الگوی تکمیل، تعویق و توجه تو" />
              <div className="insight-grid">
                {insights.map((insight) => (
                  <article key={insight.id} className={`card insight-card insight-${insight.tone}`}>
                    <span className="insight-icon">
                      <Icon name={INSIGHT_ICON[insight.id] ?? 'sparkles'} size={19} />
                    </span>
                    <h3>{insight.title}</h3>
                    <p>{insight.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="insights">
              <SectionTitle title="بینش‌های رفتاری" hint="از الگوی تکمیل، تعویق و توجه تو" />
              <div className="card insight-empty">
                <Icon name="chart" size={20} />
                <p>هنوز دادهٔ کافی برای الگوها نیست. چند کار را ببند و فردا برگرد؛ اینجا جان می‌گیرد.</p>
              </div>
            </section>
          )}

          <p className="portfolio-privacy">
            <Icon name="info" size={14} />
            اگر حوزه‌ای مدتی خاموش بماند، رهیار فقط یک یادآوری مهربان می‌دهد؛ نه هشدار قرمز، نه سرزنش.
          </p>
        </>
      )}

      <Sheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === 'edit' ? 'ویرایش حوزه' : 'حوزهٔ تازه'}
        subtitle="حوزه، یک سطل نیست؛ بخشی از زندگی است."
        size="sm"
        footer={
          <div className="row gap-8">
            <button type="button" className="btn btn--gold grow" onClick={submit}>
              {editor?.mode === 'edit' ? 'ذخیرهٔ تغییرات' : 'ساختن حوزه'}
            </button>
            {editor?.mode === 'edit' ? (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => setConfirmDelete(editor.area)}
                aria-label="حذف حوزه"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : null}
          </div>
        }
      >
        <div className="area-editor">
          <div className="field">
            <label className="field-label" htmlFor="area-title">
              نام حوزه
            </label>
            <input
              id="area-title"
              data-autofocus
              className="input input--title"
              placeholder="مثلاً: سلامتی"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError('');
              }}
              maxLength={30}
            />
            {error ? <p className="form-error">{error}</p> : null}
          </div>

          <div className="field">
            <span className="field-label">نشان</span>
            <div className="emoji-picker">
              {EMOJIS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={emoji === option ? 'is-active' : ''}
                  onClick={() => setEmoji(option)}
                  aria-label={`نشان ${option}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">رنگ</span>
            <div className="color-picker">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`area-${option} ${color === option ? 'is-active' : ''}`}
                  onClick={() => setColor(option)}
                  aria-label={`رنگ ${option}`}
                >
                  <i style={{ background: AREA_HEX[option] }} />
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <span className="field-label">اهمیت این حوزه برایت</span>
              <span className="field-hint">{INTENT_LABEL[intent]}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={intent}
              onChange={(event) => setIntent(Number(event.target.value))}
              className="range"
              aria-label="اهمیت حوزه"
            />
            <div className="range-labels">
              <span>کم</span>
              <span>متعادل</span>
              <span>اولویت اول</span>
            </div>
          </div>

          <p className="area-editor-note">
            رهیار اهمیت را با توجه واقعی مقایسه می‌کند، نه با تعداد کارها. اگر مدتی این حوزه را
            ندیدی، یک یادآوری ملایم می‌گیری.
          </p>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="این حوزه حذف شود؟"
        description={
          confirmDelete
            ? `«${confirmDelete.title}» از پرتفوی حذف می‌شود. کارها و اهدافش پاک نمی‌شوند؛ فقط بدون حوزه می‌مانند.`
            : ''
        }
        confirmLabel="حذف حوزه"
        danger
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeArea(confirmDelete)}
      />
    </div>
  );
}
