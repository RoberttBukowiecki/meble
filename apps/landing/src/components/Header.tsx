'use client'

import Link from 'next/link';
import React, { useState } from 'react';
import { Transition } from '@headlessui/react';
import { HiOutlineXMark, HiBars3 } from 'react-icons/hi2';
import { FaFingerprint } from 'react-icons/fa';

import ThemeToggle from './ThemeToggle';
import LocaleSwitcher from './LocaleSwitcher';
import { Locale } from '@meble/i18n';
import { IMenuItem } from '@/types';

interface Props {
  siteName: string;
  menuItems: IMenuItem[];
  primaryCtaLabel: string;
  locale: Locale;
}

const Header: React.FC<Props> = ({ siteName, menuItems, primaryCtaLabel, locale }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="bg-transparent fixed top-0 left-0 right-0 md:absolute z-50 mx-auto w-full">
      <nav className="shadow-sm md:shadow-none bg-card/90 backdrop-blur-md border border-border/60 md:bg-transparent mx-auto flex justify-between items-center py-2 px-5 md:py-6 rounded-2xl md:border-0 md:rounded-none max-w-7xl">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <FaFingerprint className="text-foreground min-w-fit w-7 h-7" />
          <span className="manrope text-xl font-semibold text-foreground cursor-pointer">
            {siteName}
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          <ul className="hidden md:flex space-x-6">
            {menuItems.map(item => (
              <li key={item.text}>
                <Link href={item.url} className="text-foreground hover:text-foreground-accent transition-colors">
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
          <Link href="#cta" className="text-black bg-primary hover:bg-primary-accent px-6 py-2 rounded-full transition-colors font-semibold">
            {primaryCtaLabel}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
          <button
            onClick={toggleMenu}
            type="button"
            className="bg-primary text-black focus:outline-none rounded-full w-10 h-10 flex items-center justify-center"
            aria-controls="mobile-menu"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <HiOutlineXMark className="h-6 w-6" aria-hidden="true" />
            ) : (
              <HiBars3 className="h-6 w-6" aria-hidden="true" />
            )}
            <span className="sr-only">Toggle navigation</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu with Transition */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75 transform"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div id="mobile-menu" className="md:hidden bg-card shadow-lg border border-border mt-2 mx-5 rounded-2xl">
          <ul className="flex flex-col space-y-4 pt-1 pb-6 px-6">
            {menuItems.map(item => (
              <li key={item.text}>
                <Link href={item.url} className="text-foreground hover:text-primary block" onClick={toggleMenu}>
                  {item.text}
                </Link>
              </li>
            ))}
            <li>
              <Link href="#cta" className="text-black bg-primary hover:bg-primary-accent px-5 py-2 rounded-full block w-fit" onClick={toggleMenu}>
                {primaryCtaLabel}
              </Link>
            </li>
          </ul>
        </div>
      </Transition>
    </header>
  );
};

export default Header;
