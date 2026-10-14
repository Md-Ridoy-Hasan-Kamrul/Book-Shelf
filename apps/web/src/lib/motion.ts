import gsap from 'gsap';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function revealOnScroll(target: Element) {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, y: 0 });
    return () => {};
  }
  gsap.set(target, { opacity: 0, y: 24 });
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          gsap.to(target, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
          observer.disconnect();
        }
      }
    },
    { threshold: 0.15 },
  );
  observer.observe(target);
  return () => observer.disconnect();
}

export function hoverLift(target: Element) {
  if (prefersReducedMotion()) return () => {};
  const onEnter = () => gsap.to(target, { y: -2, duration: 0.2, ease: 'power1.out' });
  const onLeave = () => gsap.to(target, { y: 0, duration: 0.2, ease: 'power1.out' });
  target.addEventListener('mouseenter', onEnter);
  target.addEventListener('mouseleave', onLeave);
  return () => {
    target.removeEventListener('mouseenter', onEnter);
    target.removeEventListener('mouseleave', onLeave);
    gsap.set(target, { clearProps: 'transform' });
  };
}

export function countUp(el: Element, to: number, duration = 0.6) {
  if (prefersReducedMotion()) {
    el.textContent = String(to);
    return () => {};
  }
  const obj = { val: 0 };
  const tween = gsap.to(obj, {
    val: to,
    duration,
    roundProps: 'val',
    onUpdate: () => {
      el.textContent = String(obj.val);
    },
  });
  return () => tween.kill();
}
