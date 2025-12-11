export interface IMenuItem {
    text: string;
    url: string;
}

export interface CTAButton {
  topLabel: string;
  bottomLabel: string;
  href: string;
}

export interface HeroDetails {
    heading: string;
    subheading: string;
    centerImageSrc: string;
    imageAlt: string;
}

export interface IBenefit {
    title: string;
    description: string;
    imageSrc: string;
    bullets: IBenefitBullet[]
}

export interface IBenefitBullet {
  title: string;
  description: string;
  icon: string;
}

export interface IPricing {
  name: string;
  price: number | string;
  features: string[];
  description: string;
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface ITestimonial {
  name: string;
  role: string;
  message: string;
  avatar: string;
}

export interface ISocials {
  facebook?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  threads?: string;
  twitter?: string;
  youtube?: string;
  x?: string;
  [key: string]: string | undefined;
}

export interface SiteMetadata {
  title: string;
  description: string;
}

export interface SiteDetails {
  siteName: string;
  siteUrl: string;
  metadata: SiteMetadata;
  language: string;
  locale: string;
  siteLogo: string;
  googleAnalyticsId: string;
}

export interface HeaderContent {
  menuItems: IMenuItem[];
  primaryCtaLabel: string;
}

export interface FooterDetails {
  subheading: string;
  quickLinks: IMenuItem[];
  email: string;
  telephone: string;
  socials: ISocials;
}

export interface LandingContent {
  siteDetails: SiteDetails;
  header: HeaderContent;
  hero: HeroDetails;
  benefits: IBenefit[];
  testimonials: ITestimonial[];
  footer: FooterDetails;
  logosNote?: string;
}
