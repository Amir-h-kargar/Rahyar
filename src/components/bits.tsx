import type { ReactNode } from 'react';
import type { Area, Energy } from '../types';
import { Icon, type IconName } from './Icon';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const ENERGY_LEVEL: Record<Energy, number> = { low: 1, medium: 2, high: 3 };

export function EnergyBars({ energy, size = 'md' }: { energy: Energy; size?: 'sm' | 'md' }) {
  const level = ENERGY_LEVEL[energy];
  return (
    <span className={`energy-bars energy-bars--${size} energy-${energy}`} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  );
}

export const ENERGY_SHORT: Record<Energy, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
};

export function EnergyPicker({
  value,
  onChange,
  label = 'انرژی الان',
}: {
  value: Energy;
  onChange: (energy: Energy) => void;
  label?: string;
}) {
  const options: { value: Energy; label: string }[] = [
    { value: 'low', label: 'کم' },
    { value: 'medium', label: 'متوسط' },
    { value: 'high', label: 'زیاد' },
  ];
  return (
    <div className="energy-picker" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`energy-option energy-${option.value} ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          title={`${label}: ${option.label}`}
        >
          <EnergyBars energy={option.value} size="sm" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 8,
  color = 'var(--gold)',
  track = 'rgba(255,255,255,.07)',
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`ring ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-value"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${className ?? ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <Icon name={option.icon} size={16} /> : null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AreaBadge({
  area,
  size = 'md',
  muted = false,
}: {
  area: Area;
  size?: 'sm' | 'md';
  muted?: boolean;
}) {
  return (
    <span className={`area-badge area-${area.color} ${muted ? 'is-muted' : ''} area-badge--${size}`}>
      <span className="area-badge-emoji" aria-hidden="true">
        {area.emoji}
      </span>
      <span>{area.title}</span>
    </span>
  );
}

export function Meta({
  icon,
  children,
  tone = 'neutral',
}: {
  icon?: IconName;
  children: ReactNode;
  tone?: 'neutral' | 'danger' | 'soon' | 'gold' | 'mint';
}) {
  return (
    <span className={`meta meta--${tone}`}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="stat-block">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} aria-hidden="true" />;
}
