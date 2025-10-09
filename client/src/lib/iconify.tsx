import { Icon } from '@iconify/react';

// Helper component to use Iconify icons with consistent props
interface IconifyIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function IconifyIcon({ icon, className, style, onClick }: IconifyIconProps) {
  return <Icon icon={icon} className={className} style={style} onClick={onClick} />;
}

// Common icon mappings from lucide-react to iconify (using Material Design Icons)
export const iconMap = {
  // Navigation & Actions
  home: 'mdi:home',
  search: 'mdi:magnify',
  menu: 'mdi:menu',
  close: 'mdi:close',
  check: 'mdi:check',
  x: 'mdi:close',
  
  // Game & Entertainment
  gamepad2: 'mdi:gamepad-variant',
  trophy: 'mdi:trophy',
  rocket: 'mdi:rocket-launch',
  spade: 'mdi:cards-spade',
  
  // User & Social
  users: 'mdi:account-group',
  user: 'mdi:account',
  bot: 'mdi:robot',
  
  // Communication
  send: 'mdi:send',
  mic: 'mdi:microphone',
  micOff: 'mdi:microphone-off',
  volume2: 'mdi:volume-high',
  volumeX: 'mdi:volume-off',
  messageSquare: 'mdi:message-text',
  
  // UI & Controls
  settings: 'mdi:cog',
  helpCircle: 'mdi:help-circle',
  circle: 'mdi:circle',
  trash: 'mdi:delete',
  edit: 'mdi:pencil',
  copy: 'mdi:content-copy',
  externalLink: 'mdi:open-in-new',
  
  // Media & Time
  play: 'mdi:play',
  pause: 'mdi:pause',
  rotateCw: 'mdi:refresh',
  clock: 'mdi:clock-outline',
  
  // Status & Indicators
  lock: 'mdi:lock',
  unlock: 'mdi:lock-open',
  eye: 'mdi:eye',
  eyeOff: 'mdi:eye-off',
  
  // Directional
  chevronRight: 'mdi:chevron-right',
  chevronDown: 'mdi:chevron-down',
  chevronUp: 'mdi:chevron-up',
  chevronLeft: 'mdi:chevron-left',
  arrowLeft: 'mdi:arrow-left',
  arrowRight: 'mdi:arrow-right',
  
  // UI Elements
  doorOpen: 'mdi:door-open',
  globe: 'mdi:web',
  target: 'mdi:target',
  layers: 'mdi:layers',
  frown: 'mdi:emoticon-sad',
  
  // Coding & Development
  code: 'mdi:code-tags',
  github: 'mdi:github',
  
  // Theme & Display
  sun: 'mdi:white-balance-sunny',
  moon: 'mdi:moon-waning-crescent',
  languages: 'mdi:translate',
  
  // Misc
  heart: 'mdi:heart',
  qrcode: 'mdi:qrcode',
  share: 'mdi:share-variant',
  download: 'mdi:download',
};

// Helper to get iconify icon name
export function getIconifyIcon(lucideIconName: string): string {
  const key = lucideIconName.toLowerCase().replace(/-/g, '');
  return iconMap[key as keyof typeof iconMap] || `mdi:${lucideIconName}`;
}
