import {
  FaceSmileIcon,
  ChartBarSquareIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  AdjustmentsHorizontalIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

import benefitOneImg from "../../public/img/benefit-one.png";
import benefitTwoImg from "../../public/img/benefit-two.png";
import { StaticImageData } from "next/image";
import { ReactElement } from "react";

export interface BulletPoint {
  titleKey: string;
  descKey: string;
  icon: ReactElement;
}

export interface BenefitData {
  titleKey: string;
  descKey: string;
  image: StaticImageData;
  bullets: BulletPoint[];
}

export const benefitOne: BenefitData = {
  titleKey: "benefits.one.title",
  descKey: "benefits.one.description",
  image: benefitOneImg,
  bullets: [
    {
      titleKey: "benefits.one.bullets.1.title",
      descKey: "benefits.one.bullets.1.description",
      icon: <FaceSmileIcon />,
    },
    {
      titleKey: "benefits.one.bullets.2.title",
      descKey: "benefits.one.bullets.2.description",
      icon: <ChartBarSquareIcon />,
    },
    {
      titleKey: "benefits.one.bullets.3.title",
      descKey: "benefits.one.bullets.3.description",
      icon: <CursorArrowRaysIcon />,
    },
  ],
};

export const benefitTwo: BenefitData = {
  titleKey: "benefits.two.title",
  descKey: "benefits.two.description",
  image: benefitTwoImg,
  bullets: [
    {
      titleKey: "benefits.two.bullets.1.title",
      descKey: "benefits.two.bullets.1.description",
      icon: <DevicePhoneMobileIcon />,
    },
    {
      titleKey: "benefits.two.bullets.2.title",
      descKey: "benefits.two.bullets.2.description",
      icon: <AdjustmentsHorizontalIcon />,
    },
    {
      titleKey: "benefits.two.bullets.3.title",
      descKey: "benefits.two.bullets.3.description",
      icon: <SunIcon />,
    },
  ],
};
