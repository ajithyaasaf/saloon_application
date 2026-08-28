import React from 'react';
import { ViewStyle } from 'react-native';
import {
  Search,
  Bell,
  Heart,
  SlidersHorizontal,
  Filter,
  Scissors,
  Feather,
  Sparkles,
  Palette,
  Brush,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
  ShieldCheck,
  Gift,
  Wallet,
  CreditCard,
  Lock,
  Check,
  CheckCircle2,
  User,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Share2,
  ThumbsUp,
  Tag,
  Info,
  AlertCircle,
  QrCode,
  Plus,
  Camera,
  Edit3,
  LogOut,
  LucideIcon,
  Crown,
  Zap,
  ShoppingBag,
  MessageSquare,
  Compass,
  Globe,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export type IconName =
  | 'search'
  | 'bell'
  | 'heart'
  | 'sliders'
  | 'filter'
  | 'scissors'
  | 'feather'
  | 'sparkles'
  | 'palette'
  | 'brush'
  | 'calendar'
  | 'clock'
  | 'map-pin'
  | 'phone'
  | 'mail'
  | 'star'
  | 'shield'
  | 'gift'
  | 'wallet'
  | 'credit-card'
  | 'lock'
  | 'check'
  | 'check-circle'
  | 'user'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-right'
  | 'chevron-left'
  | 'sun'
  | 'moon'
  | 'share'
  | 'share-2'
  | 'thumbs-up'
  | 'tag'
  | 'info'
  | 'alert-circle'
  | 'qr-code'
  | 'plus'
  | 'camera'
  | 'edit'
  | 'log-out'
  | 'crown'
  | 'zap'
  | 'shopping-bag'
  | 'message-square'
  | 'compass'
  | 'globe';

const iconMap: Record<IconName, LucideIcon> = {
  search: Search,
  bell: Bell,
  heart: Heart,
  sliders: SlidersHorizontal,
  filter: Filter,
  scissors: Scissors,
  feather: Feather,
  sparkles: Sparkles,
  palette: Palette,
  brush: Brush,
  calendar: Calendar,
  clock: Clock,
  'map-pin': MapPin,
  phone: Phone,
  mail: Mail,
  star: Star,
  shield: ShieldCheck,
  gift: Gift,
  wallet: Wallet,
  'credit-card': CreditCard,
  lock: Lock,
  check: Check,
  'check-circle': CheckCircle2,
  user: User,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  sun: Sun,
  moon: Moon,
  share: Share2,
  'share-2': Share2,
  'thumbs-up': ThumbsUp,
  tag: Tag,
  info: Info,
  'alert-circle': AlertCircle,
  'qr-code': QrCode,
  plus: Plus,
  camera: Camera,
  edit: Edit3,
  'log-out': LogOut,
  crown: Crown,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  'message-square': MessageSquare,
  compass: Compass,
  globe: Globe,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  style?: ViewStyle;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color,
  fill,
  strokeWidth = 2,
  style,
}) => {
  const { colors } = useTheme();
  const IconComponent = iconMap[name] || Sparkles;
  const iconColor = color || colors.textPrimary;

  return (
    <IconComponent
      size={size}
      color={iconColor}
      fill={fill || 'transparent'}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};
