import { useEffect } from 'react';
import { revealOnScroll } from '../../lib/motion';

export default function ScrollReveal() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const el of document.querySelectorAll('[data-reveal]')) {
      cleanups.push(revealOnScroll(el));
    }
    return () => {
      for (const fn of cleanups) fn();
    };
  }, []);
  return null;
}
