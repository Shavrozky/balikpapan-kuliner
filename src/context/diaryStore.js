/**
 * Pure persistence + normalisation layer for the diary archive.
 *
 * Kept out of DiaryContext.jsx on purpose: this module holds no components, so it can
 * export as many constants and helpers as it likes without tripping the
 * `react-refresh/only-export-components` rule, and the React layer stays focused on state.
 *
 * Schema — keep in sync with AddMomentModal and AddTableModal:
 *   id, title, place, area, coords, date, time, category, rating, price, tags, note, photo,
 *   saved, foods[]
 *
 * `foods` holds the per-item breakdown from a "What's on the table?" capture: the whole table
 * is ONE moment (one visit, one place), and each dish on it is a row inside `foods`. Deriving
 * the moment's rating / price / tags / category from those rows (see `withFoods`) keeps the
 * calendar, list, map and plan panel working unchanged — they only ever read the moment.
 */
import { initialMoments } from "@/data/initialMoments"
import { CATEGORY_VALUES } from "@/data/categories"
import { nowTime, todayKey } from "@/lib/utils"

export const STORAGE_KEY = "bpndiary.moments.v1"
export const STORAGE_VERSION = 1

const FALLBACK_CATEGORY = "food"

function clampRating(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return 0
  return Math.min(5, Math.max(0, n))
}

function normaliseTags(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const raw of value) {
    const tag = String(raw ?? "").trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

/** `[lat, lng]` or null. Anything else is discarded rather than rendered as NaN. */
function normaliseCoords(value) {
  if (!Array.isArray(value) || value.length !== 2) return null
  const [lat, lng] = value.map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return [lat, lng]
}

/** One dish photographed on the table. */
export function normaliseFood(raw, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {}
  return {
    id: typeof source.id === "string" && source.id ? source.id : `food-${index}`,
    name: String(source.name ?? "").trim(),
    category: CATEGORY_VALUES.includes(source.category) ? source.category : FALLBACK_CATEGORY,
    rating: clampRating(source.rating),
    price: Number.isFinite(Number(source.price)) ? Math.max(0, Number(source.price)) : 0,
    tags: normaliseTags(source.tags),
    thoughts: String(source.thoughts ?? ""),
    photo: typeof source.photo === "string" && source.photo ? source.photo : null,
  }
}

function normaliseFoods(value) {
  if (!Array.isArray(value)) return []
  return value.map((item, i) => normaliseFood(item, i))
}

/**
 * Folds a captured table's `foods[]` onto the moment itself so the rest of the app — calendar,
 * list, map, plan panel — keeps reading the fields it always read.
 *
 *   category  the single most common dish category, ties broken by CATEGORY_VALUES order
 *   rating    mean of the rated dishes, rounded; 0 when nothing was rated
 *   price     sum of every dish price (what the table cost, not one plate)
 *   tags      union of the dish tags, de-duplicated
 *   title     kept if the user named it, else the first dish name
 *
 * Pure, and safe to call on a moment that already has `foods` and its derived fields.
 */
export function withFoods(moment, foods) {
  const list = normaliseFoods(foods)
  if (list.length === 0) return { ...moment, foods: [] }

  const tally = new Map()
  for (const food of list) tally.set(food.category, (tally.get(food.category) ?? 0) + 1)
  let category = list[0].category
  let best = -1
  for (const value of CATEGORY_VALUES) {
    const count = tally.get(value) ?? 0
    if (count > best) {
      best = count
      category = value
    }
  }

  const rated = list.filter((f) => f.rating > 0)

  return {
    ...moment,
    title: moment.title?.trim() || list[0].name || "Meja tanpa nama",
    category,
    rating: rated.length
      ? clampRating(rated.reduce((sum, f) => sum + f.rating, 0) / rated.length)
      : 0,
    price: list.reduce((sum, f) => sum + f.price, 0),
    tags: normaliseTags(list.flatMap((f) => f.tags)),
    foods: list,
  }
}

/** How many dishes were captured on a table. 0 for a plain moment. */
export function foodCountOf(moment) {
  return Array.isArray(moment?.foods) ? moment.foods.length : 0
}

/**
 * Named-dish counts per category, for the summary chips in AddTableModal. Lives here (not in
 * FoodRow.jsx) so that file exports exactly one component, as
 * `react-refresh/only-export-components` requires.
 */
export function categoryCountsOf(foods) {
  const counts = new Map()
  for (const food of Array.isArray(foods) ? foods : []) {
    if (!String(food?.name ?? "").trim()) continue
    counts.set(food.category, (counts.get(food.category) ?? 0) + 1)
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }))
}

/** Sum of a table's per-dish prices, or the moment's own price when it has no `foods`. */
export function totalOf(moment) {
  const foods = Array.isArray(moment?.foods) ? moment.foods : []
  if (!foods.length) return Number(moment?.price) || 0
  return foods.reduce((sum, f) => sum + (Number(f.price) || 0), 0)
}

/**
 * Accepts a loose object (seed data, user form input, or corrupt localStorage) and returns a
 * guaranteed-shape moment. Never throws: a diary that white-screens on bad data is worse
 * than a diary with one ugly record in it.
 */
export function normaliseMoment(raw, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {}
  const category = CATEGORY_VALUES.includes(source.category)
    ? source.category
    : FALLBACK_CATEGORY
  return {
    id: typeof source.id === "string" && source.id ? source.id : `rec-${index}`,
    title: String(source.title ?? "Tanpa judul").trim() || "Tanpa judul",
    place: String(source.place ?? "").trim(),
    area: String(source.area ?? "").trim(),
    coords: normaliseCoords(source.coords),
    date: /^\d{4}-\d{2}-\d{2}$/.test(source.date) ? source.date : todayKey(),
    time: /^\d{2}:\d{2}$/.test(source.time) ? source.time : nowTime(),
    category,
    rating: clampRating(source.rating),
    price: Number.isFinite(Number(source.price)) ? Math.max(0, Number(source.price)) : 0,
    tags: normaliseTags(source.tags),
    note: String(source.note ?? ""),
    photo: typeof source.photo === "string" && source.photo ? source.photo : null,
    /* `saved` is a BOOKMARK (a favourite subset of the archive), not "was persisted" —
     * every moment in the list is already persisted. Defaulting to false keeps the
     * Saves counter on the You page meaningful instead of always matching Moments. */
    saved: Boolean(source.saved),
    foods: normaliseFoods(source.foods),
  }
}

export function normaliseList(list) {
  if (!Array.isArray(list)) return []
  return list.map((item, i) => normaliseMoment(item, i))
}

export function seedMoments() {
  return normaliseList(initialMoments)
}

/**
 * Reads localStorage, tolerating every historical shape (`Moment[]` or `{version, moments}`).
 *
 * Guarded on `typeof window` so the module stays importable (and the app shell renderable)
 * outside a browser — SSR, a node-side render test, or a prerender step. Without the guard
 * this throws `window is not defined` during the very first render.
 */
export function readStoredMoments() {
  if (typeof window === "undefined" || !window.localStorage) return seedMoments()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedMoments()
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : parsed?.moments
    const normalised = normaliseList(list)
    return normalised.length > 0 ? normalised : seedMoments()
  } catch {
    return seedMoments()
  }
}

export function writeStoredMoments(moments) {
  if (typeof window === "undefined" || !window.localStorage) return false
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, moments })
    )
    return true
  } catch {
    /* Quota exceeded or private mode: keep the session usable in memory only. */
    return false
  }
}
