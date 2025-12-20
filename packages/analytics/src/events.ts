/**
 * Analytics event names - centralized enum for type safety
 */
export enum AnalyticsEvent {
  // ============================================
  // LANDING - Conversion tracking
  // ============================================
  LANDING_PAGE_VIEW = 'landing_page_view',
  LANDING_CTA_CLICKED = 'landing_cta_clicked',
  LANDING_ARTICLE_VIEW = 'landing_article_view',
  LANDING_ARTICLE_CTA_CLICKED = 'landing_article_cta_clicked',

  // ============================================
  // LANDING - Engagement tracking
  // ============================================
  LANDING_BLOG_CARD_CLICKED = 'landing_blog_card_clicked',
  LANDING_VIDEO_PLAYED = 'landing_video_played',
  LANDING_FAQ_EXPANDED = 'landing_faq_expanded',
  LANDING_SOCIAL_CLICKED = 'landing_social_clicked',
  LANDING_COOKIE_ACCEPTED = 'landing_cookie_accepted',
  LANDING_COOKIE_DECLINED = 'landing_cookie_declined',
  LANDING_SCROLL_DEPTH = 'landing_scroll_depth',
  LANDING_MOBILE_MENU_TOGGLED = 'landing_mobile_menu_toggled',

  // ============================================
  // APP - Session & Authentication
  // ============================================
  APP_SESSION_STARTED = 'app_session_started',
  APP_PAGE_VIEW = 'app_page_view',
  AUTH_SIGNUP_COMPLETED = 'auth_signup_completed',
  AUTH_LOGIN_COMPLETED = 'auth_login_completed',

  // Design Actions
  PART_ADDED = 'part_added',
  CABINET_CREATED = 'cabinet_created',
  TEMPLATE_SELECTED = 'template_selected',
  CONFIG_OPENED = 'config_opened',
  INTERIOR_CONFIGURED = 'interior_configured',

  // ============================================
  // EXPORT - Critical conversion events
  // ============================================
  EXPORT_INITIATED = 'export_initiated',
  EXPORT_VALIDATION_FAILED = 'export_validation_failed',
  EXPORT_COMPLETED = 'export_completed',
  SMART_EXPORT_USED = 'smart_export_used',

  // ============================================
  // MONETIZATION - Critical revenue events
  // ============================================
  PURCHASE_MODAL_OPENED = 'purchase_modal_opened',
  PACKAGE_SELECTED = 'package_selected',
  PAYMENT_PROVIDER_SELECTED = 'payment_provider_selected',
  PURCHASE_STARTED = 'purchase_started',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',

  // ============================================
  // UX & ENGAGEMENT
  // ============================================
  LANGUAGE_CHANGED = 'language_changed',
  VALIDATION_ERROR = 'validation_error',
  CONTACT_FORM_SUBMITTED = 'contact_form_submitted',
  NEWSLETTER_SUBSCRIBED = 'newsletter_subscribed',
  POPUP_WIDGET_OPENED = 'popup_widget_opened',
  POPUP_WIDGET_SUBMITTED = 'popup_widget_submitted',
}

/**
 * Event properties - typed for each event
 */
export interface EventProperties {
  // Landing events
  [AnalyticsEvent.LANDING_PAGE_VIEW]: {
    page_path: string;
    locale?: string;
  };
  [AnalyticsEvent.LANDING_CTA_CLICKED]: {
    location: 'hero' | 'pricing' | 'footer' | 'cta_section' | 'header' | 'feature' | 'pillar_design' | 'pillar_order';
    cta_text?: string;
  };
  [AnalyticsEvent.LANDING_ARTICLE_VIEW]: {
    article_slug: string;
    article_title: string;
    category?: string;
  };
  [AnalyticsEvent.LANDING_ARTICLE_CTA_CLICKED]: {
    article_slug: string;
    cta_location: 'inline' | 'sidebar' | 'bottom';
  };

  // Landing engagement events
  [AnalyticsEvent.LANDING_BLOG_CARD_CLICKED]: {
    article_slug: string;
    article_title: string;
    category: string;
    featured: boolean;
    source: 'blog_listing' | 'related_articles' | 'homepage';
  };
  [AnalyticsEvent.LANDING_VIDEO_PLAYED]: {
    video_id: string;
    video_title?: string;
    page_path: string;
  };
  [AnalyticsEvent.LANDING_FAQ_EXPANDED]: {
    faq_item: string;
    faq_question: string;
    page_path: string;
  };
  [AnalyticsEvent.LANDING_SOCIAL_CLICKED]: {
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
    link_url: string;
  };
  [AnalyticsEvent.LANDING_COOKIE_ACCEPTED]: Record<string, never>;
  [AnalyticsEvent.LANDING_COOKIE_DECLINED]: Record<string, never>;
  [AnalyticsEvent.LANDING_SCROLL_DEPTH]: {
    depth: 25 | 50 | 75 | 100;
    page_path: string;
  };
  [AnalyticsEvent.LANDING_MOBILE_MENU_TOGGLED]: {
    action: 'open' | 'close';
  };

  // App session events
  [AnalyticsEvent.APP_SESSION_STARTED]: {
    entry_point?: 'direct' | 'landing' | 'article' | 'external';
    is_authenticated?: boolean;
    user_type?: 'guest' | 'authenticated';
    referrer_source?: string; // e.g., 'blog:article-slug', 'landing:home', 'external:google.com'
    referrer_url?: string; // Full referrer URL for detailed analysis
  };
  [AnalyticsEvent.APP_PAGE_VIEW]: {
    page_path: string;
  };

  // Authentication events
  [AnalyticsEvent.AUTH_SIGNUP_COMPLETED]: {
    method: 'email' | 'google' | 'github';
    has_referral?: boolean;
  };
  [AnalyticsEvent.AUTH_LOGIN_COMPLETED]: {
    method: 'email' | 'google' | 'github';
  };

  // Design events
  [AnalyticsEvent.PART_ADDED]: {
    part_type?: string;
  };
  [AnalyticsEvent.CABINET_CREATED]: {
    template_type: string;
    template_id?: string;
  };
  [AnalyticsEvent.TEMPLATE_SELECTED]: {
    template_id: string;
    template_name: string;
    category?: string;
  };
  [AnalyticsEvent.CONFIG_OPENED]: {
    config_type: 'interior' | 'material' | 'dimensions' | 'edge_banding' | 'legs' | 'fronts' | 'side_fronts' | 'decorative_panels' | 'handles' | 'drawers';
  };
  [AnalyticsEvent.INTERIOR_CONFIGURED]: {
    zone_count: number;
    has_drawers: boolean;
    has_shelves: boolean;
    depth_level: number;
  };

  // Export events
  [AnalyticsEvent.EXPORT_INITIATED]: {
    parts_count: number;
    cabinet_count?: number;
  };
  [AnalyticsEvent.EXPORT_VALIDATION_FAILED]: {
    error_count: number;
    error_types?: string[];
  };
  [AnalyticsEvent.EXPORT_COMPLETED]: {
    parts_count: number;
    used_credit: boolean;
    export_format?: 'csv' | 'pdf' | 'dxf';
  };
  [AnalyticsEvent.SMART_EXPORT_USED]: {
    parts_count: number;
  };

  // Monetization events
  [AnalyticsEvent.PURCHASE_MODAL_OPENED]: {
    trigger: 'export' | 'badge' | 'manual' | 'limit_reached' | 'export_no_credits';
  };
  [AnalyticsEvent.PACKAGE_SELECTED]: {
    package_id: string;
    package_name?: string;
    price: number;
    credits?: number;
  };
  [AnalyticsEvent.PAYMENT_PROVIDER_SELECTED]: {
    provider: 'przelewy24' | 'payu' | 'stripe';
    package_id: string;
  };
  [AnalyticsEvent.PURCHASE_STARTED]: {
    package_id: string;
    amount: number;
    provider: 'przelewy24' | 'payu' | 'stripe';
    currency?: string;
  };
  [AnalyticsEvent.PAYMENT_COMPLETED]: {
    package_id: string;
    amount: number;
    provider: string;
    transaction_id?: string;
  };
  [AnalyticsEvent.PAYMENT_FAILED]: {
    package_id: string;
    amount: number;
    provider: string;
    error_code?: string;
    error_message?: string;
  };

  // UX events
  [AnalyticsEvent.LANGUAGE_CHANGED]: {
    from_locale: string;
    to_locale: string;
  };
  [AnalyticsEvent.VALIDATION_ERROR]: {
    field: string;
    error_type: string;
    context?: string;
  };
  [AnalyticsEvent.CONTACT_FORM_SUBMITTED]: {
    form_location: 'landing' | 'landing2' | 'app';
    subject?: string;
  };
  [AnalyticsEvent.NEWSLETTER_SUBSCRIBED]: {
    source: 'landing' | 'landing2' | 'footer' | 'popup';
  };
  [AnalyticsEvent.POPUP_WIDGET_OPENED]: {
    widget_type: string;
    trigger: 'click' | 'auto' | 'exit_intent';
  };
  [AnalyticsEvent.POPUP_WIDGET_SUBMITTED]: {
    widget_type: string;
    submission_type: 'contact' | 'feedback' | 'question';
  };
}

/**
 * Helper type to get properties for a specific event
 */
export type EventPropertiesFor<E extends AnalyticsEvent> = E extends keyof EventProperties
  ? EventProperties[E]
  : Record<string, unknown>;
