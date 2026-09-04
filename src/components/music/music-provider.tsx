'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Owns the one <audio> element for the whole site. Mounted from the root
 * layout so it survives client navigations: the music keeps playing while
 * pages come and go underneath. The nav control only talks to it through
 * this context.
 *
 * The queue is the track list shuffled once per page load and then walked
 * in order, wrapping at the end: nothing repeats until every track has
 * had its turn. `enabled` is what the visitor asked for (remembered in
 * localStorage); `playing` is what the browser actually allows. On a
 * fresh load with music enabled, autoplay is usually blocked until the
 * first gesture, so we wait for one and resume then.
 */

type MusicState = {
  enabled: boolean;
  playing: boolean;
  toggle: () => void;
  next: () => void;
};

const MusicContext = createContext<MusicState | null>(null);

const STORAGE_KEY = 'frikiparty.music';
const TARGET_VOLUME = 0.45;
const FADE_MS = 700;
const FADE_STEP_MS = 40;

const readPreference = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

const writePreference = (enabled: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Private mode or blocked storage: the choice just won't stick.
  }
};

type FadeTimer = { current: ReturnType<typeof setInterval> | null };

const stopFade = (timer: FadeTimer) => {
  if (timer.current) {
    clearInterval(timer.current);
    timer.current = null;
  }
};

/**
 * Ramps the element's volume to `target` over FADE_MS, then runs `done`.
 * Progress is measured on the clock rather than counted in ticks, so a
 * background tab (where browsers throttle timers) still finishes on time.
 */
const fadeTo = (
  audio: HTMLAudioElement,
  timer: FadeTimer,
  target: number,
  done?: () => void,
) => {
  stopFade(timer);
  const from = audio.volume;
  const startedAt = performance.now();
  timer.current = setInterval(() => {
    const progress = Math.min(1, (performance.now() - startedAt) / FADE_MS);
    audio.volume = from + (target - from) * progress;
    if (progress >= 1) {
      stopFade(timer);
      done?.();
    }
  }, FADE_STEP_MS);
};

/** Fisher–Yates over a copy. */
const shuffled = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

const MusicProvider = ({
  children,
  tracks,
}: {
  children: ReactNode;
  tracks: string[];
}) => {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  // -1 until the first track is loaded, so the first play starts at 0.
  const positionRef = useRef(-1);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Points the element at the queue's next track (wrapping) and plays it. */
  const advance = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    const queue = queueRef.current;
    if (!audio || queue.length === 0) {
      return false;
    }
    positionRef.current = (positionRef.current + 1) % queue.length;
    audio.src = queue[positionRef.current] as string;
    try {
      audio.volume = 0;
      await audio.play();
      fadeTo(audio, fadeTimer, TARGET_VOLUME);
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      return false;
    }
  }, []);

  /** Resumes the current track, or starts the queue if nothing is loaded yet. */
  const attemptPlay = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) {
      return false;
    }
    if (positionRef.current < 0) {
      return advance();
    }
    try {
      audio.volume = 0;
      await audio.play();
      fadeTo(audio, fadeTimer, TARGET_VOLUME);
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      return false;
    }
  }, [advance]);

  // The element is created once, by hand: it never renders into the tree,
  // so nothing about the page layout can touch it. The queue is shuffled
  // here too, so every load gets its own order and its own first track.
  useEffect(() => {
    if (tracks.length === 0) {
      return;
    }
    queueRef.current = shuffled(tracks);
    positionRef.current = -1;
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const onEnded = () => {
      advance();
    };
    audio.addEventListener('ended', onEnded);
    // A missing or corrupt file just moves the queue along.
    audio.addEventListener('error', onEnded);

    return () => {
      stopFade(fadeTimer);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onEnded);
      audio.pause();
      audio.removeAttribute('src');
      audioRef.current = null;
    };
  }, [advance, tracks]);

  // Remembered "on": start now if the browser allows it, otherwise on the
  // first gesture anywhere on the page.
  useEffect(() => {
    if (tracks.length === 0 || !readPreference()) {
      return;
    }
    setEnabled(true);
    let cancelled = false;
    const removeListeners = () => {
      document.removeEventListener('pointerdown', resumeOnGesture);
      document.removeEventListener('keydown', resumeOnGesture);
    };
    const resumeOnGesture = () => {
      if (cancelled) {
        return;
      }
      attemptPlay().then((ok) => {
        if (ok) {
          removeListeners();
        }
      });
    };
    attemptPlay().then((ok) => {
      if (!ok && !cancelled) {
        document.addEventListener('pointerdown', resumeOnGesture);
        document.addEventListener('keydown', resumeOnGesture);
      }
    });
    return () => {
      cancelled = true;
      removeListeners();
    };
  }, [attemptPlay, tracks.length]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (enabled) {
      setEnabled(false);
      writePreference(false);
      fadeTo(audio, fadeTimer, 0, () => {
        audio.pause();
        setPlaying(false);
      });
      return;
    }
    setEnabled(true);
    writePreference(true);
    attemptPlay();
  }, [attemptPlay, enabled]);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) {
      return;
    }
    // A short fade out so the cut isn't abrupt, then the next in the queue.
    fadeTo(audio, fadeTimer, 0, () => {
      advance();
    });
  }, [advance, enabled]);

  return (
    <MusicContext.Provider value={{ enabled, playing, toggle, next }}>
      {children}
    </MusicContext.Provider>
  );
};

/** Null outside the provider (e.g. a page rendered without the root layout). */
const useMusic = () => useContext(MusicContext);

export { MusicProvider, useMusic };
