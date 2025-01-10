import { useState, useEffect } from 'react';

export function useScroll(threshold = 50) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > threshold);
      setIsScrollingUp(currentScrollY < lastScrollY || currentScrollY < threshold);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, threshold]);

  return {
    isScrolled,
    isScrollingUp,
    scrollY: lastScrollY
  };
}