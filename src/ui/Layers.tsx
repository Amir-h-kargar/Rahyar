import { useEffect, useMemo } from 'react';
import { useUi } from '../ui/ui';
import { useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { rankedTasks } from '../lib/engine';

export function ToastViewport() {
  const { toasts, dismissToast } = useUi();
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast-text">{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="بستن پیام"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function RewardCard() {
  const { state, recovery } = useStore();
  const { reward, clearReward } = useUi();

  useEffect(() => {
    if (!reward) return;
    const timer = window.setTimeout(() => clearReward(), 12_000);
    return () => window.clearTimeout(timer);
  }, [reward, clearReward]);

  const next = useMemo(() => {
    if (!reward) return null;
    const ranked = rankedTasks({
      energy: state.settings.energy,
      areas: state.areas,
      tasks: state.tasks,
      goals: state.goals,
      rituals: state.rituals,
      focusAreaId: state.settings.focusAreaId,
      deepWorkUntil: state.settings.deepWorkUntil,
      recovery,
    });
    return ranked[0]?.task ?? null;
  }, [reward, state, recovery]);

  if (!reward) return null;

  return (
    <div className="reward-layer">
      <div className="reward-card" role="status" aria-live="polite" data-testid="reward-card">
        <div className="reward-top">
          <div className="reward-seal" aria-hidden="true">
            <span>{reward.emoji}</span>
            <i className="reward-pulse" />
          </div>
          <div className="reward-copy">
            <span className="reward-eyebrow">
              <Icon name="sparkles" size={14} />
              انجام شد
            </span>
            <h3>{reward.title}</h3>
            <p>{reward.message}</p>
          </div>
          <button type="button" className="icon-btn reward-close" onClick={clearReward} aria-label="بستن">
            <Icon name="close" size={16} />
          </button>
        </div>

        {next ? (
          <div className="reward-next">
            <span className="reward-next-label">قدم بعدی</span>
            <span className="reward-next-title">{next.title}</span>
            <span className="reward-next-meta">همین حالا روی صفحهٔ «الان» آماده است</span>
          </div>
        ) : (
          <div className="reward-next">
            <span className="reward-next-label">تمام شد</span>
            <span className="reward-next-title">چیزی روی میزت نمانده. این لحظه مال خودت است.</span>
          </div>
        )}

        <div className="reward-actions">
          <button type="button" className="btn btn--gold btn--sm" onClick={clearReward}>
            ادامه
          </button>
          {reward.undo ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={reward.undo}>
              بازگردان
            </button>
          ) : null}
        </div>
        <div className="reward-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}
