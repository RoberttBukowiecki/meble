import Link from 'next/link';
import React from 'react';
import { FaFingerprint } from 'react-icons/fa';

import { Locale } from '@meble/i18n';
import { COMPANY_INFO, SOCIAL_LINKS } from '@meble/constants';

import { FooterDetails, SiteDetails } from '@/types';
import { getPlatformIconByName } from '@/utils';

interface Props {
  siteDetails: SiteDetails;
  footerDetails: FooterDetails;
  locale: Locale;
}

const Footer: React.FC<Props> = ({ siteDetails, footerDetails, locale }) => {
  const quickLinksLabel = locale === 'pl' ? 'Szybkie linki' : 'Quick Links';
  const contactLabel = locale === 'pl' ? 'Kontakt' : 'Contact';
  const rightsText =
    locale === 'pl'
      ? `Wszelkie prawa zastrzeżone.`
      : `All rights reserved.`;
  const builtByLabel =
    locale === 'pl'
      ? 'Tworzone w Polsce z myślą o zespołach stolarskich.'
      : 'Built in Poland for modern woodworking teams.';

  return (
    <footer className="bg-muted text-foreground py-10 mt-12 border-t border-border">
      <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <FaFingerprint className="min-w-fit w-5 h-5 md:w-7 md:h-7" />
            <h3 className="manrope text-xl font-semibold cursor-pointer">
              {siteDetails.siteName}
            </h3>
          </Link>
          <p className="mt-3.5 text-foreground-accent">
            {footerDetails.subheading}
          </p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">{quickLinksLabel}</h4>
          <ul className="text-foreground-accent">
            {footerDetails.quickLinks.map(link => (
              <li key={link.text} className="mb-2">
                <Link href={link.url} className="hover:text-foreground">{link.text}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">{contactLabel}</h4>
          <div className="space-y-2">
            <a href={`mailto:${COMPANY_INFO.email}`}  className="block text-foreground-accent hover:text-foreground">Email: {COMPANY_INFO.email}</a>
            <a href={`tel:${COMPANY_INFO.phone}`} className="block text-foreground-accent hover:text-foreground">Tel: {COMPANY_INFO.phone}</a>
            <p className="text-foreground-accent">NIP: {COMPANY_INFO.nip}</p>
            <p className="text-foreground-accent">{COMPANY_INFO.fullAddress}</p>
          </div>

          <div className="mt-5 flex items-center gap-5 flex-wrap text-foreground">
            {Object.keys(SOCIAL_LINKS).map(platformName => {
              // @ts-ignore
              const url = SOCIAL_LINKS[platformName];
              if (url) {
                return (
                  <Link
                    href={url}
                    key={platformName}
                    aria-label={platformName}
                    className="hover:text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getPlatformIconByName(platformName)}
                  </Link>
                )
              }
            })}
          </div>
        </div>
      </div>
      <div className="mt-8 md:text-center text-foreground-accent px-6 space-y-1">
        <p>Copyright &copy; {new Date().getFullYear()} {siteDetails.siteName}. {rightsText}</p>
        <p className="text-sm">{builtByLabel}</p>
      </div>
    </footer>
  );
};

export default Footer;
