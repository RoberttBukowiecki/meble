import Link from 'next/link';
import React from 'react';
import { FaFingerprint } from 'react-icons/fa';

import { Locale } from '@meble/i18n';

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

          {footerDetails.email && <a href={`mailto:${footerDetails.email}`}  className="block text-foreground-accent hover:text-foreground">Email: {footerDetails.email}</a>}

          {footerDetails.telephone && <a href={`tel:${footerDetails.telephone}`} className="block text-foreground-accent hover:text-foreground">Phone: {footerDetails.telephone}</a>}

          {footerDetails.socials && (
            <div className="mt-5 flex items-center gap-5 flex-wrap text-foreground">
              {Object.keys(footerDetails.socials).map(platformName => {
                if (platformName && footerDetails.socials[platformName]) {
                  return (
                    <Link
                      href={footerDetails.socials[platformName]}
                      key={platformName}
                      aria-label={platformName}
                      className="hover:text-primary"
                    >
                      {getPlatformIconByName(platformName)}
                    </Link>
                  )
                }
              })}
            </div>
          )}
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
