"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useDictionary } from "@/components/I18nProvider";
import { TUTORIAL_STEPS, type TutorialStep } from "@/lib/tutorialSteps";

/** Kept for this tab only, so a reload or a slow page doesn't lose the staff member's place. */
const STORAGE_KEY = "tutorial";
/** How long to wait for a step's part of the page before going on without it. */
const WAIT_MS = 4000;
const GAP = 16;
const PAD = 6;
const EDGE = 16;
const CARD_WIDTH = 360;

interface Tour {
  step: number;
  /** The report opened during the tutorial, for the steps on a report's page. */
  reportHref: string | null;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function load(): Tour | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof saved?.step !== "number" || saved.step < 0 || saved.step >= TUTORIAL_STEPS.length) return null;
    return { step: saved.step, reportHref: typeof saved.reportHref === "string" ? saved.reportHref : null };
  } catch {
    return null;
  }
}

function save(tour: Tour | null) {
  try {
    if (tour) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tour));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The tutorial still works; it just won't survive a reload.
  }
}

function findTarget(step: TutorialStep): HTMLElement | null {
  for (const name of step.target ?? []) {
    const element = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (element) return element;
  }
  return null;
}

function hrefOf(step: TutorialStep, tour: Tour) {
  return step.path === "report" ? tour.reportHref : step.path;
}

function pathnameOf(href: string) {
  return new URL(href, window.location.origin).pathname;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The part of the target that's on screen, with a little room around it. */
function visibleBox(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  const top = Math.max(rect.top - PAD, 0);
  const left = Math.max(rect.left - PAD, 0);
  const bottom = Math.min(rect.bottom + PAD, window.innerHeight);
  const right = Math.min(rect.right + PAD, window.innerWidth);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

function sameBox(a: Box | null, b: Box | null) {
  return a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);
}

/** Which side of the target the card sits on; "none" when it's in a corner or the middle. */
type Side = "below" | "right" | "above" | "left" | "none";

interface Placement {
  top: number;
  left: number;
  side: Side;
  /** Where the card's arrow points along the edge facing the target, in px from the card's corner. */
  arrow: number;
}

/** Below the target, else to its right, above, or left; else the bottom-right corner. */
function placeCard(box: Box, width: number, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - width - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - height - EDGE);
  const bottom = box.top + box.height;
  const right = box.left + box.width;
  // The arrow aims at the target's middle but stays clear of the card's rounded corners.
  const arrowX = (left: number) => Math.min(Math.max(box.left + box.width / 2 - left, 24), width - 24);
  const arrowY = (top: number) => Math.min(Math.max(box.top + box.height / 2 - top, 24), height - 24);
  if (bottom + GAP + height <= vh - EDGE) {
    const left = clampX(box.left);
    return { top: bottom + GAP, left, side: "below", arrow: arrowX(left) };
  }
  if (right + GAP + width <= vw - EDGE) {
    const top = clampY(box.top);
    return { top, left: right + GAP, side: "right", arrow: arrowY(top) };
  }
  if (box.top - GAP - height >= EDGE) {
    const left = clampX(box.left);
    return { top: box.top - GAP - height, left, side: "above", arrow: arrowX(left) };
  }
  if (box.left - GAP - width >= EDGE) {
    const top = clampY(box.top);
    return { top, left: box.left - GAP - width, side: "left", arrow: arrowY(top) };
  }
  return { top: vh - height - EDGE, left: vw - width - EDGE, side: "none", arrow: 0 };
}

const TutorialContext = createContext<{ start: () => void } | null>(null);

/**
 * The interactive tutorial: a guided tour over the real dashboard pages, started from Settings.
 * It dims the page, points at one part at a time with a short explanation, and moves between
 * pages by itself. It never saves anything; on steps that ask staff to click, only the
 * highlighted link can be clicked.
 */
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tour, setTour] = useState<Tour | null>(null);
  /** The step whose part of the page has been looked for, and whether it was found. */
  const [ready, setReady] = useState<{ step: number; found: boolean } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  /** 1 going forward, -1 going back: which way to skip a step whose part isn't there. */
  const direction = useRef(1);
  const pushed = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Picks up a tutorial that was running before a reload.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists in the browser.
    setTour(load());
  }, []);

  useEffect(() => save(tour), [tour]);

  const end = useCallback(() => {
    setTour(null);
    setReady(null);
    setBox(null);
  }, []);

  const goTo = useCallback(
    (step: number, reportHref?: string | null) => {
      if (step >= TUTORIAL_STEPS.length) {
        end();
        return;
      }
      if (step < 0) return;
      direction.current = step >= (tour?.step ?? 0) ? 1 : -1;
      setTour((current) => current && { step, reportHref: reportHref === undefined ? current.reportHref : reportHref });
    },
    [end, tour?.step],
  );

  /** Moves on; on the "open a report" step, opens the report that would have been clicked. */
  const next = useCallback(() => {
    if (!tour) return;
    const step = TUTORIAL_STEPS[tour.step];
    const following = TUTORIAL_STEPS[tour.step + 1];
    if (following?.path === "report" && step.path !== "report") {
      goTo(tour.step + 1, findTarget(step)?.closest("a")?.getAttribute("href") ?? null);
    } else {
      goTo(tour.step + 1);
    }
  }, [goTo, tour]);

  const back = useCallback(() => {
    if (tour) goTo(tour.step - 1);
  }, [goTo, tour]);

  const start = useCallback(() => {
    direction.current = 1;
    setReady(null);
    setTour({ step: 0, reportHref: null });
  }, []);

  // Opens the step's page, then waits for its part to appear.
  useEffect(() => {
    if (!tour) return;
    const step = TUTORIAL_STEPS[tour.step];
    const skip = () => goTo(tour.step + direction.current);
    const href = hrefOf(step, tour);
    if (!href) {
      skip();
      return;
    }
    if (pathname !== pathnameOf(href)) {
      if (pushed.current !== href) {
        pushed.current = href;
        router.push(href);
      }
      return;
    }
    pushed.current = null;
    // A step without a target is shown as soon as its page is open (see `showing` below).
    if (!step.target) return;

    // Scrolls the target into view first, so the spotlight makes one move to it, not a chase.
    let stopWaiting = () => {};
    const show = (element: HTMLElement) => {
      const done = () => {
        stopWaiting();
        setReady({ step: tour.step, found: true });
      };
      const rect = element.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (inView || reducedMotion()) {
        if (!inView) element.scrollIntoView({ block: "center" });
        done();
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      const fallback = setTimeout(done, 700);
      document.addEventListener("scrollend", done, { capture: true, once: true });
      stopWaiting = () => {
        clearTimeout(fallback);
        document.removeEventListener("scrollend", done, { capture: true });
      };
    };
    const existing = findTarget(step);
    if (existing) {
      show(existing);
      return () => stopWaiting();
    }
    const observer = new MutationObserver(() => {
      const element = findTarget(step);
      if (element) {
        observer.disconnect();
        clearTimeout(timer);
        show(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      if (step.optional) skip();
      else setReady({ step: tour.step, found: false });
    }, WAIT_MS);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      stopWaiting();
    };
  }, [tour, pathname, router, goTo]);

  const step = tour ? TUTORIAL_STEPS[tour.step] : null;
  const centered = !!step && !step.target && step.path !== "report" && pathname === step.path;
  const showing = !tour ? null : centered ? { step: tour.step, found: false } : ready?.step === tour.step ? ready : null;

  const isShowing = !!showing;
  const found = !!showing?.found;

  // Keeps the spotlight on the target while the page scrolls, resizes or re-renders. Between
  // steps it stays where it was, so it can glide to the next target instead of jumping.
  useEffect(() => {
    if (!step || !isShowing) return;
    if (!found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a step without a target has no spotlight.
      setBox(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = findTarget(step);
        const next = element ? visibleBox(element) : null;
        setBox((current) => (sameBox(current, next) ? current : next));
      });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      mutations.disconnect();
    };
  }, [step, isShowing, found]);

  // On "click this" steps, clicking the highlighted link moves the tutorial on.
  useEffect(() => {
    if (!step || step.advanceOn !== "click" || !showing?.found) return;
    const onClick = (event: MouseEvent) => {
      const selector = (step.target ?? []).map((name) => `[data-tour="${name}"]`).join(",");
      if (event.target instanceof Element && event.target.closest(selector)) next();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step, showing?.found, next]);

  return (
    <TutorialContext.Provider value={{ start }}>
      {children}
      {tour && step && (
        <TutorialOverlay
          step={step}
          index={tour.step}
          ready={!!showing}
          box={!showing || showing.found ? box : null}
          onNext={next}
          onBack={back}
          onEnd={end}
        />
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error("useTutorial needs TutorialProvider");
  return context;
}

/** The Settings button that starts the tutorial. */
export function StartTutorialButton() {
  const { start } = useTutorial();
  const t = useDictionary();
  return (
    <button
      type="button"
      onClick={start}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark"
    >
      {t.tutorial.start}
    </button>
  );
}

const DIM = "color-mix(in srgb, var(--color-ink) 55%, transparent)";
const EASE = "300ms cubic-bezier(0.22, 1, 0.36, 1)";

/** Small line glyphs for the card, drawn like the sidebar icons. */
function Glyph({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

/** The card's pointer: a small square turned 45°, sharing the card's border on the side facing the target. */
const ARROW_STYLE: Record<Exclude<Side, "none">, (offset: number) => CSSProperties> = {
  below: (offset) => ({ top: -6, left: offset - 6, borderWidth: "1px 0 0 1px" }),
  above: (offset) => ({ bottom: -6, left: offset - 6, borderWidth: "0 1px 1px 0" }),
  right: (offset) => ({ left: -6, top: offset - 6, borderWidth: "0 0 1px 1px" }),
  left: (offset) => ({ right: -6, top: offset - 6, borderWidth: "1px 1px 0 0" }),
};

function TutorialOverlay({
  step,
  index,
  ready,
  box,
  onNext,
  onBack,
  onEnd,
}: {
  step: TutorialStep;
  index: number;
  /** False while the next step's page or target is on its way. */
  ready: boolean;
  /** The spotlight, or null for a card in the middle of a dimmed page. */
  box: Box | null;
  onNext: () => void;
  onBack: () => void;
  onEnd: () => void;
}) {
  const t = useDictionary();
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  /** Off for the card's first placement, so it doesn't slide in from the corner. */
  const [glide, setGlide] = useState(false);

  // The card keeps showing the last step while the next one loads, so it never blinks out.
  const [shown, setShown] = useState<number | null>(ready ? index : null);
  if (ready && shown !== index) setShown(index);
  const shownStep = shown === null ? null : TUTORIAL_STEPS[shown];
  const words = shownStep ? t.tutorial.steps[shownStep.id] : null;
  const first = shown === 0;
  const last = shown === TUTORIAL_STEPS.length - 1;
  const total = TUTORIAL_STEPS.length;
  const counter = shown === null ? "" : t.tutorial.counter(shown + 1, total);

  // Places the card next to the spotlight once its height is known.
  useLayoutEffect(() => {
    if (shown === null || !card.current) return;
    const width = Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2);
    const height = card.current.offsetHeight;
    const next: Placement = box
      ? placeCard(box, width, height)
      : {
          top: Math.max((window.innerHeight - height) / 2, EDGE),
          left: (window.innerWidth - width) / 2,
          side: "none",
          arrow: 0,
        };
    setPlacement((current) =>
      current &&
      current.top === next.top &&
      current.left === next.left &&
      current.side === next.side &&
      current.arrow === next.arrow
        ? current
        : next,
    );
  }, [shown, box]);

  useEffect(() => {
    if (!placement || glide) return;
    const frame = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(frame);
  }, [placement, glide]);

  useEffect(() => {
    if (ready) primary.current?.focus({ preventScroll: true });
  }, [ready, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEnd();
      else if (event.key === "ArrowRight" && ready) onNext();
      else if (event.key === "ArrowLeft" && ready && index > 0) onBack();
      else if (event.key === "Tab" && card.current) {
        // Keeps the keyboard inside the card while the page behind it is covered.
        const buttons = card.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const firstButton = buttons[0];
        const lastButton = buttons[buttons.length - 1];
        if (!card.current.contains(document.activeElement)) {
          event.preventDefault();
          firstButton?.focus();
        } else if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault();
          lastButton?.focus();
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault();
          firstButton?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, index, onNext, onBack, onEnd]);

  // With no target, the hole shrinks to nothing in the middle, which dims the whole page.
  const hole = box ?? { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
  // On "click this" steps, the page is covered around the spotlight only, so its link works.
  const clickThrough = ready && step.advanceOn === "click" && box;
  const side = placement?.side ?? "none";

  return (
    // Under the new-report toast (z-50), so an emergency still shows during the tutorial.
    <div className="print:hidden">
      <div
        aria-hidden
        className="tutorial-in pointer-events-none fixed z-[45] rounded-lg"
        style={{
          ...hole,
          boxShadow: `0 0 0 ${box ? 2 : 0}px var(--color-brand), 0 0 0 9999px ${DIM}`,
          transition: `top ${EASE}, left ${EASE}, width ${EASE}, height ${EASE}, box-shadow ${EASE}`,
        }}
      />

      {clickThrough ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[45]" style={{ height: box.top }} />
          <div className="fixed inset-x-0 bottom-0 z-[45]" style={{ top: box.top + box.height }} />
          <div className="fixed left-0 z-[45]" style={{ top: box.top, height: box.height, width: box.left }} />
          <div className="fixed right-0 z-[45]" style={{ top: box.top, height: box.height, left: box.left + box.width }} />
        </>
      ) : (
        <div className="fixed inset-0 z-[45]" />
      )}

      <p aria-live="polite" className="sr-only">
        {ready && words ? `${counter}. ${words.title}` : ""}
      </p>

      {shownStep && words && shown !== null && (
        <div
          ref={card}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          aria-describedby="tutorial-body"
          aria-busy={!ready || undefined}
          className="tutorial-in fixed z-[46] rounded-lg border border-line bg-surface"
          style={{
            width: `min(${CARD_WIDTH}px, calc(100vw - ${EDGE * 2}px))`,
            boxShadow: "0 12px 32px -8px color-mix(in srgb, var(--color-ink) 35%, transparent)",
            ...(placement ? { top: placement.top, left: placement.left } : { top: 0, left: 0, visibility: "hidden" }),
            transition: glide ? `top ${EASE}, left ${EASE}` : undefined,
          }}
        >
          {side !== "none" && placement && (
            <span
              aria-hidden
              className="absolute h-3 w-3 rotate-45 border-line bg-surface"
              style={{
                ...ARROW_STYLE[side](placement.arrow),
                transition: glide ? `top ${EASE}, left ${EASE}` : undefined,
              }}
            />
          )}

          <div className="px-5 pb-4 pt-3.5">
            <div className="flex items-center justify-between gap-3">
              {first ? (
                <p className="text-xs font-semibold text-muted">{t.tutorial.label}</p>
              ) : (
                <div className="flex items-center gap-2.5">
                  <p className="text-xs font-semibold tabular-nums text-muted">
                    <span aria-hidden>
                      <span className="font-bold text-brand">{shown + 1}</span> / {total}
                    </span>
                    <span className="sr-only">{counter}</span>
                  </p>
                  {/* How far along. */}
                  <span aria-hidden className="h-1 w-20 overflow-hidden rounded-full bg-brand-soft">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${((shown + 1) / total) * 100}%`, transition: `width ${EASE}` }}
                    />
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={onEnd}
                aria-label={t.tutorial.end}
                title={t.tutorial.end}
                className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-page hover:text-ink"
              >
                <Glyph>
                  <path d="M6 6l12 12M18 6L6 18" />
                </Glyph>
              </button>
            </div>

            {/* Keyed by step, so each step's words fade in. */}
            <div key={shown} className="tutorial-in">
              <h2 id="tutorial-title" className="font-display text-[17px] font-bold leading-snug text-ink">
                {words.title}
              </h2>
              <p id="tutorial-body" className="mt-1.5 text-sm leading-6 text-muted">
                {words.body}
              </p>
              {shownStep.advanceOn === "click" && box && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-brand-soft px-3 py-2 text-[13px] font-semibold leading-5 text-brand">
                  <Glyph>
                    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L5 15.5a1.5 1.5 0 0 1 2.5-1.7L9 16" />
                  </Glyph>
                  {t.tutorial.clickHint}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            {first ? (
              <button
                type="button"
                onClick={onEnd}
                className="min-h-9 rounded-md px-1 text-sm font-semibold text-muted transition hover:text-ink"
              >
                {t.tutorial.notNow}
              </button>
            ) : (
              <button
                type="button"
                onClick={onBack}
                disabled={!ready}
                className="-ml-2 flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-muted transition hover:bg-page hover:text-ink disabled:opacity-50"
              >
                <Glyph>
                  <path d="M15 18l-6-6 6-6" />
                </Glyph>
                {t.tutorial.back}
              </button>
            )}
            <button
              ref={primary}
              type="button"
              onClick={onNext}
              disabled={!ready}
              className="flex min-h-9 items-center gap-1.5 rounded-md bg-brand pl-4 pr-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {first ? t.tutorial.begin : last ? t.tutorial.finish : t.tutorial.next}
              <Glyph>{last ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M9 18l6-6-6-6" />}</Glyph>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
