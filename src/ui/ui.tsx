import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Task, TaskDraft } from '../types';
import { useStore } from '../store/store';
import { createTask } from '../store/store';
import { areaForTask } from '../lib/seed';
import { rewardFor } from '../lib/content';
import { todayCompleted } from '../lib/engine';
import { faNum, todayKey } from '../lib/date';
import { uid } from '../lib/id';

export interface AddTaskPreset {
  areaId?: string | null;
  goalId?: string | null;
  due?: string | null;
  title?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'default' | 'success' | 'gold';
  actionLabel?: string;
  onAction?: () => void;
}

export interface RewardState {
  title: string;
  message: string;
  emoji: string;
  taskTitle: string;
  undo?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UiValue {
  toasts: ToastItem[];
  toast: (
    message: string,
    opts?: { tone?: ToastItem['tone']; actionLabel?: string; onAction?: () => void },
  ) => void;
  dismissToast: (id: string) => void;
  reward: RewardState | null;
  clearReward: () => void;
  addTask: (draft: TaskDraft) => Task | null;
  completeTask: (id: string) => void;
  completeRitual: (id: string) => void;
  deferTask: (id: string, days: number) => void;
  archiveTask: (id: string) => void;
  delegateTask: (id: string, to: string, brief: string) => void;
  advisorSay: (text: string, kind?: string) => void;
  advisorHear: (text: string) => void;
  addOpen: boolean;
  addPreset: AddTaskPreset | null;
  openAddTask: (preset?: AddTaskPreset) => void;
  closeAddTask: () => void;
  delegateId: string | null;
  openDelegate: (id: string) => void;
  closeDelegate: () => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  install: () => Promise<void>;
  canInstall: boolean;
  setFocus: (areaId: string | null) => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [reward, setReward] = useState<RewardState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addPreset, setAddPreset] = useState<AddTaskPreset | null>(null);
  const [delegateId, setDelegateId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((items) => items.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<UiValue['toast']>((message, opts) => {
    const id = uid('toast');
    setToasts((items) => [
      ...items.slice(-2),
      {
        id,
        message,
        tone: opts?.tone ?? 'default',
        ...(opts?.actionLabel ? { actionLabel: opts.actionLabel } : {}),
        ...(opts?.onAction ? { onAction: opts.onAction } : {}),
      },
    ]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((t) => t.id !== id));
    }, 6500);
  }, []);

  const addTask = useCallback<UiValue['addTask']>(
    (draft) => {
      if (!draft.title.trim()) return null;
      const task = createTask(draft);
      dispatch({ type: 'addTask', task });
      toast('«' + task.title + '» به برنامه اضافه شد.', { tone: 'success' });
      return task;
    },
    [dispatch, toast],
  );

  const completeTask = useCallback<UiValue['completeTask']>(
    (id) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task || task.status !== 'active') return;
      const ritual = task.ritualId
        ? state.rituals.find((r) => r.id === task.ritualId) ?? null
        : null;
      const area = areaForTask(state, task);      const done = todayCompleted(state).count;
      const at = new Date().toISOString();
      const rewardMessage = rewardFor(task, area, done + 1);
      dispatch({ type: 'completeTask', id, at, today: todayKey() });
      setReward({
        ...rewardMessage,
        taskTitle: task.title,
        undo: () => {
          const snapshot: Task[] = [task];
          dispatch({
            type: 'restoreEntities',
            tasks: snapshot,
            ...(ritual ? { rituals: [ritual] } : {}),
          });
          setReward(null);
          toast('به برنامه برگشت.');
        },
      });
    },
    [state, dispatch, toast],
  );

  const completeRitual = useCallback<UiValue['completeRitual']>(
    (id) => {
      const ritual = state.rituals.find((r) => r.id === id);
      if (!ritual) return;
      if (ritual.log.includes(todayKey())) {
        toast('این آیین امروز ثبت شده. فردا دوباره سر جایش است.', { tone: 'gold' });
        return;
      }
      const area = state.areas.find((a) => a.id === ritual.areaId);
      const prevTasks = state.tasks;
      const prevRituals = state.rituals;
      const done = todayCompleted(state).count;
      const at = new Date().toISOString();
      const rewardMessage = rewardFor({ title: ritual.title }, area, done + 1);
      dispatch({ type: 'completeRitual', id, at, today: todayKey() });
      setReward({
        ...rewardMessage,
        taskTitle: ritual.title,
        undo: () => {
          dispatch({ type: 'restoreEntities', tasks: prevTasks, rituals: prevRituals });
          setReward(null);
          toast('آیین به حالت قبل برگشت.');
        },
      });
    },
    [state, dispatch, toast],
  );

  const deferTask = useCallback<UiValue['deferTask']>(
    (id, days) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      const snapshot = { ...task };
      dispatch({ type: 'deferTask', id, days, today: todayKey() });
      const label = days === 1 ? 'فردا' : days === 7 ? 'هفتهٔ بعد' : `${faNum(days)} روز بعد`;
      toast(`«${task.title}» به ${label} رفت.`, {
        actionLabel: 'بازگردان',
        onAction: () => {
          dispatch({ type: 'restoreEntities', tasks: [snapshot] });
          toast('تعویق برگشت.');
        },
      });
    },
    [state.tasks, dispatch, toast],
  );

  const archiveTask = useCallback<UiValue['archiveTask']>(
    (id) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      dispatch({ type: 'archiveTask', id, at: new Date().toISOString() });
      toast(`«${task.title}» کنار گذاشته شد.`, {
        actionLabel: 'بازگردان',
        onAction: () => {
          dispatch({ type: 'restoreEntities', tasks: [task] });
          toast('به برنامه برگشت.');
        },
      });
    },
    [state.tasks, dispatch, toast],
  );

  const delegateTask = useCallback<UiValue['delegateTask']>(
    (id, to, brief) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      dispatch({
        type: 'delegateTask',
        id,
        to,
        brief,
        at: new Date().toISOString(),
      });
      setDelegateId(null);
      toast(`«${task.title}» واگذار شد${to.trim() ? ` به ${to.trim()}` : ''}.`, {
        tone: 'success',
        actionLabel: 'بازگردان',
        onAction: () => {
          dispatch({ type: 'restoreEntities', tasks: [task] });
          toast('به برنامه برگشت.');
        },
      });
    },
    [state.tasks, dispatch, toast],
  );

  const advisorSay = useCallback<UiValue['advisorSay']>(
    (text, kind) => {
      dispatch({
        type: 'pushMessage',
        id: uid('msg'),
        role: 'advisor',
        text,
        at: new Date().toISOString(),
        ...(kind ? { kind } : {}),
      });
    },
    [dispatch],
  );

  const advisorHear = useCallback<UiValue['advisorHear']>(
    (text) => {
      dispatch({
        type: 'pushMessage',
        id: uid('msg'),
        role: 'user',
        text,
        at: new Date().toISOString(),
      });
    },
    [dispatch],
  );

  const openAddTask = useCallback((preset?: AddTaskPreset) => {
    setAddPreset(preset ?? null);
    setAddOpen(true);
  }, []);
  const closeAddTask = useCallback(() => setAddOpen(false), []);
  const openDelegate = useCallback((id: string) => setDelegateId(id), []);
  const closeDelegate = useCallback(() => setDelegateId(null), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const clearReward = useCallback(() => setReward(null), []);

  const setFocus = useCallback(
    (areaId: string | null) => {
      dispatch({ type: 'setFocus', areaId });
    },
    [dispatch],
  );

  const install = useCallback(async () => {
    if (!installEvent) {
      toast('از منوی مرورگر گزینهٔ «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را انتخاب کن.', {
        tone: 'gold',
      });
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === 'accepted') {
      toast('رهیار روی دستگاهت نصب شد.', { tone: 'success' });
    }
  }, [installEvent, toast]);

  const value = useMemo<UiValue>(
    () => ({
      toasts,
      toast,
      dismissToast,
      reward,
      clearReward,
      addTask,
      completeTask,
      completeRitual,
      deferTask,
      archiveTask,
      delegateTask,
      advisorSay,
      advisorHear,
      addOpen,
      addPreset,
      openAddTask,
      closeAddTask,
      delegateId,
      openDelegate,
      closeDelegate,
      settingsOpen,
      openSettings,
      closeSettings,
      install,
      canInstall: installEvent !== null,
      setFocus,
    }),
    [
      toasts,
      toast,
      dismissToast,
      reward,
      clearReward,
      addTask,
      completeTask,
      completeRitual,
      deferTask,
      archiveTask,
      delegateTask,
      advisorSay,
      advisorHear,
      addOpen,
      addPreset,
      openAddTask,
      closeAddTask,
      delegateId,
      openDelegate,
      closeDelegate,
      settingsOpen,
      openSettings,
      closeSettings,
      install,
      installEvent,
      setFocus,
    ],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}
