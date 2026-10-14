"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDictionary } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";

/** Per browser: a shared laptop keeps its own choice. Off until someone turns it on. */
const STORAGE_KEY = "banabaconnect:new-report-sound";

// The saved choice, read with useSyncExternalStore: the server draws it off, then the browser
// shows what's saved. `memory` stands in when the browser blocks storage (e.g. private windows).
const listeners = new Set<() => void>();
let memory = false;

function readSaved(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return memory;
  }
}

function save(on: boolean) {
  memory = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Not saved, but it still works until the page is closed.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab turned it on or off.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

interface Sound {
  enabled: boolean;
  /** The browser lets the page play sound (only after a click or key press on it). */
  allowed: boolean;
  toggle: () => void;
}

const SoundContext = createContext<Sound | null>(null);

/** The alert's shape: frequencies in Hz, times in seconds. About 2.8 s in all. */
const ALERT = {
  // High pitches and fast beeps are what make a sound feel urgent.
  high: 1480,
  low: 1100,
  beep: 0.11,
  gap: 0.02,
  pairsPerBurst: 3,
  bursts: 3,
  pause: 0.22,
  // Square waves are loud; this is about as loud as a phone's notification.
  volume: 0.16,
} as const;

/**
 * Sounds like something needs attention now: fast high–low beeps (like an emergency vehicle's
 * hi-lo), in three bursts. Square waves carry across a noisy hall; a low-pass filter takes off
 * the harshest edge, and each beep fades in and out over 5 ms so it doesn't click.
 */
export function playAlert(context: BaseAudioContext) {
  const output = context.createGain();
  output.gain.value = ALERT.volume;
  output.connect(context.destination);
  const soften = context.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 3500;
  soften.connect(output);

  let at = context.currentTime + 0.05;
  for (let burst = 0; burst < ALERT.bursts; burst++) {
    for (let pair = 0; pair < ALERT.pairsPerBurst; pair++) {
      for (const frequency of [ALERT.high, ALERT.low]) {
        const tone = context.createOscillator();
        tone.type = "square";
        tone.frequency.value = frequency;
        const fade = context.createGain();
        fade.gain.setValueAtTime(0, at);
        fade.gain.linearRampToValueAtTime(1, at + 0.005);
        fade.gain.setValueAtTime(1, at + ALERT.beep - 0.005);
        fade.gain.linearRampToValueAtTime(0, at + ALERT.beep);
        tone.connect(fade).connect(soften);
        tone.start(at);
        tone.stop(at + ALERT.beep + 0.01);
        at += ALERT.beep + ALERT.gap;
      }
    }
    at += ALERT.pause;
  }
}

/**
 * Plays a sound when a new report arrives, on every dashboard page, if staff turned it on
 * (SoundToggle in Settings). For staff who aren't watching the screen during a busy night.
 */
export function NewReportSoundProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readSaved, () => false);
  const [allowed, setAllowed] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  /** Browsers only allow sound once the person has clicked or typed on the page. */
  const unlock = useCallback(async (): Promise<AudioContext | null> => {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setAllowed(audio.current.state === "running");
      return audio.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const onFirstInput = () => void unlock();
    window.addEventListener("pointerdown", onFirstInput, { once: true });
    window.addEventListener("keydown", onFirstInput, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInput);
      window.removeEventListener("keydown", onFirstInput);
    };
  }, [unlock]);

  // Listens for new reports only while the sound is on.
  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    (async () => {
      // Live updates follow row-level security, so they need the staff member's sign-in.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      channel = supabase
        .channel("new-report-sound")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
          if (audio.current?.state === "running") playAlert(audio.current);
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !enabled;
    save(next);
    // Turning it on is a click, which allows sound: play it once so staff know what to listen for.
    if (next) {
      void unlock().then((context) => {
        if (context?.state === "running") playAlert(context);
      });
    }
  }, [enabled, unlock]);

  return <SoundContext.Provider value={{ enabled, allowed, toggle }}>{children}</SoundContext.Provider>;
}

/**
 * The on/off switch for the new-report sound, with its state written out under the name. The
 * Settings page includes the explanation unless `compact` is requested.
 */
export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const sound = useContext(SoundContext);
  const t = useDictionary();
  if (!sound) return null;

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={sound.enabled}
        onClick={sound.toggle}
        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-page"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-snug text-ink">{t.sound.label}</span>
          <span className={`block text-xs font-bold ${sound.enabled ? "text-brand" : "text-muted"}`}>
            {sound.enabled ? t.sound.on : t.sound.off}
          </span>
          {!compact && <span className="mt-0.5 block text-xs text-muted">{t.sound.hint}</span>}
        </span>
        <span
          aria-hidden
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            sound.enabled ? "bg-brand" : "bg-line"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition ${
              sound.enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
      {sound.enabled && !sound.allowed && (
        <p className="px-3 pb-1 text-xs font-semibold text-warning">{t.sound.blocked}</p>
      )}
    </div>
  );
}
