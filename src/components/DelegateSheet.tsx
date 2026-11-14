import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { buildBrief } from '../lib/content';
import { copyText } from '../lib/clipboard';
import { todayKey, formatFullDate, dueLabel } from '../lib/date';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

export function DelegateSheet() {
  const { state } = useStore();
  const { delegateId, closeDelegate, delegateTask, toast } = useUi();
  const task = state.tasks.find((t) => t.id === delegateId) ?? null;
  const area = task ? state.areas.find((a) => a.id === task.areaId) : undefined;
  const [to, setTo] = useState('');
  const [brief, setBrief] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!task) return;
    setTo('');
    setError('');
    setBrief(
      buildBrief({
        task,
        area,
        to: '',
        from: state.profile.name,
        today: todayKey(),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegateId]);

  const preview = useMemo(
    () =>
      task
        ? buildBrief({
            task,
            area,
            to,
            from: state.profile.name,
            today: todayKey(),
          })
        : '',
    [task, area, to, state.profile.name],
  );

  if (!task) return null;

  const confirm = () => {
    if (!to.trim()) {
      setError('نام فرد یا تیم را بنویس تا بریف برایش آماده شود.');
      return;
    }
    delegateTask(task.id, to.trim(), brief.trim());
  };

  return (
    <Sheet
      open={Boolean(delegateId)}
      onClose={closeDelegate}
      title="واگذاری با بریف آماده"
      subtitle="رهیار بریف اولیه را می‌سازد؛ با حداقل ویرایش بفرست."
      size="lg"
      footer={
        <div className="row gap-8 add-footer">
          <button type="button" className="btn btn--gold grow" onClick={confirm}>
            <Icon name="send" size={16} />
            ثبت واگذاری
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => {
              const ok = await copyText(brief);
              toast(ok ? 'بریف کپی شد.' : 'کپی نشد؛ متن را دستی انتخاب کن.', {
                tone: ok ? 'success' : 'default',
              });
            }}
          >
            <Icon name="copy" size={16} />
            کپی
          </button>
        </div>
      }
    >
      <div className="delegate-body">
        <div className="delegate-task">
          <span className="delegate-label">کار</span>
          <strong>{task.title}</strong>
          <div className="delegate-meta">
            {area ? (
              <span>
                {area.emoji} {area.title}
              </span>
            ) : null}
            <span>
              موعد: {task.due ? `${formatFullDate(task.due)} (${dueLabel(task.due, todayKey()).label})` : 'بدون موعد'}
            </span>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delegate-to">
            به چه کسی یا تیمی؟
          </label>
          <input
            id="delegate-to"
            data-autofocus
            className="input"
            placeholder="مثلاً: سارا از تیم محصول"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setError('');
            }}
            maxLength={60}
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label className="field-label" htmlFor="brief">
              بریف
            </label>
            <button
              type="button"
              className="link-btn"
              onClick={() => setBrief(preview)}
              title="بریف را با نام گیرنده بازسازی کن"
            >
              <Icon name="rotate" size={13} />
              بازسازی
            </button>
          </div>
          <textarea
            id="brief"
            className="input textarea brief-textarea"
            rows={13}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
          />
          <p className="field-hint">می‌توانی قبل از ثبت، جمله‌ها را به لحن خودت نزدیک کنی.</p>
        </div>
      </div>
    </Sheet>
  );
}
