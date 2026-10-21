import type { Dictionary } from "@/lib/i18n";

export type TutorialStepId = keyof Dictionary["tutorial"]["steps"];

/** Where a step happens: a page, or the report opened during the tutorial. */
export type TutorialPath = "/" | "/reports" | "/map" | "/residents" | "/settings" | "report";

export interface TutorialStep {
  id: TutorialStepId;
  path: TutorialPath;
  /** `data-tour` names to point at, the first one found wins. None: a card in the middle. */
  target?: string[];
  /** Staff click the highlighted part to go on (Next still works). */
  advanceOn?: "click";
  /** Skipped when its part isn't on the page, e.g. no reports yet. */
  optional?: boolean;
}

/** The dashboard tutorial, in order. The words are in the dictionary under `tutorial.steps`. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: "welcome", path: "/" },
  { id: "sidebar", path: "/", target: ["sidebar-nav"] },
  { id: "overviewTiles", path: "/", target: ["overview-tiles"] },
  { id: "overviewUrgent", path: "/", target: ["overview-urgent"] },
  { id: "openReports", path: "/", target: ["nav-reports"], advanceOn: "click" },
  { id: "statusCards", path: "/reports", target: ["report-status-cards"] },
  { id: "filters", path: "/reports", target: ["report-filters"] },
  { id: "openReport", path: "/reports", target: ["queue-first-row"], advanceOn: "click", optional: true },
  { id: "priority", path: "report", target: ["report-priority"], optional: true },
  { id: "updateStatus", path: "report", target: ["report-status-form"], optional: true },
  { id: "map", path: "/map", target: ["map-canvas"] },
  { id: "residents", path: "/residents", target: ["resident-first", "residents-list"] },
  { id: "sound", path: "/settings", target: ["settings-sound"] },
  { id: "finish", path: "/settings", target: ["settings-tutorial"] },
];
