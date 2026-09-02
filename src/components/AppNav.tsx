import React, { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { MobileTopNav } from './MobileTopNav';

const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktopNav() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export const AppNav: React.FC = () => {
  const isDesktop = useIsDesktopNav();
  return isDesktop ? <TopNav /> : <MobileTopNav />;
};