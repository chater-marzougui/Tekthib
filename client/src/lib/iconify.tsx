import { Icon } from '@iconify/react';

// Helper component to use Iconify icons with consistent props
interface IconifyIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  color?: string;
}

export function IconifyIcon({ icon, className, style, onClick, color }: IconifyIconProps) {
  return <Icon icon={icon} className={className} style={{ ...style, color }} onClick={onClick} />;
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

// Suggested colors for different icon contexts
export const iconColors = {
  // Game & Entertainment
  gamepad: '#3b82f6', // blue-500
  trophy: '#eab308', // yellow-500
  rocket: '#8b5cf6', // violet-500
  
  // User & Social
  users: '#3b82f6', // blue-500
  user: '#6b7280', // gray-500
  bot: '#8b5cf6', // violet-500
  
  // Communication
  send: '#3b82f6', // blue-500
  mic: '#10b981', // green-500
  micOff: '#ef4444', // red-500
  volume: '#3b82f6', // blue-500
  volumeOff: '#6b7280', // gray-500
  message: '#3b82f6', // blue-500
  
  // UI & Controls
  settings: '#6b7280', // gray-500
  help: '#3b82f6', // blue-500
  trash: '#ef4444', // red-500
  edit: '#3b82f6', // blue-500
  copy: '#6b7280', // gray-500
  
  // Status & Indicators
  lock: '#ef4444', // red-500
  unlock: '#10b981', // green-500
  eye: '#6b7280', // gray-500
  
  // UI Elements
  doorOpen: '#3b82f6', // blue-500
  globe: '#10b981', // green-500
  target: '#ef4444', // red-500
  
  // Theme
  sun: '#f59e0b', // amber-500
  moon: '#6366f1', // indigo-500
  languages: '#8b5cf6', // violet-500
  
  // Misc
  heart: '#ef4444', // red-500
  qrcode: '#6b7280', // gray-500
  share: '#3b82f6', // blue-500
  download: '#10b981', // green-500
  clock: '#f59e0b', // amber-500
};

// Helper to get iconify icon name
export function getIconifyIcon(lucideIconName: string): string {
  const key = lucideIconName.toLowerCase().replace(/-/g, '');
  return iconMap[key as keyof typeof iconMap] || `mdi:${lucideIconName}`;
}

// Helper to get color for an icon
export function getIconColor(iconName: string): string | undefined {
  const key = iconName.toLowerCase().replace(/-/g, '').replace(/\d+$/, ''); // Remove numbers at end
  return iconColors[key as keyof typeof iconColors];
}
