/**
 * Category vocabulary shared by the catalog grid, CategoryPills, the month-cell dots, the
 * list rows and the AddMomentModal `<Select>`.
 *
 * `value` is the persisted token (keep stable — it is written into localStorage).
 * `icon`  is a lucide-react component; every icon here is verified to exist in the installed
 *         lucide-react build (see the icon-availability check in the verification notes).
 * `chip` / `dot` are LITERAL class strings, never template-interpolated: Tailwind's scanner
 *         reads source text, so a built-up class name is silently dropped from the stylesheet.
 *         They reference theme tokens (`text-primary`, `bg-accent`) rather than raw palette
 *         colours so the palette stays swappable from src/index.css alone.
 */
import {
  Coffee,
  CupSoda,
  Donut,
  LayoutGrid,
  NotebookPen,
  Soup,
  UtensilsCrossed,
} from "lucide-react"

const CATEGORY_TONES = {
  food: "text-primary",
  drinks: "text-chart-3",
  others: "text-success",
  notes: "text-warning",
}

export const CATEGORIES = [
  {
    value: "food",
    label: "Food",
    icon: UtensilsCrossed,
    chip: "bg-primary/12 text-primary",
    dot: "bg-primary",
  },
  {
    value: "drinks",
    label: "Drinks",
    icon: CupSoda,
    chip: "bg-chart-3/15 text-chart-3",
    dot: "bg-chart-3",
  },
  {
    value: "others",
    label: "Others",
    icon: Donut,
    chip: "bg-success/15 text-success",
    dot: "bg-success",
  },
  {
    value: "notes",
    label: "Notes",
    icon: NotebookPen,
    chip: "bg-warning/18 text-warning-foreground",
    dot: "bg-warning",
  },
]

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value)

/** `'all'` is the "no filter" pseudo-category used by the pill row and the month view. */
export const ALL_CATEGORY = {
  value: "all",
  label: "All Items",
  icon: LayoutGrid,
  chip: "bg-foreground/8 text-foreground",
  dot: "bg-foreground",
}

export const CATEGORY_FILTERS = [ALL_CATEGORY, ...CATEGORIES]

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]))

export function categoryMeta(value) {
  return BY_VALUE.get(value) ?? CATEGORIES[0]
}

export function categoryLabel(value) {
  return categoryMeta(value).label
}

export function categoryDot(value) {
  return categoryMeta(value).dot
}

export function categoryChip(value) {
  return categoryMeta(value).chip
}

/** Icon tint only (no background) — for use on a card or a dark/active surface. */
export function categoryTone(value) {
  return CATEGORY_TONES[value] ?? CATEGORY_TONES.food
}

export function isCategory(value) {
  return CATEGORY_VALUES.includes(value)
}

/* Meal-period vocabulary for the "time of day" hint on a catalogue card. */
export const MEAL_PERIODS = [
  { id: "pagi", label: "Sarapan", icon: Soup, from: 4, to: 10 },
  { id: "siang", label: "Makan siang", icon: UtensilsCrossed, from: 10, to: 15 },
  { id: "sore", label: "Sore", icon: Donut, from: 15, to: 18 },
  { id: "malam", label: "Makan malam", icon: Coffee, from: 18, to: 28 },
]

/** `'18:40'` → the matching meal period. Pure; reads no clock. */
export function mealPeriodOf(time) {
  const hour = Number(String(time ?? "").slice(0, 2))
  if (!Number.isFinite(hour)) return MEAL_PERIODS[1]
  return MEAL_PERIODS.find((p) => hour >= p.from && hour < p.to) ?? MEAL_PERIODS[1]
}
