import { cn } from "@/lib/utils";
import { CabinetType } from "@/types";

/**
 * Cabinet schematic illustrations - simplified technical drawings
 * Used in CabinetTemplateDialog for template selection
 */
export const CabinetIllustration = ({
  type,
  className,
}: {
  type: CabinetType;
  className?: string;
}) => {
  const baseClass = cn("transition-all duration-500", className);

  switch (type) {
    case "KITCHEN":
      return <KitchenCabinetIcon className={baseClass} />;
    case "CORNER_INTERNAL":
      return <CornerCabinetIcon className={baseClass} />;
    case "WALL":
      return <WallCabinetIcon className={baseClass} />;
    case "WARDROBE":
      return <WardrobeIcon className={baseClass} />;
    case "BOOKSHELF":
      return <BookshelfIcon className={baseClass} />;
    case "DRAWER":
      return <DrawerCabinetIcon className={baseClass} />;
    default:
      return null;
  }
};

/**
 * Kitchen base cabinet - with drawers, door, countertop and legs
 */
const KitchenCabinetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Countertop */}
    <rect
      x="4"
      y="4"
      width="72"
      height="5"
      rx="1"
      className="fill-current opacity-25 group-hover:opacity-40 transition-opacity"
    />
    <rect
      x="4"
      y="4"
      width="72"
      height="5"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    {/* Cabinet body */}
    <rect
      x="8"
      y="9"
      width="64"
      height="48"
      rx="2"
      className="fill-current opacity-10 group-hover:opacity-20 transition-opacity"
    />
    <rect x="8" y="9" width="64" height="48" rx="2" className="stroke-current" strokeWidth="2" />
    {/* Top drawer */}
    <rect
      x="12"
      y="13"
      width="56"
      height="12"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="36"
      y="17"
      width="8"
      height="3"
      rx="0.5"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Bottom drawer */}
    <rect
      x="12"
      y="27"
      width="56"
      height="12"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="36"
      y="31"
      width="8"
      height="3"
      rx="0.5"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Door panel */}
    <rect
      x="12"
      y="41"
      width="56"
      height="12"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="60"
      y="44"
      width="5"
      height="6"
      rx="1"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Legs */}
    <rect x="12" y="57" width="5" height="9" rx="1" className="fill-current opacity-30" />
    <rect x="63" y="57" width="5" height="9" rx="1" className="fill-current opacity-30" />
  </svg>
);

/**
 * Corner cabinet - L-shaped, top-down plan view
 */
const CornerCabinetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* L-shape body */}
    <path
      d="M8 8 L8 62 L36 62 L36 36 L62 36 L62 8 Z"
      className="fill-current opacity-10 group-hover:opacity-20 transition-opacity"
    />
    <path
      d="M8 8 L8 62 L36 62 L36 36 L62 36 L62 8 Z"
      className="stroke-current"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Inner corner highlight */}
    <circle
      cx="36"
      cy="36"
      r="3"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />

    {/* Door lines on left wing */}
    <line x1="14" y1="14" x2="14" y2="56" className="stroke-current opacity-40" strokeWidth="1.5" />
    <line x1="30" y1="14" x2="30" y2="56" className="stroke-current opacity-40" strokeWidth="1.5" />

    {/* Door lines on right wing */}
    <line x1="42" y1="14" x2="42" y2="30" className="stroke-current opacity-40" strokeWidth="1.5" />
    <line x1="56" y1="14" x2="56" y2="30" className="stroke-current opacity-40" strokeWidth="1.5" />

    {/* Handle dots */}
    <circle
      cx="18"
      cy="38"
      r="2"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />
    <circle
      cx="49"
      cy="22"
      r="2"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />

    {/* Dimension arrows hint */}
    <path
      d="M72 8 L72 36"
      className="stroke-current opacity-30"
      strokeWidth="1"
      strokeDasharray="3 2"
    />
    <path
      d="M36 72 L8 72"
      className="stroke-current opacity-30"
      strokeWidth="1"
      strokeDasharray="3 2"
    />
  </svg>
);

/**
 * Wall-mounted cabinet - floating with mounting brackets
 */
const WallCabinetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wall line */}
    <line x1="0" y1="4" x2="80" y2="4" className="stroke-current opacity-20" strokeWidth="8" />
    {/* Mounting brackets */}
    <rect x="16" y="8" width="4" height="8" className="fill-current opacity-40" />
    <rect x="60" y="8" width="4" height="8" className="fill-current opacity-40" />
    {/* Cabinet body */}
    <rect
      x="8"
      y="16"
      width="64"
      height="36"
      rx="2"
      className="fill-current opacity-10 group-hover:opacity-20 transition-opacity"
    />
    <rect x="8" y="16" width="64" height="36" rx="2" className="stroke-current" strokeWidth="2" />
    {/* Double doors */}
    <rect
      x="12"
      y="20"
      width="26"
      height="28"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="42"
      y="20"
      width="26"
      height="28"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    {/* Handles */}
    <rect
      x="34"
      y="30"
      width="2"
      height="10"
      rx="0.5"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />
    <rect
      x="44"
      y="30"
      width="2"
      height="10"
      rx="0.5"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />
    {/* Lift-up indicator arrow */}
    <path
      d="M40 58 L36 64 L44 64 Z"
      className="fill-current opacity-30 group-hover:opacity-60 transition-opacity"
    />
  </svg>
);

/**
 * Wardrobe - tall cabinet with double doors
 */
const WardrobeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cabinet body */}
    <rect
      x="12"
      y="4"
      width="56"
      height="58"
      rx="2"
      className="fill-current opacity-10 group-hover:opacity-20 transition-opacity"
    />
    <rect x="12" y="4" width="56" height="58" rx="2" className="stroke-current" strokeWidth="2" />
    {/* Double doors */}
    <rect
      x="16"
      y="8"
      width="22"
      height="50"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="42"
      y="8"
      width="22"
      height="50"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    {/* Handles */}
    <rect
      x="34"
      y="28"
      width="2"
      height="14"
      rx="0.5"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />
    <rect
      x="44"
      y="28"
      width="2"
      height="14"
      rx="0.5"
      className="fill-current opacity-50 group-hover:opacity-80 transition-opacity"
    />
    {/* Hanger rod hint */}
    <line
      x1="20"
      y1="16"
      x2="60"
      y2="16"
      className="stroke-current opacity-30"
      strokeWidth="1"
      strokeDasharray="2 2"
    />
    {/* Legs */}
    <rect x="16" y="62" width="4" height="6" rx="1" className="fill-current opacity-30" />
    <rect x="60" y="62" width="4" height="6" rx="1" className="fill-current opacity-30" />
  </svg>
);

/**
 * Bookshelf - open shelving unit with items
 */
const BookshelfIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Frame */}
    <rect
      x="12"
      y="4"
      width="56"
      height="62"
      rx="2"
      className="fill-current opacity-5 group-hover:opacity-10 transition-opacity"
    />
    <rect x="12" y="4" width="56" height="62" rx="2" className="stroke-current" strokeWidth="2" />
    {/* Shelves */}
    <line x1="12" y1="18" x2="68" y2="18" className="stroke-current opacity-60" strokeWidth="2" />
    <line x1="12" y1="32" x2="68" y2="32" className="stroke-current opacity-60" strokeWidth="2" />
    <line x1="12" y1="46" x2="68" y2="46" className="stroke-current opacity-60" strokeWidth="2" />
    {/* Books/items on shelves */}
    <rect
      x="18"
      y="8"
      width="8"
      height="10"
      rx="1"
      className="fill-current opacity-20 group-hover:opacity-40 transition-opacity"
    />
    <rect
      x="28"
      y="10"
      width="6"
      height="8"
      rx="1"
      className="fill-current opacity-15 group-hover:opacity-30 transition-opacity"
    />
    <rect
      x="36"
      y="9"
      width="10"
      height="9"
      rx="1"
      className="fill-current opacity-25 group-hover:opacity-45 transition-opacity"
    />
    <rect
      x="20"
      y="22"
      width="12"
      height="10"
      rx="1"
      className="fill-current opacity-20 group-hover:opacity-40 transition-opacity"
    />
    <rect
      x="50"
      y="36"
      width="14"
      height="10"
      rx="1"
      className="fill-current opacity-20 group-hover:opacity-40 transition-opacity"
    />
    <rect
      x="18"
      y="50"
      width="10"
      height="12"
      rx="1"
      className="fill-current opacity-15 group-hover:opacity-30 transition-opacity"
    />
  </svg>
);

/**
 * Drawer cabinet - multiple drawer fronts
 */
const DrawerCabinetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cabinet body */}
    <rect
      x="12"
      y="6"
      width="56"
      height="56"
      rx="2"
      className="fill-current opacity-10 group-hover:opacity-20 transition-opacity"
    />
    <rect x="12" y="6" width="56" height="56" rx="2" className="stroke-current" strokeWidth="2" />
    {/* Drawer 1 */}
    <rect
      x="16"
      y="10"
      width="48"
      height="14"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="36"
      y="14"
      width="8"
      height="4"
      rx="1"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Drawer 2 */}
    <rect
      x="16"
      y="26"
      width="48"
      height="14"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="36"
      y="30"
      width="8"
      height="4"
      rx="1"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Drawer 3 */}
    <rect
      x="16"
      y="42"
      width="48"
      height="16"
      rx="1"
      className="stroke-current opacity-60"
      strokeWidth="1.5"
    />
    <rect
      x="36"
      y="47"
      width="8"
      height="4"
      rx="1"
      className="fill-current opacity-40 group-hover:opacity-70 transition-opacity"
    />
    {/* Legs */}
    <rect x="16" y="62" width="4" height="6" rx="1" className="fill-current opacity-30" />
    <rect x="60" y="62" width="4" height="6" rx="1" className="fill-current opacity-30" />
  </svg>
);
