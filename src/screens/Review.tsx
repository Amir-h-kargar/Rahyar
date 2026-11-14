import { useMemo, useState } from 'react';
import type { Energy, Review } from '../types';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { useNow } from '../hooks/useSpeech';
import { todayCompleted } from '../lib/engine';
import {
  addDaysToKey,
  dateKey,
  faNum,
  formatFullDate,
  todayKey,
} from '../lib/date';
import { tomorrowNotePrompt as notePrompt } from '../lib/content';
import { uid } from '../lib/id';
import { Icon } from '../components/Icon';
import { EnergyPicker, PageHeader, SectionTitle } from '../components/bits';

export function ReviewScreen() {
  const { state, dispatch } = useStore();
  const { toast } = useUi();
  const now = useNow(60_000);
  const today = todayKey(now);
  const tomorrow = addDaysToKey(today, 1);
  const done = todayCompleted(state, now);
  const existing = state.reviews.find((r) => r.date === today);
  const [energy, setEnergy] = useState<Energy>(existing?.energy ?? state.settings.energy);
  const [note, setNote] = useState(existing?.note ?? '');
  const [saved, setSaved] = useState(Boolean(existing));

  const tomorrowTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.status === 'active' && t.due === tomorrow)
        .sort((a, b) => {
          const ar = a.energy === 'high' ? 0 : a.energy === 'medium' ? 1 : 2;
          const br = b.energy === 'high' ? 0 : b.energy === 'medium' ? 1 : 2;
          return ar - br;
        }),
    [state.tasks, tomorrow],
  );

  const history = useMemo(
    () =>
      [...state.reviews]
        .filter((r) => r.date !== today)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6),
    [state.reviews, today],
  );

  const weekCount = useMemo(() => {
    const from = addDaysToKey(today, -6);
    return state.tasks.filter((t) => {
      if (t.status !== 'done' || !t.completedAt) return false;
      const key = dateKey(new Date(t.completedAt));
      return key >= from && key <= today;
    }).length;
  }, [state.tasks, today]);

  const doneTitles = [
    ...done.tasks.map((t) => t.title),
    ...done.rituals.filter((r) => r.done).map((r) => r.ritual.title),
  ];

  const save = () => {
    const review: Review = {
      id: existing?.id ?? uid('review'),
      date: today,
      moved: done.count,
      energy,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'saveReview', review, energy });
    setSaved(true);
    toast(existing ? 'مرور امروز به‌روز شد.' : 'امروز بسته شد. خسته نباشی.', { tone: 'success' });
  };

  return (
    <div className="screen review-screen">
      <PageHeader
        eyebrow={
          <>
            <Icon name="moon" size={14} /> زیر یک دقیقه
          </>
        }
        title="مرور پایان روز"
        subtitle={formatFullDate(today, true)}
        actions={
          saved ? (
            <span className="saved-badge">
              <Icon name="check" size={14} />
              ثبت شد
            </span>
          ) : (
            <span className="unsaved-badge">مرور نشده</span>
          )
        }
      />

      <div className="review-grid">
        <section className="card review-main">
          <div className="review-count">
            <span className="review-count-number">{faNum(done.count)}</span>
            <div className="review-count-copy">
              <strong>قدم امروز</strong>
              <p>
                {done.count === 0
                  ? 'امروز هنوز قدمی ثبت نشده. این نه شکست است، نه عقب‌افتادگی؛ فقط هنوز شروع نکرده‌ای.'
                  : done.count >= 5
                    ? 'روز پرمعنایی بود. حالا وقت بستنش است، نه شروع کار تازه.'
                    : 'هر کدام از این قدم‌ها، مسیر را زنده نگه داشته.'}
              </p>
            </div>
            {weekCount > 0 ? (
              <span className="review-week">
                <strong>{faNum(weekCount)}</strong>
                <small>قدم در ۷ روز</small>
              </span>
            ) : null}
          </div>

          {doneTitles.length ? (
            <div className="done-chips">
              {doneTitles.slice(0, 8).map((title, index) => (
                <span key={`${title}-${index}`} className="done-chip">
                  <Icon name="check" size={12} />
                  {title}
                </span>
              ))}
              {doneTitles.length > 8 ? (
                <span className="done-chip done-chip--more">+{faNum(doneTitles.length - 8)}</span>
              ) : null}
            </div>
          ) : (
            <div className="review-empty-line">
              <Icon name="sparkles" size={16} />
              اگر امروز کاری نکردی، همین که اینجا هستی کافی است. فردا از یک قدم کوچک شروع می‌کنیم.
            </div>
          )}

          <div className="review-divider" />

          <div className="field">
            <span className="field-label">انرژی امروزت چطور بود؟</span>
            <EnergyPicker value={energy} onChange={setEnergy} label="انرژی امروز" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="review-note">
              یک جمله برای فردا
            </label>
            <textarea
              id="review-note"
              className="input textarea review-note"
              rows={3}
              placeholder="فردا، اول چه کاری را انجام دهم؟"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
            />
            <p className="field-hint">{notePrompt(state.profile.name)}</p>
          </div>

          <button type="button" className="btn btn--gold review-save" onClick={save} data-testid="review-save">
            <Icon name="check" size={18} />
            {existing ? 'ذخیرهٔ تغییرات مرور' : 'بستن امروز'}
          </button>

          {saved ? (
            <p className="review-saved-note">
              <Icon name="check" size={14} />
              مرور ثبت شد. فردا صبح همین جمله را یادت می‌آورم.
            </p>
          ) : null}
        </section>

        <aside className="review-side">
          <section className="card tomorrow-card">
            <SectionTitle title="فردا" hint={tomorrowTasks.length ? 'از قبل روشن است' : 'آزاد و سبک'} />
            {tomorrowTasks.length ? (
              <ul className="tomorrow-list">
                {tomorrowTasks.slice(0, 4).map((task) => {
                  const area = state.areas.find((a) => a.id === task.areaId);
                  return (
                    <li key={task.id}>
                      <span className={`tomorrow-dot area-${area?.color ?? 'gold'}`} />
                      <div>
                        <span>{task.title}</span>
                        <small>
                          {area ? area.title : 'بدون حوزه'}
                          {task.estimateMin ? ` · ${faNum(task.estimateMin)} دقیقه` : ''}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="tomorrow-empty">
                برای فردا کار مشخصی نداری. می‌توانی یک قدم کوچک اضافه کنی یا آزادی‌اش را جشن بگیری.
              </p>
            )}
            <a className="link-btn" href="#plan">
              دیدن برنامهٔ کامل
              <Icon name="chevron-left" size={14} />
            </a>
          </section>

          <section className="card review-quote">
            <Icon name="sparkles" size={18} />
            <p>
              «لازم نیست امروز را کامل کنی؛ فقط کافی است ببینی چه چیزی جلو رفت. فردا از همان‌جا
              ادامه می‌دهیم.»
            </p>
            <span>رهیار</span>
          </section>

          <section className="card review-tips">
            <h3>مرور خوب، مرور کوتاه است</h3>
            <ul>
              <li>فقط یک جمله برای فردا؛ نه یک لیست.</li>
              <li>انرژی را صادقانه انتخاب کن؛ پیشنهاد فردا بر همان اساس است.</li>
              <li>اگر روز سختی بود، همین ثبت کافی است.</li>
            </ul>
          </section>
        </aside>
      </div>

      {history.length ? (
        <section className="review-history">
          <SectionTitle title="مرورهای گذشته" hint="بدون قضاوت، فقط برای دیدن الگو" />
          <div className="history-list">
            {history.map((review) => (
              <article key={review.id} className="card history-row">
                <span className="history-date">{formatFullDate(review.date)}</span>
                <span className="history-moved">
                  <strong>{faNum(review.moved)}</strong> قدم
                </span>
                <span className={`history-energy energy-text energy-${review.energy}`}>
                  {review.energy === 'high' ? 'انرژی بالا' : review.energy === 'medium' ? 'انرژی متوسط' : 'انرژی کم'}
                </span>
                <p>{review.note || '—'}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
