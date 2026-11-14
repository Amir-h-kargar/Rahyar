import { useState } from 'react';
import { AREA_PRESETS } from '../lib/content';
import { buildStarterState } from '../lib/seed';
import { useStore } from '../store/store';
import { BrandLockup } from '../components/Brand';
import { Icon } from '../components/Icon';

const DEFAULT_AREAS = ['کسب‌وکار', 'سلامت', 'خانواده', 'رشد'];

export function Onboarding() {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(DEFAULT_AREAS);
  const [demo, setDemo] = useState(true);

  const toggleArea = (title: string) => {
    setSelected((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const start = () => {
    const next = buildStarterState({
      name,
      areaTitles: selected,
      demo,
    });
    dispatch({ type: 'replaceState', state: next });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-aurora" aria-hidden="true">
        <i className="orb orb-gold" />
        <i className="orb orb-mint" />
        <i className="orb orb-violet" />
      </div>

      <header className="onboarding-top">
        <BrandLockup />
        <span className="onboarding-kicker">Life Execution OS · 2026</span>
      </header>

      <main className="onboarding-main">
        <section className="onboarding-story">
          <span className="pill pill--gold">
            <Icon name="sparkles" size={14} />
            مشاور خصوصی زندگی
          </span>
          <h1>
            هر روز، فقط
            <br />
            <em>یک قدم روشن.</em>
          </h1>
          <p className="onboarding-lede">
            رهیار فهرست کارهایت را بزرگ‌تر نمی‌کند؛ تصمیم می‌گیرد حرکت بعدی‌ات چه باشد و نشان می‌دهد آیا
            زمان و توجهت، همان زندگی‌ای را می‌سازد که برایش هدف گذاشته‌ای.
          </p>
          <ul className="onboarding-points">
            <li>
              <span className="point-icon">
                <Icon name="compass" size={18} />
              </span>
              <div>
                <strong>پیشنهاد «الان»</strong>
                <small>بهترین اقدام بعدی، با توجه به انرژی و موعدها.</small>
              </div>
            </li>
            <li>
              <span className="point-icon">
                <Icon name="layers" size={18} />
              </span>
              <div>
                <strong>پرتفوی زندگی</strong>
                <small>نیت تو در برابر توجه واقعی‌ات، در یک نگاه.</small>
              </div>
            </li>
            <li>
              <span className="point-icon">
                <Icon name="heart" size={18} />
              </span>
              <div>
                <strong>همراهی بدون سرزنش</strong>
                <small>حتی بعد از روزهای دور بودن، از یک قدم کوچک شروع می‌کنیم.</small>
              </div>
            </li>
          </ul>
        </section>

        <section className="onboarding-card">
          <div className="onboarding-card-head">
            <span className="eyebrow">شروع آرام</span>
            <h2>به مسیرت خوش آمدی.</h2>
            <p>هیچ فیلدی اجباری نیست. همین حالا هم می‌توانی وارد شوی.</p>
          </div>

          <form
            className="onboarding-form"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <div className="field">
              <label className="field-label" htmlFor="onboarding-name">
                اسمت چیه؟ <span className="optional">اختیاری</span>
              </label>
              <input
                id="onboarding-name"
                data-autofocus
                className="input input--title"
                placeholder="مثلاً آرش"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
              />
            </div>

            <div className="field">
              <div className="field-label-row">
                <span className="field-label">
                  کدام حوزه‌ها برایت مهم‌ترند؟ <span className="optional">اختیاری</span>
                </span>
                <span className="field-hint">{selected.length.toLocaleString('fa-IR')} انتخاب</span>
              </div>
              <div className="onboarding-areas">
                {AREA_PRESETS.map((area) => {
                  const active = selected.includes(area.title);
                  return (
                    <button
                      key={area.title}
                      type="button"
                      className={`area-choice area-${area.color} ${active ? 'is-active' : ''}`}
                      onClick={() => toggleArea(area.title)}
                      aria-pressed={active}
                    >
                      <span className="area-choice-emoji" aria-hidden="true">
                        {area.emoji}
                      </span>
                      <span>{area.title}</span>
                      {active ? (
                        <span className="area-choice-check" aria-hidden="true">
                          <Icon name="check" size={12} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="field-hint">بعداً می‌توانی حوزه اضافه کنی یا اهمیت هر کدام را تغییر دهی.</p>
            </div>

            <label className="demo-toggle">
              <span className="demo-toggle-copy">
                <strong>با یک برنامهٔ نمونه شروع کن</strong>
                <small>۹ کار، ۴ هدف، ۴ آیین و ۲ تصمیم، برای اینکه همه چیز را ببینی.</small>
              </span>
              <input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} />
              <i className="switch" aria-hidden="true" />
            </label>

            <button type="submit" className="btn btn--gold btn--hero" data-testid="onboarding-start">
              شروع می‌کنم
              <Icon name="arrow-left" size={18} />
            </button>

            <p className="onboarding-privacy">
              <Icon name="lock" size={13} />
              همهٔ داده‌ها روی همین دستگاه می‌مانند. هر وقت خواستی پاکشان کن.
            </p>
          </form>
        </section>
      </main>

      <footer className="onboarding-foot">
        <span>رهیار — یاورِ مسیر.</span>
        <span>همراهِ دم‌به‌دقیقهٔ تصمیم و اجرا.</span>
      </footer>
    </div>
  );
}
