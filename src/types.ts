export type Energy = 'low' | 'medium' | 'high';
export type AreaColor = 'gold' | 'mint' | 'rose' | 'violet' | 'sky';
export type TaskStatus = 'active' | 'done' | 'archived' | 'delegated';
export type RitualCadence = 'daily' | 'weekly' | 'monthly';
export type TabId = 'now' | 'advisor' | 'portfolio' | 'plan' | 'review';

export interface Area {
  id: string;
  title: string;
  emoji: string;
  color: AreaColor;
  /** How much this area matters to the user, 1..5 */
  intent: number;
  createdAt: string;
  source?: 'seed';
}

export interface Task {
  id: string;
  title: string;
  note: string;
  areaId: string | null;
  energy: Energy;
  /** Local calendar day key, YYYY-MM-DD */
  due: string | null;
  estimateMin: number | null;
  deep: boolean;
  goalId: string | null;
  ritualId: string | null;
  status: TaskStatus;
  pinned: boolean;
  deferCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  delegatedTo: string | null;
  delegatedAt: string | null;
  brief: string | null;
  source?: 'seed';
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  areaId: string | null;
  targetDate: string | null;
  note: string;
  milestones: Milestone[];
  status: 'active' | 'archived';
  createdAt: string;
  source?: 'seed';
}

export interface Ritual {
  id: string;
  title: string;
  areaId: string | null;
  cadence: RitualCadence;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number | null;
  time: string | null;
  nextDue: string;
  lastDoneAt: string | null;
  log: string[];
  note: string;
  createdAt: string;
  source?: 'seed';
}

export interface Decision {
  id: string;
  title: string;
  chosen: string;
  alternatives: string[];
  reason: string;
  areaId: string | null;
  createdAt: string;
  source?: 'seed';
}

export interface Review {
  id: string;
  date: string;
  moved: number;
  energy: Energy;
  note: string;
  createdAt: string;
  source?: 'seed';
}

export interface AdvisorMessage {
  id: string;
  role: 'advisor' | 'user';
  text: string;
  at: string;
  kind?: string;
}

export interface Settings {
  energy: Energy;
  focusAreaId: string | null;
  deepWorkUntil: string | null;
  deepWorkStartedAt: string | null;
  deepWorkMinutes: number | null;
  lastVisit: string;
  recoveryDismissedOn: string | null;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  profile: {
    name: string;
    createdAt: string;
    demo: boolean;
  };
  areas: Area[];
  tasks: Task[];
  goals: Goal[];
  rituals: Ritual[];
  decisions: Decision[];
  reviews: Review[];
  messages: AdvisorMessage[];
  settings: Settings;
}

export interface TaskDraft {
  title: string;
  note?: string;
  areaId?: string | null;
  energy?: Energy;
  due?: string | null;
  estimateMin?: number | null;
  deep?: boolean;
  goalId?: string | null;
}

export interface AreaStat {
  area: Area;
  intentShare: number;
  attentionShare: number;
  completed: number;
  active: number;
  overdue: number;
  lastActivityDays: number | null;
  dormant: boolean;
}

export interface Portfolio {
  areas: AreaStat[];
  totalCompleted: number;
  windowDays: number;
}

export interface ScoredTask {
  task: Task;
  score: number;
  reasons: string[];
}

export interface EngineContext {
  now: Date;
  energy: Energy;
  areas: Area[];
  tasks: Task[];
  goals: Goal[];
  portfolio: Portfolio;
  focusAreaId: string | null;
  deepWorkUntil: string | null;
  recovery: boolean;
}
