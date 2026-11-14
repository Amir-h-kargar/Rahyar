import { useEffect, useMemo, useState } from 'react';
import type { Energy, Goal, Milestone, Ritual, Task } from '../types';
import { useStore, createDecision, createGoal, initialRitualDue } from '../store/store';
import { useUi } from '../ui/ui';
import { useNow } from '../hooks/useSpeech';
import {
  dateKey,
  dueLabel,
  faNum,
  formatFullDate,
  formatTime,
  minutesLabel,
  todayKey,
} from '../lib/date';
import { ENERGY_LABEL } from '../lib/content';
import { uid } from '../lib/id';
import { copyText } from '../lib/clipboard';
import { Icon } from '../components/Icon';
import {
  AreaBadge,
  EmptyState,
  EnergyPicker,
  PageHeader,
  Segmented,
} from '../components/bits';
import { Sheet, ConfirmDialog } from '../components/Sheet';
import { DateField } from '../components/DateField';

type PlanTab = 'tasks' | 'goals' | 'rituals' | 'journal';
type TaskFilter = 'active' | 'today' | 'overdue' | 'delegated' | 'done' | 'archived';

const TASK_FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'active', label: 'فعال' },
  { id: 'today', label: 'امروز' },
  { id: 'overdue', label: 'عقب‌افتاده' },
  { id: 'delegated', label: 'واگذارشده' },
  { id: 'done', label: 'انجام‌شده' },
  { id: 'archived', label: 'بایگانی' },
];

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const CADENCE_LABEL: Record<Ritual['cadence'], string> = {
  daily: 'هر روز',
  weekly: 'هر هفته',
  monthly: 'هر ماه',
};

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => void;
  danger?: boolean;
}

export function PlanScreen() {
  const { state, dispatch } = useStore();
  const { openAddTask, toast, completeTask, completeRitual } = useUi();
  const now = useNow(60_000);
  const today = todayKey(now);
  const [tab, setTab] = useState<PlanTab>('tasks');
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [goalEditor, setGoalEditor] = useState<{ mode: 'new' } | { mode: 'edit'; goal: Goal } | null>(null);
  const [ritualEditor, setRitualEditor] = useState<{ mode: 'new' } | { mode: 'edit'; ritual: Ritual } | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const editingTask = state.tasks.find((t) => t.id === editingTaskId) ?? null;

  const activeCount = state.tasks.filter((t) => t.status === 'active').length;
  const todayCount = state.tasks.filter((t) => t.status === 'active' && t.due === today).length;
  const overdueCount = state.tasks.filter(
    (t) => t.status === 'active' && t.due !== null && t.due < today,
  ).length;
  const delegatedCount = state.tasks.filter((t) => t.status === 'delegated').length;
  const doneCount = state.tasks.filter((t) => t.status === 'done').length;
  const archivedCount = state.tasks.filter((t) => t.status === 'archived').length;

  const filterCount: Record<TaskFilter, number> = {
    active: activeCount,
    today: todayCount,
    overdue: overdueCount,
    delegated: delegatedCount,
    done: doneCount,
    archived: archivedCount,
  };

  const visibleTasks = useMemo(() => {
    const list = state.tasks.filter((task) => {
      switch (filter) {
        case 'active':
          return task.status === 'active';
        case 'today':
          return task.status === 'active' && task.due === today;
        case 'overdue':
          return task.status === 'active' && task.due !== null && task.due < today;
        case 'delegated':
          return task.status === 'delegated';
        case 'done':
          return task.status === 'done';
        case 'archived':
          return task.status === 'archived';
        default:
          return false;
      }
    });
    return [...list].sort((a, b) => {
      if (filter === 'done') {
        return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
      }
      if (filter === 'archived' || filter === 'delegated') {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      const ad = a.due ?? '9999-12-31';
      const bd = b.due ?? '9999-12-31';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [state.tasks, filter, today]);

  const activeGoals = state.goals.filter((g) => g.status === 'active');
  const archivedGoals = state.goals.filter((g) => g.status === 'archived');
  const sortedRituals = [...state.rituals].sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1));
  const decisions = [...state.decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const headerAction = () => {
    if (tab === 'tasks') {
      openAddTask();
    } else if (tab === 'goals') {
      setGoalEditor({ mode: 'new' });
    } else if (tab === 'rituals') {
      setRitualEditor({ mode: 'new' });
    } else {
      setJournalOpen(true);
    }
  };

  const actionLabel =
    tab === 'tasks' ? 'کار تازه' : tab === 'goals' ? 'هدف تازه' : tab === 'rituals' ? 'آیین تازه' : 'تصمیم تازه';

  return (
    <div className="screen plan-screen">
      <PageHeader
        eyebrow={
          <>
            <Icon name="calendar" size={14} /> همه چیز در یک جا، بدون شلوغی
          </>
        }
        title="برنامه"
        subtitle="کارها، اهداف، آیین‌ها و دفتر تصمیم‌ها؛ هر چیزی که مسیرت را نگه می‌دارد."
        actions={
          <button type="button" className="btn btn--gold btn--sm" onClick={headerAction}>
            <Icon name="plus" size={16} />
            {actionLabel}
          </button>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        ariaLabel="بخش‌های برنامه"
        className="plan-tabs"
        options={[
          { value: 'tasks', label: 'کارها', icon: 'check' },
          { value: 'goals', label: 'اهداف', icon: 'target' },
          { value: 'rituals', label: 'آیین‌ها', icon: 'repeat' },
          { value: 'journal', label: 'دفتر تصمیم', icon: 'book' },
        ]}
      />

      {tab === 'tasks' ? (
        <section className="plan-section">
          <div className="filter-chips" role="group" aria-label="فیلتر کارها">
            {TASK_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-chip ${filter === item.id ? 'is-active' : ''}`}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
                <span>{faNum(filterCount[item.id])}</span>
              </button>
            ))}
          </div>

          {visibleTasks.length ? (
            <div className="task-list card">
              {visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onOpen={() => setEditingTaskId(task.id)}
                  onComplete={() => completeTask(task.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={filter === 'done' ? 'check' : filter === 'archived' ? 'archive' : 'sparkles'}
              title={
                filter === 'active'
                  ? 'میزت خالی است.'
                  : filter === 'today'
                    ? 'امروز کار مشخصی نداری.'
                    : filter === 'overdue'
                      ? 'هیچ چیزی عقب نیفتاده.'
                      : filter === 'delegated'
                        ? 'فعلاً چیزی واگذار نکرده‌ای.'
                        : filter === 'done'
                          ? 'هنوز کاری بسته نشده.'
                          : 'بایگانی خالی است.'
              }
              body={
                filter === 'active'
                  ? 'یک قدم تازه بنویس؛ رهیار خودش آن را جای درست می‌گذارد.'
                  : filter === 'done'
                    ? 'وقتی کاری را کامل کنی، اینجا با تاریخ و حوزه‌اش می‌ماند.'
                    : undefined
              }
              action={
                filter === 'active' ? (
                  <button type="button" className="btn btn--gold" onClick={() => openAddTask()}>
                    <Icon name="plus" size={17} />
                    افزودن کار
                  </button>
                ) : undefined
              }
            />
          )}
        </section>
      ) : null}

      {tab === 'goals' ? (
        <section className="plan-section">
          {activeGoals.length ? (
            <div className="goal-grid">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setGoalEditor({ mode: 'edit', goal })}
                  onAddTask={() => openAddTask({ goalId: goal.id, areaId: goal.areaId })}
                  onToggleMilestone={(milestoneId) =>
                    dispatch({ type: 'toggleMilestone', goalId: goal.id, milestoneId })
                  }
                  onArchive={() => {
                    dispatch({ type: 'updateGoal', id: goal.id, patch: { status: 'archived' } });
                    toast('هدف به آرشیو رفت.', {
                      actionLabel: 'بازگردان',
                      onAction: () =>
                        dispatch({ type: 'updateGoal', id: goal.id, patch: { status: 'active' } }),
                    });
                  }}
                  onDelete={() =>
                    setConfirm({
                      title: 'هدف حذف شود؟',
                      description: `«${goal.title}» حذف می‌شود. کارهای متصل به آن پاک نمی‌شوند؛ فقط از هدف جدا می‌شوند.`,
                      confirmLabel: 'حذف هدف',
                      danger: true,
                      action: () => {
                        dispatch({ type: 'deleteGoal', id: goal.id });
                        toast('هدف حذف شد.');
                      },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="target"
              title="هدف، جهت می‌دهد."
              body="یک هدف بساز و کارهایت را به آن وصل کن؛ رهیار در پیشنهادها به آن نگاه می‌کند."
              action={
                <button type="button" className="btn btn--gold" onClick={() => setGoalEditor({ mode: 'new' })}>
                  <Icon name="plus" size={17} />
                  ساختن هدف
                </button>
              }
            />
          )}

          {archivedGoals.length ? (
            <div className="archived-block">
              <h3>
                <Icon name="archive" size={16} />
                اهداف آرشیوشده
              </h3>
              <div className="archived-list">
                {archivedGoals.map((goal) => (
                  <div key={goal.id} className="archived-row">
                    <span>{goal.title}</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() =>
                        dispatch({ type: 'updateGoal', id: goal.id, patch: { status: 'active' } })
                      }
                    >
                      بازگرداندن
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'rituals' ? (
        <section className="plan-section">
          <div className="ritual-intro">
            <Icon name="repeat" size={17} />
            <p>
              آیین‌ها تکرارشونده‌اند. رهیار در روز موعد، خودش آن‌ها را روی میزت می‌گذارد؛ بدون
              شمارش پیوسته و بدون سرزنش.
            </p>
          </div>
          {sortedRituals.length ? (
            <div className="ritual-list">
              {sortedRituals.map((ritual) => {
                const area = state.areas.find((a) => a.id === ritual.areaId);
                const due = dueLabel(ritual.nextDue, today);
                const isDue = ritual.nextDue <= today;
                const doneToday = ritual.log.includes(today);
                return (
                  <article key={ritual.id} className={`card ritual-card ${isDue ? 'is-due' : ''}`}>
                    <div className="ritual-main">
                      <span className={`ritual-icon area-${area?.color ?? 'gold'}`}>
                        <Icon name="repeat" size={18} />
                      </span>
                      <div>
                        <h3>{ritual.title}</h3>
                        <div className="ritual-meta">
                          {area ? <AreaBadge area={area} size="sm" muted /> : null}
                          <span>{CADENCE_LABEL[ritual.cadence]}</span>
                          {ritual.cadence === 'weekly' && ritual.weekday !== null ? (
                            <span>{WEEKDAYS[ritual.weekday]}</span>
                          ) : null}
                          {ritual.time ? <span>{faNum(ritual.time)}</span> : null}
                          <span className={`due-${due.tone}`}>
                            {isDue ? 'امروز موعدش است' : `${due.label}`}
                          </span>
                        </div>
                        {ritual.lastDoneAt ? (
                          <p className="ritual-last">
                            آخرین بار: {formatFullDate(dateKey(new Date(ritual.lastDoneAt)))} ·{' '}
                            {faNum(ritual.log.length)} بار ثبت‌شده
                          </p>
                        ) : (
                          <p className="ritual-last">هنوز یک بار هم ثبت نشده؛ از امروز شروع کن.</p>
                        )}
                      </div>
                    </div>
                    <div className="ritual-actions">
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        onClick={() => completeRitual(ritual.id)}
                        disabled={doneToday}
                      >
                        <Icon name="check" size={15} />
                        {doneToday ? 'امروز ثبت شد' : 'انجام شد'}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setRitualEditor({ mode: 'edit', ritual })}
                        aria-label={`ویرایش ${ritual.title}`}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          setConfirm({
                            title: 'آیین حذف شود؟',
                            description: `«${ritual.title}» و یادآور فعالش حذف می‌شوند. سابقهٔ انجام‌های قبلی هم از بین می‌رود.`,
                            confirmLabel: 'حذف آیین',
                            danger: true,
                            action: () => {
                              dispatch({ type: 'deleteRitual', id: ritual.id });
                              toast('آیین حذف شد.');
                            },
                          })
                        }
                        aria-label={`حذف ${ritual.title}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="repeat"
              title="آیین‌ها، ستون‌های آرام روزند."
              body="یک عادت کوچک بساز؛ رهیار موعدش را یادت می‌اندازد و در پیشنهاد «الان» می‌آورد."
              action={
                <button type="button" className="btn btn--gold" onClick={() => setRitualEditor({ mode: 'new' })}>
                  <Icon name="plus" size={17} />
                  ساختن آیین
                </button>
              }
            />
          )}
        </section>
      ) : null}

      {tab === 'journal' ? (
        <section className="plan-section">
          <div className="journal-intro">
            <div>
              <h2>دفتر تصمیم‌ها</h2>
              <p>چرا این راه را انتخاب کردی؟ برای روزی که یادت رفته باشد.</p>
            </div>
            <button type="button" className="btn btn--soft btn--sm" onClick={() => setJournalOpen(true)}>
              <Icon name="plus" size={15} />
              ثبت تصمیم
            </button>
          </div>
          {decisions.length ? (
            <div className="journal-list">
              {decisions.map((decision) => {
                const area = state.areas.find((a) => a.id === decision.areaId);
                return (
                  <article key={decision.id} className="card journal-card">
                    <div className="journal-top">
                      <span className="journal-date">
                        {formatFullDate(dateKey(new Date(decision.createdAt)))}
                      </span>
                      {area ? <AreaBadge area={area} size="sm" muted /> : null}
                      <button
                        type="button"
                        className="icon-btn journal-delete"
                        onClick={() =>
                          setConfirm({
                            title: 'این تصمیم حذف شود؟',
                            description: 'سابقهٔ این تصمیم از دفتر پاک می‌شود.',
                            confirmLabel: 'حذف',
                            danger: true,
                            action: () => dispatch({ type: 'deleteDecision', id: decision.id }),
                          })
                        }
                        aria-label="حذف تصمیم"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                    <h3>{decision.title}</h3>
                    <div className="journal-choice">
                      <Icon name="check" size={15} />
                      <span>{decision.chosen}</span>
                    </div>
                    {decision.alternatives.length ? (
                      <p className="journal-alt">
                        گزینه‌های دیگر: {decision.alternatives.join(' · ')}
                      </p>
                    ) : null}
                    {decision.reason ? <p className="journal-reason">«{decision.reason}»</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="book"
              title="دفتر تصمیم خالی است."
              body="تصمیم‌های مهم را با دلیلشان ثبت کن؛ آیندهٔ تو از این شفافیت ممنون می‌شود."
              action={
                <button type="button" className="btn btn--gold" onClick={() => setJournalOpen(true)}>
                  <Icon name="plus" size={17} />
                  ثبت اولین تصمیم
                </button>
              }
            />
          )}
        </section>
      ) : null}

      <TaskEditorSheet
        task={editingTask}
        onClose={() => setEditingTaskId(null)}
        today={today}
        askConfirm={setConfirm}
      />

      <GoalEditorSheet
        editor={goalEditor}
        onClose={() => setGoalEditor(null)}
        askConfirm={setConfirm}
      />

      <RitualEditorSheet
        editor={ritualEditor}
        onClose={() => setRitualEditor(null)}
        today={today}
      />

      <DecisionSheet open={journalOpen} onClose={() => setJournalOpen(false)} />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.description ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'تأیید'}
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.action();
          setConfirm(null);
        }}
      />
    </div>
  );
}

function TaskRow({
  task,
  today,
  onOpen,
  onComplete,
}: {
  task: Task;
  today: string;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const { state } = useStore();
  const area = state.areas.find((a) => a.id === task.areaId);
  const due = task.due ? dueLabel(task.due, today) : null;
  const goal = task.goalId ? state.goals.find((g) => g.id === task.goalId) : undefined;
  return (
    <div className={`task-row ${task.status !== 'active' ? 'is-muted' : ''}`}>
      <button
        type="button"
        className={`task-check ${task.status === 'done' ? 'is-done' : ''}`}
        onClick={task.status === 'active' ? onComplete : undefined}
        aria-label={
          task.status === 'active' ? `انجام شد: ${task.title}` : `وضعیت: ${task.status}`
        }
        disabled={task.status !== 'active'}
      >
        <Icon name={task.status === 'done' ? 'check' : task.status === 'delegated' ? 'users' : 'check'} size={13} />
      </button>
      <button type="button" className="task-row-main" onClick={onOpen}>
        <span className="task-row-title">{task.title}</span>
        <span className="task-row-meta">
          {area ? <AreaBadge area={area} size="sm" muted /> : <span className="muted-chip">بدون حوزه</span>}
          {due ? <span className={`due-${due.tone}`}>{due.label}</span> : <span>بدون موعد</span>}
          <span className={`energy-text energy-${task.energy}`}>{ENERGY_LABEL[task.energy]}</span>
          {task.estimateMin ? <span>{minutesLabel(task.estimateMin)}</span> : null}
          {task.deep ? <span className="mini-badge">تمرکز عمیق</span> : null}
          {task.ritualId ? <span className="mini-badge">آیین</span> : null}
          {goal ? <span className="mini-badge">هدف</span> : null}
          {task.status === 'delegated' ? (
            <span className="mini-badge mini-badge--delegated">
              واگذار به {task.delegatedTo || '—'}
            </span>
          ) : null}
        </span>
      </button>
      {task.status === 'done' && task.completedAt ? (
        <span className="task-side-note">{formatTime(task.completedAt)}</span>
      ) : (
        <span className="task-side-chevron" aria-hidden="true">
          <Icon name="chevron-left" size={16} />
        </span>
      )}
    </div>
  );
}

function TaskEditorSheet({
  task,
  onClose,
  today,
  askConfirm,
}: {
  task: Task | null;
  onClose: () => void;
  today: string;
  askConfirm: (state: ConfirmState) => void;
}) {
  const { state, dispatch } = useStore();
  const { toast, openDelegate, archiveTask, addTask } = useUi();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [energy, setEnergy] = useState<Energy>('medium');
  const [due, setDue] = useState<string | null>(null);
  const [estimate, setEstimate] = useState('');
  const [deep, setDeep] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNote(task.note);
    setAreaId(task.areaId);
    setEnergy(task.energy);
    setDue(task.due);
    setEstimate(task.estimateMin ? String(task.estimateMin) : '');
    setDeep(task.deep);
    setGoalId(task.goalId);
    setPinned(task.pinned);
    setError('');
    setCopied(false);
  }, [task?.id]);

  if (!task) return null;

  const save = () => {
    if (!title.trim()) {
      setError('عنوان کار نمی‌تواند خالی باشد.');
      return;
    }
    const minutes = Number(estimate);
    dispatch({
      type: 'updateTask',
      id: task.id,
      patch: {
        title: title.trim(),
        note: note.trim(),
        areaId,
        energy,
        due,
        estimateMin: Number.isFinite(minutes) && minutes > 0 ? Math.min(480, Math.round(minutes)) : null,
        deep,
        goalId,
        pinned,
      },
    });
    toast('کار به‌روز شد.', { tone: 'success' });
    onClose();
  };

  const area = state.areas.find((a) => a.id === areaId);
  const goal = state.goals.find((g) => g.id === goalId);

  return (
    <Sheet
      open={Boolean(task)}
      onClose={onClose}
      title="ویرایش کار"
      subtitle={task.status === 'delegated' ? 'این کار واگذار شده است.' : undefined}
      size="md"
      footer={
        <div className="row gap-8 add-footer">
          <button type="button" className="btn btn--gold grow" onClick={save}>
            ذخیره
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            بستن
          </button>
        </div>
      }
    >
      <div className="task-editor">
        <div className="task-status-strip">
          <span className={`status-pill status-${task.status}`}>
            {task.status === 'active'
              ? 'روی میز'
              : task.status === 'done'
                ? 'انجام‌شده'
                : task.status === 'delegated'
                  ? 'واگذارشده'
                  : 'بایگانی'}
          </span>
          {task.ritualId ? <span className="mini-badge">ساخته‌شده از آیین</span> : null}
          {task.due ? <span className={`due-${dueLabel(task.due, today).tone}`}>موعد: {dueLabel(task.due, today).label}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="task-title">
            عنوان
          </label>
          <input
            id="task-title"
            data-autofocus
            className="input input--title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            maxLength={120}
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="task-area">
              حوزه
            </label>
            <select
              id="task-area"
              className="input select"
              value={areaId ?? ''}
              onChange={(event) => setAreaId(event.target.value || null)}
            >
              <option value="">بدون حوزه</option>
              {state.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">موعد</span>
            <DateField value={due} onChange={setDue} label="موعد کار" />
          </div>
        </div>

        <div className="field">
          <span className="field-label">انرژی لازم</span>
          <EnergyPicker value={energy} onChange={setEnergy} />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="task-estimate">
              زمان تقریبی (دقیقه)
            </label>
            <input
              id="task-estimate"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={480}
              value={estimate}
              onChange={(event) => setEstimate(event.target.value)}
              placeholder="اختیاری"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="task-goal">
              هدف
            </label>
            <select
              id="task-goal"
              className="input select"
              value={goalId ?? ''}
              onChange={(event) => setGoalId(event.target.value || null)}
            >
              <option value="">بدون هدف</option>
              {state.goals
                .filter((g) => g.status === 'active')
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
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
          <input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} />
          <i className="switch" aria-hidden="true" />
        </label>

        {task.status === 'active' ? (
          <label className="switch-row">
            <span>
              <strong>سنجاق به پیشنهاد «الان»</strong>
              <small>رهیار این کار را بالاتر می‌آورد.</small>
            </span>
            <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
            <i className="switch" aria-hidden="true" />
          </label>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="task-note">
            یادداشت
          </label>
          <textarea
            id="task-note"
            className="input textarea"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="یک جمله برای آیندهٔ خودت..."
            maxLength={600}
          />
        </div>

        {task.status === 'delegated' && task.brief ? (
          <div className="brief-box">
            <div className="brief-box-head">
              <strong>
                <Icon name="users" size={15} />
                بریف واگذاری {task.delegatedTo ? `به ${task.delegatedTo}` : ''}
              </strong>
              <button
                type="button"
                className="link-btn"
                onClick={async () => {
                  const ok = await copyText(task.brief ?? '');
                  setCopied(ok);
                  toast(ok ? 'بریف کپی شد.' : 'کپی نشد.', { tone: ok ? 'success' : 'default' });
                }}
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                {copied ? 'کپی شد' : 'کپی'}
              </button>
            </div>
            <pre>{task.brief}</pre>
          </div>
        ) : null}

        {area && goal ? (
          <p className="task-context-hint">
            <Icon name="flag" size={13} />
            این کار در حوزهٔ «{area.title}» و متصل به هدف «{goal.title}» است.
          </p>
        ) : null}

        <div className="editor-actions">
          {task.status === 'active' ? (
            <>
              <button
                type="button"
                className="btn btn--soft btn--sm"
                onClick={() => {
                  openDelegate(task.id);
                  onClose();
                }}
              >
                <Icon name="users" size={15} />
                واگذاری
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  archiveTask(task.id);
                  onClose();
                }}
              >
                <Icon name="archive" size={15} />
                کنار گذاشتن
              </button>
            </>
          ) : null}
          {task.status === 'archived' || task.status === 'delegated' ? (
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={() => {
                dispatch({ type: 'restoreTask', id: task.id, at: new Date().toISOString() });
                toast('کار به برنامه برگشت.', { tone: 'success' });
                onClose();
              }}
            >
              <Icon name="rotate" size={15} />
              بازگرداندن به برنامه
            </button>
          ) : null}
          {task.status === 'done' ? (
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={() => {
                dispatch({ type: 'restoreTask', id: task.id, at: new Date().toISOString() });
                toast('کار دوباره باز شد.');
                onClose();
              }}
            >
              <Icon name="rotate" size={15} />
              باز کردن دوباره
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() =>
              askConfirm({
                title: 'کار حذف شود؟',
                description: `«${task.title}» برای همیشه پاک می‌شود. اگر فقط می‌خواهی از جلوی چشمت دور شود، «کنار گذاشتن» بهتر است.`,
                confirmLabel: 'حذف کار',
                danger: true,
                action: () => {
                  dispatch({ type: 'deleteTask', id: task.id });
                  toast('کار حذف شد.');
                  onClose();
                },
              })
            }
          >
            <Icon name="trash" size={15} />
            حذف
          </button>
        </div>

        <button
          type="button"
          className="link-btn editor-add-another"
          onClick={() => {
            addTask({
              title: title.trim() || 'یک قدم تازه',
              note,
              areaId,
              energy,
              due,
              estimateMin: estimate ? Number(estimate) : null,
              deep,
              goalId,
            });
          }}
        >
          <Icon name="copy" size={14} />
          ساختن نسخهٔ تازه از این کار
        </button>
      </div>
    </Sheet>
  );
}

function goalProgress(goal: Goal, tasks: Task[]): { percent: number; done: number; total: number } {
  const linked = tasks.filter((t) => t.goalId === goal.id);
  const doneTasks = linked.filter((t) => t.status === 'done').length;
  const doneMs = goal.milestones.filter((m) => m.done).length;
  const total = linked.length + goal.milestones.length;
  const done = doneTasks + doneMs;
  return { percent: total ? done / total : 0, done, total };
}

function GoalCard({
  goal,
  onEdit,
  onAddTask,
  onToggleMilestone,
  onArchive,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onAddTask: () => void;
  onToggleMilestone: (id: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { state } = useStore();
  const area = state.areas.find((a) => a.id === goal.areaId);
  const progress = goalProgress(goal, state.tasks);
  return (
    <article className="card goal-card">
      <header className="goal-head">
        <div>
          <h3>{goal.title}</h3>
          <div className="goal-meta">
            {area ? <AreaBadge area={area} size="sm" muted /> : null}
            {goal.targetDate ? <span>تا {formatFullDate(goal.targetDate)}</span> : <span>بدون موعد</span>}
          </div>
        </div>
        <div className="goal-head-actions">
          <button type="button" className="icon-btn" onClick={onEdit} aria-label="ویرایش هدف">
            <Icon name="edit" size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={onArchive} aria-label="آرشیو هدف">
            <Icon name="archive" size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={onDelete} aria-label="حذف هدف">
            <Icon name="trash" size={15} />
          </button>
        </div>
      </header>

      <div className="goal-progress">
        <div className="goal-progress-head">
          <span>
            {faNum(progress.done)} از {faNum(progress.total)} قدم
          </span>
          <span>{faNum(Math.round(progress.percent * 100))}٪</span>
        </div>
        <div className="progress-track">
          <i style={{ width: `${Math.max(2, progress.percent * 100)}%` }} />
        </div>
      </div>

      {goal.milestones.length ? (
        <ul className="milestone-list">
          {goal.milestones.map((milestone) => (
            <li key={milestone.id}>
              <button
                type="button"
                className={`milestone-check ${milestone.done ? 'is-done' : ''}`}
                onClick={() => onToggleMilestone(milestone.id)}
                aria-pressed={milestone.done}
              >
                <Icon name="check" size={11} />
              </button>
              <span className={milestone.done ? 'is-done' : ''}>{milestone.title}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="goal-actions">
        <button type="button" className="btn btn--soft btn--sm grow" onClick={onAddTask}>
          <Icon name="plus" size={14} />
          کار برای این هدف
        </button>
      </div>
    </article>
  );
}

function GoalEditorSheet({
  editor,
  onClose,
  askConfirm,
}: {
  editor: { mode: 'new' } | { mode: 'edit'; goal: Goal } | null;
  onClose: () => void;
  askConfirm: (state: ConfirmState) => void;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useUi();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [note, setNote] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === 'new') {
      setTitle('');
      setAreaId(null);
      setTargetDate('');
      setNote('');
      setMilestones([]);
    } else {
      setTitle(editor.goal.title);
      setAreaId(editor.goal.areaId);
      setTargetDate(editor.goal.targetDate ?? '');
      setNote(editor.goal.note);
      setMilestones(editor.goal.milestones.map((m) => ({ ...m })));
    }
    setError('');
  }, [editor]);

  if (!editor) return null;
  const isEdit = editor.mode === 'edit';

  const save = () => {
    if (!title.trim()) {
      setError('عنوان هدف را بنویس.');
      return;
    }
    const clean = milestones
      .filter((m) => m.title.trim())
      .map((m) => ({ ...m, title: m.title.trim() }));
    if (isEdit) {
      dispatch({
        type: 'updateGoal',
        id: editor.goal.id,
        patch: {
          title: title.trim(),
          areaId,
          targetDate: targetDate || null,
          note: note.trim(),
          milestones: clean,
        },
      });
      toast('هدف به‌روز شد.', { tone: 'success' });
    } else {
      const goal = createGoal({
        title,
        areaId,
        targetDate: targetDate || null,
        note,
        milestones: clean.map((m) => m.title),
      });
      dispatch({ type: 'addGoal', goal });
      toast('هدف ساخته شد.', { tone: 'success' });
    }
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isEdit ? 'ویرایش هدف' : 'هدف تازه'}
      subtitle="هدف، جهت می‌دهد؛ نه فشار."
      size="md"
      footer={
        <div className="row gap-8">
          <button type="button" className="btn btn--gold grow" onClick={save}>
            {isEdit ? 'ذخیرهٔ هدف' : 'ساختن هدف'}
          </button>
          {isEdit ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                askConfirm({
                  title: 'هدف حذف شود؟',
                  description: 'کارهای متصل به هدف پاک نمی‌شوند؛ فقط از هدف جدا می‌شوند.',
                  confirmLabel: 'حذف هدف',
                  danger: true,
                  action: () => {
                    dispatch({ type: 'deleteGoal', id: editor.goal.id });
                    onClose();
                  },
                });
              }}
              aria-label="حذف هدف"
            >
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      }
    >
      <div className="stack-16">
        <div className="field">
          <label className="field-label" htmlFor="goal-title">
            عنوان
          </label>
          <input
            id="goal-title"
            data-autofocus
            className="input input--title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="مثلاً: تمام کردن کتاب دوم"
            maxLength={100}
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="goal-area">
              حوزه
            </label>
            <select
              id="goal-area"
              className="input select"
              value={areaId ?? ''}
              onChange={(event) => setAreaId(event.target.value || null)}
            >
              <option value="">بدون حوزه</option>
              {state.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">موعد هدف</span>
            <DateField value={targetDate || null} onChange={(next) => setTargetDate(next ?? '')} label="موعد هدف" />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="goal-note">
            یادداشت
          </label>
          <textarea
            id="goal-note"
            className="input textarea"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="چرا این هدف مهم است؟"
            maxLength={400}
          />
        </div>

        <div className="field">
          <div className="field-label-row">
            <span className="field-label">نقاط عطف</span>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                setMilestones((prev) => [...prev, { id: uid('ms'), title: '', done: false }])
              }
            >
              <Icon name="plus" size={14} />
              افزودن
            </button>
          </div>
          {milestones.length ? (
            <div className="milestone-editor">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="milestone-editor-row">
                  <span>{faNum(index + 1)}</span>
                  <input
                    className="input"
                    value={milestone.title}
                    onChange={(event) =>
                      setMilestones((prev) =>
                        prev.map((m) =>
                          m.id === milestone.id ? { ...m, title: event.target.value } : m,
                        ),
                      )
                    }
                    placeholder="یک نقطهٔ عطف روشن"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setMilestones((prev) => prev.filter((m) => m.id !== milestone.id))
                    }
                    aria-label="حذف نقطهٔ عطف"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">می‌توانی هدف را به چند نقطهٔ عطف ساده بشکنی.</p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function RitualEditorSheet({
  editor,
  onClose,
  today,
}: {
  editor: { mode: 'new' } | { mode: 'edit'; ritual: Ritual } | null;
  onClose: () => void;
  today: string;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useUi();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Ritual['cadence']>('daily');
  const [weekday, setWeekday] = useState(5);
  const [time, setTime] = useState('08:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === 'new') {
      setTitle('');
      setAreaId(null);
      setCadence('daily');
      setWeekday(5);
      setTime('08:00');
      setNote('');
    } else {
      setTitle(editor.ritual.title);
      setAreaId(editor.ritual.areaId);
      setCadence(editor.ritual.cadence);
      setWeekday(editor.ritual.weekday ?? 5);
      setTime(editor.ritual.time ?? '08:00');
      setNote(editor.ritual.note);
    }
    setError('');
  }, [editor]);

  if (!editor) return null;
  const isEdit = editor.mode === 'edit';

  const save = () => {
    if (!title.trim()) {
      setError('عنوان آیین را بنویس.');
      return;
    }
    if (isEdit) {
      const scheduleChanged =
        editor.ritual.cadence !== cadence ||
        editor.ritual.weekday !== (cadence === 'weekly' ? weekday : null) ||
        editor.ritual.time !== time;
      dispatch({
        type: 'updateRitual',
        id: editor.ritual.id,
        patch: {
          title: title.trim(),
          areaId,
          cadence,
          weekday: cadence === 'weekly' ? weekday : null,
          time,
          note: note.trim(),
          ...(scheduleChanged
            ? {
                nextDue: initialRitualDue(
                  cadence,
                  cadence === 'weekly' ? weekday : null,
                  time || null,
                  new Date(),
                ),
              }
            : {}),
        },
      });
      toast('آیین به‌روز شد.', { tone: 'success' });
    } else {
      const ritual: Ritual = {
        id: uid('ritual'),
        title: title.trim(),
        areaId,
        cadence,
        weekday: cadence === 'weekly' ? weekday : null,
        time: time || null,
        nextDue: initialRitualDue(cadence, cadence === 'weekly' ? weekday : null, time || null, new Date()),
        lastDoneAt: null,
        log: [],
        note: note.trim(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'addRitual', ritual, today });
      toast('آیین ساخته شد. از همین امروز شروع می‌شود.', { tone: 'success' });
    }
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isEdit ? 'ویرایش آیین' : 'آیین تازه'}
      subtitle="تکرار، بدون اجبار."
      size="md"
      footer={
        <button type="button" className="btn btn--gold" onClick={save}>
          {isEdit ? 'ذخیرهٔ آیین' : 'ساختن آیین'}
        </button>
      }
    >
      <div className="stack-16">
        <div className="field">
          <label className="field-label" htmlFor="ritual-title">
            عنوان
          </label>
          <input
            id="ritual-title"
            data-autofocus
            className="input input--title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="مثلاً: مرور صبحگاهی"
            maxLength={80}
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ritual-area">
            حوزه
          </label>
          <select
            id="ritual-area"
            className="input select"
            value={areaId ?? ''}
            onChange={(event) => setAreaId(event.target.value || null)}
          >
            <option value="">بدون حوزه</option>
            {state.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.title}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <span className="field-label">تکرار</span>
          <div className="chips-row">
            {(['daily', 'weekly', 'monthly'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`choice-chip ${cadence === option ? 'is-active' : ''}`}
                onClick={() => setCadence(option)}
              >
                {CADENCE_LABEL[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          {cadence === 'weekly' ? (
            <div className="field">
              <label className="field-label" htmlFor="ritual-weekday">
                روز هفته
              </label>
              <select
                id="ritual-weekday"
                className="input select"
                value={weekday}
                onChange={(event) => setWeekday(Number(event.target.value))}
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field">
            <label className="field-label" htmlFor="ritual-time">
              ساعت (اختیاری)
            </label>
            <input
              id="ritual-time"
              type="time"
              className="input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ritual-note">
            یادداشت
          </label>
          <textarea
            id="ritual-note"
            className="input textarea"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="چرا این آیین برایت مهم است؟"
            maxLength={400}
          />
        </div>

        <p className="field-hint">
          رهیار در روز موعد، یک کار کوتاه از این آیین می‌سازد. اگر انجامش ندهی، چیزی از دست نمی‌رود؛
          دفعهٔ بعد دوباره سر جایش است.
        </p>
      </div>
    </Sheet>
  );
}

function DecisionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useUi();
  const [title, setTitle] = useState('');
  const [chosen, setChosen] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [reason, setReason] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setChosen('');
    setAlternatives('');
    setReason('');
    setAreaId(null);
    setError('');
  }, [open]);

  const save = () => {
    if (!title.trim() || !chosen.trim()) {
      setError('عنوان تصمیم و گزینهٔ انتخاب‌شده را بنویس.');
      return;
    }
    const decision = createDecision({
      title,
      chosen,
      alternatives: alternatives.split('\n'),
      reason,
      areaId,
    });
    dispatch({ type: 'addDecision', decision });
    toast('تصمیم در دفتر ثبت شد.', { tone: 'success' });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ثبت یک تصمیم"
      subtitle="برای روزی که یادت رفته چرا این راه را انتخاب کردی."
      size="md"
      footer={
        <button type="button" className="btn btn--gold" onClick={save}>
          ثبت در دفتر
        </button>
      }
    >
      <div className="stack-16">
        <div className="field">
          <label className="field-label" htmlFor="decision-title">
            موضوع تصمیم
          </label>
          <input
            id="decision-title"
            data-autofocus
            className="input input--title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="مثلاً: پذیرش پروژهٔ جدید"
            maxLength={100}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="decision-chosen">
            چه چیزی را انتخاب کردی؟
          </label>
          <input
            id="decision-chosen"
            className="input"
            value={chosen}
            onChange={(event) => {
              setChosen(event.target.value);
              setError('');
            }}
            placeholder="مثلاً: نه، امسال تمرکز روی رهیار"
            maxLength={140}
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="decision-alt">
            گزینه‌های دیگر (هر خط یکی)
          </label>
          <textarea
            id="decision-alt"
            className="input textarea"
            rows={2}
            value={alternatives}
            onChange={(event) => setAlternatives(event.target.value)}
            placeholder={'بله، با تیم بزرگ‌تر\nبله، پاره‌وقت'}
            maxLength={400}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="decision-reason">
            چرا؟
          </label>
          <textarea
            id="decision-reason"
            className="input textarea"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="دلیلی که این تصمیم را از بقیه جدا کرد..."
            maxLength={600}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="decision-area">
            حوزه
          </label>
          <select
            id="decision-area"
            className="input select"
            value={areaId ?? ''}
            onChange={(event) => setAreaId(event.target.value || null)}
          >
            <option value="">بدون حوزه</option>
            {state.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Sheet>
  );
}
