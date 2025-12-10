import {
  FiBox,
  FiClipboard,
  FiCpu,
  FiGrid,
  FiLayers,
  FiLock,
  FiRotateCw,
  FiUploadCloud,
} from "react-icons/fi";

import { APP_NAME } from "@meble/constants";
import { Locale, defaultLocale } from "@meble/i18n";
import { getTranslations } from "next-intl/server";

import { LandingContent, IBenefitBullet, IStat } from "@/types";

type IconKey =
  | "grid"
  | "rotate"
  | "box"
  | "layers"
  | "clipboard"
  | "upload"
  | "cpu"
  | "lock";

const iconMap: Record<IconKey, JSX.Element> = {
  grid: <FiGrid size={26} />,
  rotate: <FiRotateCw size={26} />,
  box: <FiBox size={26} />,
  layers: <FiLayers size={26} />,
  clipboard: <FiClipboard size={26} />,
  upload: <FiUploadCloud size={26} />,
  cpu: <FiCpu size={26} />,
  lock: <FiLock size={26} />,
};

const statIconMap: Record<IconKey, JSX.Element> = {
  ...iconMap,
  upload: <FiUploadCloud size={34} className="text-foreground" />,
  grid: <FiGrid size={34} className="text-secondary" />,
  layers: <FiLayers size={34} className="text-primary" />,
};

type MessageContent = Omit<LandingContent, "benefits" | "stats" | "siteDetails"> & {
  siteDetails: LandingContent["siteDetails"];
  benefits: Array<
    Omit<LandingContent["benefits"][number], "bullets"> & {
      bullets: Array<Omit<IBenefitBullet, "icon"> & { icon: IconKey }>;
    }
  >;
  stats: Array<Omit<IStat, "icon"> & { icon: IconKey }>;
};

const replaceAppName = (value: string) => value.replace(/{appName}/g, APP_NAME);

const mapBenefitIcon = (key: IconKey) => iconMap[key] ?? iconMap.grid;
const mapStatIcon = (key: IconKey) => statIconMap[key] ?? statIconMap.grid;

const applyAppName = <T,>(obj: T): T => {
  if (typeof obj === "string") return replaceAppName(obj) as T;
  if (Array.isArray(obj)) return obj.map(applyAppName) as T;
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, applyAppName(v)])
    ) as T;
  }
  return obj;
};

export const getLandingContent = async (
  locale: Locale = defaultLocale
): Promise<LandingContent> => {
  const t = await getTranslations({ locale, namespace: "landing" });
  const rawContent = (t.raw("content") ?? {}) as MessageContent;
  const contentWithAppName = applyAppName(rawContent);

  return {
    ...contentWithAppName,
    benefits: contentWithAppName.benefits.map((benefit) => ({
      ...benefit,
      bullets: benefit.bullets.map((bullet) => ({
        ...bullet,
        icon: mapBenefitIcon(bullet.icon as IconKey),
      })),
    })),
    stats: contentWithAppName.stats.map((stat) => ({
      ...stat,
      icon: mapStatIcon(stat.icon as IconKey),
    })),
  };
};
