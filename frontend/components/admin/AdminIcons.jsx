// DentaFlow Admin — lucide-backed icon set with inline SVG fallbacks.
// Consistency: every icon renders through the same stroke-based lucide-react
// set where an equivalent exists, falling back to the hand-tuned inline SVG
// paths (e.g. the tooth brand glyph) for anything lucide does not ship.
import {
  Users,
  Stethoscope,
  UserCog,
  Calendar,
  DollarSign,
  AlertTriangle,
  PackageX,
  ClipboardList,
  ShieldCheck,
  ShoppingCart,
  MessageSquare,
  Star,
  Sparkles,
  Download,
  Printer,
  Table,
  ChevronRight,
  ChevronLeft,
  Bell,
  Search,
  Check,
  X,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowRight,
  Package,
  Pill,
  UserPlus,
  Eye,
  Pencil,
  SlidersHorizontal,
  RefreshCw,
  Play,
  Gauge,
  Layers,
  Home,
  Plus,
  Workflow,
  HelpCircle,
} from "lucide-react";

// Inline fallback paths (flat SVGs that have no clean lucide equivalent).
const PATHS = {
  tooth: (
    <path
      d="M12 3.2c-1.6-1.9-4.6-2.6-6.9-1C2.6 4 2.3 7.2 3.1 9.3c.6 1.5 1.7 2.1 2.2 3.6 1 3-1.4 4.8-2.4 7.2-.7 1.7-.4 3 1.2 3 2.2 0 3.4-2 4-4.1.3-1.1.5-2.3 1.9-2.3s1.6 1.2 1.9 2.3c.6 2.1 1.8 4.1 4 4.1 1.6 0 1.9-1.3 1.2-3-1-2.4-3.4-4.2-2.4-7.2.5-1.5 1.6-2.1 2.2-3.6.8-2.1.5-5.3-2-6.1-2.3-1.6-5.3-.9-6.9 1z"
    />
  ),
};

const LUCIDE = {
  patients: Users,
  doctors: Stethoscope,
  services: Stethoscope,
  stethoscope: Stethoscope,
  staff: UserCog,
  calendar: Calendar,
  schedule: Calendar,
  revenue: DollarSign,
  alert: AlertTriangle,
  expiry: PackageX,
  pending: ClipboardList,
  shield: ShieldCheck,
  purchase: ShoppingCart,
  message: MessageSquare,
  star: Star,
  ai: Sparkles,
  download: Download,
  printer: Printer,
  table: Table,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  bell: Bell,
  search: Search,
  check: Check,
  x: X,
  clock: Clock,
  activity: Activity,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  bolt: Zap,
  arrowRight: ArrowRight,
  box: Package,
  pill: Pill,
  userPlus: UserPlus,
  eye: Eye,
  edit: Pencil,
  sliders: SlidersHorizontal,
  refresh: RefreshCw,
  play: Play,
  gauge: Gauge,
  layers: Layers,
  home: Home,
  plus: Plus,
  automation: Workflow,
  inquiry: HelpCircle,
};

export default function AdminIcon({ name, size = 18, strokeWidth = 1.7, className = "" }) {
  const Lucide = LUCIDE[name];
  if (Lucide) {
    return <Lucide size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
  }
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}