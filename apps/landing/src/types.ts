export interface IMenuItem {
    text: string;
    url: string;
}

export interface HeroDetails {
    heading: string;
    subheading: string;
    centerImageSrc: string;
    imageAlt: string;
}

export interface CTAButton {
    href: string;
    topLabel: string;
    bottomLabel: string;
}

export interface CTADetails {
    heading: string;
    subheading: string;
    primaryButton: CTAButton;
    secondaryButton: CTAButton;
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
    icon: JSX.Element;
}

export interface IPricing {
    name: string;
    price: number | string;
    features: string[];
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

export interface IStats {
    title: string;
    icon: JSX.Element;
    description: string;
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
    pricing: IPricing[];
    testimonials: ITestimonial[];
    faqs: IFAQ[];
    stats: IStats[];
    cta: CTADetails;
    footer: FooterDetails;
    logosNote?: string;
}
