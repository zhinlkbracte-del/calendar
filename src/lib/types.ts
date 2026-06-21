export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: 'work' | 'life';
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'urgent' | 'important' | 'normal';
  sort_order: string | null;
  task_id: string | null;
  task_title?: string;
  created_at: string;
  updated_at: string | null;
}

export type EventCategory = 'work' | 'life';
export type EventStatus = 'not_started' | 'in_progress' | 'completed';
export type EventPriority = 'urgent' | 'important' | 'normal';
export type FilterCategory = 'all' | 'work' | 'life';

export const CATEGORY_CONFIG: Record<EventCategory, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  activeBg: string;
  activeColor: string;
  activeBorder: string;
  sidebar: string;
}> = {
  work: {
    label: '工作',
    color: 'text-[var(--work-color)]',
    bg: 'bg-[var(--work-bg)]',
    border: 'border-[var(--work-border)]',
    dot: 'bg-[var(--work-dot)]',
    activeBg: 'bg-[var(--work-active-bg)]',
    activeColor: 'text-[var(--work-active-color)]',
    activeBorder: 'border-[var(--work-active-border)]',
    sidebar: 'bg-[var(--work-sidebar)]',
  },
  life: {
    label: '生活',
    color: 'text-[var(--life-color)]',
    bg: 'bg-[var(--life-bg)]',
    border: 'border-[var(--life-border)]',
    dot: 'bg-[var(--life-dot)]',
    activeBg: 'bg-[var(--life-active-bg)]',
    activeColor: 'text-[var(--life-active-color)]',
    activeBorder: 'border-[var(--life-active-border)]',
    sidebar: 'bg-[var(--life-sidebar)]',
  },
};

export const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  not_started: {
    label: '未开始',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
  in_progress: {
    label: '进行中',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  completed: {
    label: '已完成',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
};

export const PRIORITY_CONFIG: Record<EventPriority, { label: string; color: string; bg: string; border: string; icon: string; activeBg: string; activeColor: string; activeBorder: string }> = {
  urgent: {
    label: '紧急',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    icon: '🔴',
    activeBg: 'bg-red-500/15',
    activeColor: 'text-red-700 dark:text-red-300',
    activeBorder: 'border-red-500/40',
  },
  important: {
    label: '重要',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    icon: '🟡',
    activeBg: 'bg-amber-500/15',
    activeColor: 'text-amber-700 dark:text-amber-300',
    activeBorder: 'border-amber-500/40',
  },
  normal: {
    label: '普通',
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border',
    icon: '⚪',
    activeBg: 'bg-muted/50',
    activeColor: 'text-foreground',
    activeBorder: 'border-border',
  },
};

// Task types
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskDelayStatus = 'normal' | 'delayed';
export type TaskUrgencyType = 'urgent_important' | 'urgent_not_important' | 'important_not_urgent' | 'not_important_not_urgent';

export interface TaskItem {
  id: string;
  title: string;
  start_date: string | null;
  planned_end_date: string | null;
  actual_end_date: string | null;
  delay_status: TaskDelayStatus;
  latest_progress: string | null;
  urgency_type: TaskUrgencyType;
  status: TaskStatus;
  user_id: string | null;
  created_at: string;
  updated_at: string | null;
  events?: EventItem[];
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: {
    label: '未开始',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
  in_progress: {
    label: '进行中',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  completed: {
    label: '已完成',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
};

export const TASK_DELAY_CONFIG: Record<TaskDelayStatus, { label: string; color: string; bg: string }> = {
  normal: {
    label: '正常',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  delayed: {
    label: '已延期',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
  },
};

export const TASK_URGENCY_CONFIG: Record<TaskUrgencyType, { label: string; color: string; bg: string; border: string }> = {
  urgent_important: {
    label: '重要紧急',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  urgent_not_important: {
    label: '紧急不重要',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
  important_not_urgent: {
    label: '重要不紧急',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  not_important_not_urgent: {
    label: '不重要不紧急',
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border',
  },
};
