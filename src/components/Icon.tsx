import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'compass'
  | 'sparkles'
  | 'spark'
  | 'check'
  | 'clock'
  | 'calendar'
  | 'plus'
  | 'mic'
  | 'bolt'
  | 'layers'
  | 'target'
  | 'repeat'
  | 'book'
  | 'sliders'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'users'
  | 'archive'
  | 'trash'
  | 'edit'
  | 'play'
  | 'leaf'
  | 'heart'
  | 'brain'
  | 'briefcase'
  | 'wallet'
  | 'home'
  | 'moon'
  | 'sun'
  | 'send'
  | 'copy'
  | 'download'
  | 'upload'
  | 'rotate'
  | 'shield'
  | 'chart'
  | 'flag'
  | 'info'
  | 'dots'
  | 'arrow-left'
  | 'arrow-right'
  | 'stop'
  | 'search'
  | 'lock'
  | 'coffee'
  | 'compass-needle';

const paths: Record<IconName, ReactNode> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8 4.8-2Z" />
    </>
  ),
  'compass-needle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
      <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8 4.8-2Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.2 13.6 8 18.5 9.6 13.6 11.2 12 16l-1.6-4.8L5.5 9.6 10.4 8 12 3.2Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  spark: <path d="M12 2.5 14 9l6.5 2.5L14 14l-2 6.5L10 14 3.5 11.5 10 9 12 2.5Z" />,
  check: <path d="m4.5 12.5 4.7 4.7L19.5 6.8" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </>
  ),
  bolt: <path d="M13.5 2.5 5 14h5.5L10 21.5 19 10h-5.5l0-7.5Z" />,
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m4 12 8 4.3 8-4.3M4 16.5l8 4.3 8-4.3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 8.5A4.5 4.5 0 0 1 8.5 4H18l-3-3M20 15.5a4.5 4.5 0 0 1-4.5 4.5H6l3 3" />
      <path d="M18 4l-2.5 2.5M6 20l2.5-2.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
      <path d="M4 19.5V22M8 6h8M8 10h8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="#0b0e16" />
      <circle cx="15" cy="12" r="2" fill="#0b0e16" />
      <circle cx="8" cy="17" r="2" fill="#0b0e16" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-left': <path d="m14 6-6 6 6 6" />,
  'chevron-right': <path d="m10 6 6 6-6 6" />,
  'chevron-down': <path d="m6 10 6 6 6-6" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 15c2 .6 3.5 2.4 3.5 5" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </>
  ),
  play: <path d="M7 4.5 19 12 7 19.5v-15Z" />,
  leaf: (
    <>
      <path d="M4 20C3 11 8 4 20 4c0 12-7 17-16 16Z" />
      <path d="M4 20C7 15 11 11 17 8" />
    </>
  ),
  heart: <path d="M12 20.5S3.5 15.5 3.5 9.5A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11Z" />,
  brain: (
    <>
      <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8a3.2 3.2 0 0 0-1.5 5.9A3.4 3.4 0 0 0 7.5 20c1.4 0 2.5-.7 3-1.8V5.8a3.5 3.5 0 0 0-1-1.3Z" />
      <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8a3.2 3.2 0 0 1 1.5 5.9A3.4 3.4 0 0 1 16.5 20c-1.4 0-2.5-.7-3-1.8V5.8a3.5 3.5 0 0 1 1-1.3Z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V4.5h6V7M3 12h18M10 12v2h4v-2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M4 7h15M15 12h5M16 12h.01" />
    </>
  ),
  home: <path d="m3.5 11 8.5-7 8.5 7V20h-6v-5h-5v5h-6V11Z" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  send: (
    <>
      <path d="m21 3-7.5 18-3.2-7.8L3 10l18-7Z" />
      <path d="M21 3 10.3 13.2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M15 5.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  upload: <path d="M12 21V9M7 14l5-5 5 5M4 4h16" />,
  rotate: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4v4h4" />
    </>
  ),
  shield: <path d="M12 3 20 6v5.5c0 4.8-3.4 7.9-8 9.5-4.6-1.6-8-4.7-8-9.5V6l8-3Z" />,
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6M20 16v-2" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h12l-2.5 4L17 12H5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  'arrow-left': <path d="M20 12H4M10 6l-6 6 6 6" />,
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 9h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2M15 3v2" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.7, style }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}

export const AREA_ICON: Record<string, IconName> = {
  'کسب‌وکار': 'briefcase',
  سلامت: 'leaf',
  خانواده: 'home',
  رشد: 'brain',
  مالی: 'wallet',
  شخصی: 'sparkles',
};
