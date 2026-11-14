import { useEffect, useMemo, useRef, useState } from 'react';
import type { Energy } from '../types';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { EnergyPicker } from './bits';
import { addDaysToKey, faNum, todayKey, weekdayIndex } from '../lib/date';
import { useSpeechInput } from '../hooks/useSpeech';

function weekendKey(today: string): string {
  const idx = weekdayIndex(today);
  if (idx === 5) return today;
  const delta = (5 - idx + 7) % 7;
  return addDaysToKey(today, delta);
}

export function AddTaskSheet() {
  const { state } = useStore();
  const { addOpen, addPreset, closeAddTask, addTask, toast } = useUi();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [energy, setEnergy] = useState<Energy>('medium');
  const [due, setDue] = useState<string | null>(null);
  const [estimate, setEstimate] = useState('');
  const [deep, setDeep] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const baseTitle = useRef('');
  const today = todayKey();
  const speech = useSpeechInput();

  useEffect(() => {
    if (addOpen) return;
    speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen]);

  useEffect(() => {
    if (!addOpen) return;
    setTitle(addPreset?.title ?? '');
    setNote('');
    setAreaId(addPreset?.areaId ?? state.settings.focusAreaId ?? null);
    setEnergy(state.settings.energy);
    setDue(addPreset?.due ?? null);
    setEstimate('');
    setDeep(false);
    setGoalId(addPreset?.goalId ?? null);
    setMore(false);
    setError('');
    baseTitle.current = addPreset?.title ?? '';
    speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen, addPreset]);

  const activeGoals = useMemo(
    () => state.goals.filter((g) => g.status === 'active'),
    [state.goals],
  );

  const submit = () => {
    if (!title.trim()) {
      setError('یک عنوان کوتاه بنویس؛ همین کافی است.');
      return;
    }
    const minutes = Number(estimate);
    addTask({
      title,
      note,
      areaId,
      energy,
      due,
      estimateMin: Number.isFinite(minutes) && minutes > 0 ? Math.min(480, Math.round(minutes)) : null,
      deep,
      goalId,
    });
    closeAddTask();
  };

  const startVoice = () => {
    baseTitle.current = title.trim();
    const ok = speech.start(
      (text) => {
        setTitle(baseTitle.current ? `${baseTitle.current} ${text}` : text);
        setError('');
      },
      (message) => toast(message, { tone: 'default' }),
    );
    if (!ok) {
      // toast already shown by hook callback
    }
  };

  return (
    <Sheet
      open={addOpen}
      onClose={closeAddTask}
      title="یک قدم تازه"
      subtitle="فقط عنوان لازم است؛ بقیه اختیاری."
      size="md"
      footer={
        <div className="row gap-8 add-footer">
          <button type="button" className="btn btn--gold grow" onClick={submit} data-testid="add-submit">
            <Icon name="plus" size={17} />
            افزودن به برنامه
          </button>
          <button type="button" className="btn btn--ghost" onClick={closeAddTask}>
            بستن
          </button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="add-form"
      >
        <div className={`input-voice ${speech.listening ? 'is-listening' : ''}`}>
          <input
            data-autofocus
            className="input input--title"
            placeholder="مثلاً: نوشتن پیش‌نویس پیشنهاد"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            maxLength={120}
            aria-label="عنوان کار"
            data-testid="add-title"
          />
          <button
            type="button"
            className={`mic-btn ${speech.listening ? 'is-listening' : ''}`}
            onClick={startVoice}
            aria-label={speech.listening ? 'توقف ضبط' : 'ثبت با صدا'}
            title={speech.supported ? 'ثبت با صدا' : 'ورود صوتی در این مرورگر پشتیبانی نمی‌شود'}
          >
            <Icon name="mic" size={18} />
            {speech.listening ? <span className="mic-wave" aria-hidden="true" /> : null}
          </button>
        </div>
        {speech.listening ? (
          <p className="voice-hint">
            <span className="live-dot" /> گوش می‌دهم... حرف بزن.
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}

        <div className="field">
          <label className="field-label">حوزه</label>
          <div className="chips-row">
            <button
              type="button"
              className={`choice-chip ${areaId === null ? 'is-active' : ''}`}
              onClick={() => setAreaId(null)}
            >
              بدون حوزه
            </button>
            {state.areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className={`choice-chip area-${area.color} ${areaId === area.id ? 'is-active' : ''}`}
                onClick={() => setAreaId(area.id)}
              >
                <span aria-hidden="true">{area.emoji}</span>
                {area.title}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">موعد</label>
          <div className="chips-row">
            <button
              type="button"
              className={`choice-chip ${due === null ? 'is-active' : ''}`}
              onClick={() => setDue(null)}
            >
              بدون موعد
            </button>
            <button
              type="button"
              className={`choice-chip ${due === today ? 'is-active' : ''}`}
              onClick={() => setDue(today)}
            >
              امروز
            </button>
            <button
              type="button"
              className={`choice-chip ${due === addDaysToKey(today, 1) ? 'is-active' : ''}`}
              onClick={() => setDue(addDaysToKey(today, 1))}
            >
              فردا
            </button>
            <button
              type="button"
              className={`choice-chip ${due === weekendKey(today) ? 'is-active' : ''}`}
              onClick={() => setDue(weekendKey(today))}
            >
              آخر هفته
            </button>
            <label className="date-chip">
              <Icon name="calendar" size={14} />
              <span>تاریخ</span>
              <input
                type="date"
                value={due ?? ''}
                onChange={(event) => setDue(event.target.value || null)}
                aria-label="انتخاب تاریخ موعد"
              />
            </label>
          </div>
        </div>

        <div className="field">
          <label className="field-label">انرژی لازم</label>
          <EnergyPicker value={energy} onChange={setEnergy} label="انرژی لازم برای این کار" />
        </div>

        <button
          type="button"
          className={`more-toggle ${more ? 'is-open' : ''}`}
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
        >
          <Icon name="sliders" size={16} />
          جزئیات بیشتر
          <Icon name="chevron-down" size={15} className="more-chevron" />
        </button>

        {more ? (
          <div className="more-fields">
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="estimate">
                  زمان تقریبی (دقیقه)
                </label>
                <input
                  id="estimate"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={480}
                  placeholder="مثلاً ۴۵"
                  value={estimate}
                  onChange={(event) => setEstimate(event.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="goal">
                  متصل به هدف
                </label>
                <select
                  id="goal"
                  className="input select"
                  value={goalId ?? ''}
                  onChange={(event) => setGoalId(event.target.value || null)}
                >
                  <option value="">بدون هدف</option>
                  {activeGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="switch-row">
              <span>
                <strong>تمرکز عمیق</strong>
                <small>در بلوک تمرکز، این کار جلو می‌افتد.</small>
              </span>
              <input
                type="checkbox"
                checked={deep}
                onChange={(event) => setDeep(event.target.checked)}
              />
              <i className="switch" aria-hidden="true" />
            </label>

            <div className="field">
              <label className="field-label" htmlFor="note">
                یادداشت (اختیاری)
              </label>
              <textarea
                id="note"
                className="input textarea"
                rows={3}
                placeholder="یک جمله برای آیندهٔ خودت..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={600}
              />
            </div>
            <p className="field-hint">
              {estimate && Number(estimate) > 0
                ? `حدود ${faNum(Math.round(Number(estimate)))} دقیقه؛ ${
                    Number(estimate) <= 15 ? 'یک قدم کوچک و سریع.' : 'کمی وقت می‌برد، اما ارزشش را دارد.'
                  }`
                : 'زمان تقریبی به رهیار کمک می‌کند قدم‌های سبک را بهتر بشناسد.'}
            </p>
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
