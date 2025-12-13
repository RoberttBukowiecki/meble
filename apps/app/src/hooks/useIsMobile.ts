'use client';

import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;
const DEBOUNCE_DELAY = 150;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  }, []);

  useEffect(() => {
    // Initial check
    checkMobile();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkMobile]);

  return isMobile;
}

export { MOBILE_BREAKPOINT };
