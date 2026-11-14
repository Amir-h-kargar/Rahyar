import { useEffect, useState } from 'react';
import type { TabId } from './types';
import { useStore } from './store/store';
import { useUi } from './ui/ui';
import { useNow } from './hooks/useSpeech';
import { formatFullDate, formatTime, todayKey } from './lib/date';
import { BrandLockup } from './components/Brand';
import { Icon, type IconName } from './components/Icon';
import { Onboarding } from './screens/Onboarding';
import { NowScreen } from './screens/Now';
import { AdvisorScreen } from './screens/Advisor';
import { PortfolioScreen } from './screens/Portfolio';
import { PlanScreen } from './screens/Plan';
import { ReviewScreen } from './screens/Review';
import { AddTaskSheet } from './components/AddTaskSheet';
import { DelegateSheet } from './components/DelegateSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { RewardCard, ToastViewport } from './ui/Layers';

const TABS: { id: TabId; label: string; icon: IconName; caption: string }[] = [
  { id: 'now', label: 'الان', icon: 'compass', caption: 'پیشنهاد همین لحظه' },
  { id: 'advisor', label: 'مشاور', icon: 'sparkles', caption: 'دستورهای کوتاه' },
  { id: 'portfolio', label: 'پرتفوی', icon: 'layers', caption: 'تعادل زندگی' },
  { id: 'plan', label: 'برنامه', icon: 'calendar', caption: 'کارها و اهداف' },
  { id: 'review', label: 'مرور', icon: 'moon', caption: 'بستن روز' },
];

const VALID_TABS = new Set<TabId>(TABS.map((t) => t.id));

function readTab(): TabId {
  const raw = window.location.hash.replace(/^#\/?/, '') as TabId;
  return VALID_TABS.has(raw) ? raw : 'now';
}

function Screen({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'now':
      return <NowScreen />;
    case 'advisor':
      return <AdvisorScreen />;
    case 'portfolio':
      return <PortfolioScreen />;
    case 'plan':
      return <PlanScreen />;
    case 'review':
      return <ReviewScreen />;
    default:
      return <NowScreen />;
  }
}

export function App() {
  const { state } = useStore();
  const { openAddTask, openSettings } = useUi();
  const [tab, setTab] = useState<TabId>(() => readTab());
  const now = useNow(30_000);
  const today = todayKey(now);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!state.onboarded) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab, state.onboarded]);

  if (!state.onboarded) {
    return (
      <>
        <Onboarding />
        <ToastViewport />
      </>
    );
  }

  const go = (id: TabId) => {
    if (id === tab) return;
    setTab(id);
    if (window.location.hash !== `#${id}`) {
      window.location.hash = id;
    }
  };

  const reviewedToday = state.reviews.some((r) => r.date === today);
  const showFab = tab === 'now' || tab === 'plan';

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true">
        <i className="ambient-orb ambient-orb--gold" />
        <i className="ambient-orb ambient-orb--mint" />
        <i className="ambient-orb ambient-orb--violet" />
        <i className="ambient-grain" />
      </div>

      <aside className="rail">
        <BrandLockup />
        <nav className="rail-nav" aria-label="بخش‌های رهیار">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rail-item ${tab === item.id ? 'is-active' : ''}`}
              onClick={() => go(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              data-testid={`rail-${item.id}`}
            >
              <span className="rail-icon">
                <Icon name={item.icon} size={20} />
                {item.id === 'review' && !reviewedToday ? <i className="nav-dot" /> : null}
              </span>
              <span className="rail-item-copy">
                <strong>{item.label}</strong>
                <small>{item.caption}</small>
              </span>
              <span className="rail-active-bar" aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="rail-date">
            <span>{formatFullDate(today)}</span>
            <small>{formatTime(now)}</small>
          </div>
          <button type="button" className="rail-settings" onClick={openSettings}>
            <Icon name="sliders" size={18} />
            تنظیمات
          </button>
          <p className="rail-motto">«این اپ را باز نمی‌کنم که بشمارم؛ باز می‌کنم که بدانم الان چه چیزی ارزشمندترین حرکت است.»</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <BrandLockup compact />
          <div className="topbar-actions">
            {showFab ? (
              <button
                type="button"
                className="icon-btn icon-btn--gold"
                onClick={() => openAddTask()}
                aria-label="افزودن کار"
              >
                <Icon name="plus" size={19} />
              </button>
            ) : null}
            <button type="button" className="icon-btn" onClick={openSettings} aria-label="تنظیمات">
              <Icon name="sliders" size={18} />
            </button>
          </div>
        </header>

        <main className="main" id="main">
          <div className="screen-wrap" key={tab}>
            <Screen tab={tab} />
          </div>
        </main>
      </div>

      <nav className="dock" aria-label="ناوبری اصلی">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`dock-item ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => go(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            data-testid={`nav-${item.id}`}
          >
            <span className="dock-icon">
              <Icon name={item.icon} size={21} />
              {item.id === 'review' && !reviewedToday ? <i className="nav-dot" /> : null}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <AddTaskSheet />
      <DelegateSheet />
      <SettingsSheet />
      <RewardCard />
      <ToastViewport />
    </div>
  );
}
