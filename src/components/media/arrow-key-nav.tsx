'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * True when the key press belongs to something the person is typing in
 * (inputs, textareas, selects, contenteditable), so arrow keys must not
 * move between files.
 */
const isTypingTarget = (event: KeyboardEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
};

/** ← and → walk to the previous and next file page; renders nothing. */
const ArrowKeyNav = ({
  prev,
  next,
}: {
  prev: string | null;
  next: string | null;
}) => {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event)
      ) {
        return;
      }
      if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        router.push(next);
      } else if (event.key === 'ArrowLeft' && prev) {
        event.preventDefault();
        router.push(prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [prev, next, router]);
  return null;
};

export { ArrowKeyNav, isTypingTarget };
