export { cn } from "cn"

/* ------------------------------------------------------------------ *
 * Date helpers — all pure, all local-time based (no UTC day-shift).
 * ------------------------------------------------------------------ */

/** `Date | 'YYYY-MM-DD' | number` → local `'YYYY-MM-DD'` bucket key. */
export function toDayKey(input) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ""
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}

/** `'YYYY-MM-DD'` → `Date` at local midnight (avoids the UTC-midnight off-by-one). */
export function fromDayKey(key) {
  const [y, m, d] = String(key).split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayKey() {
  return toDayKey(new Date())
}

export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const LONG_DATE = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

const SHORT_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" })

const MONTH_YEAR = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })

export function formatLongDate(key) {
  return LONG_DATE.format(fromDayKey(key))
}

export function formatShortDate(key) {
  return SHORT_DATE.format(fromDayKey(key))
}

export function formatMonthYear(year, month) {
  return MONTH_YEAR.format(new Date(year, month, 1))
}

/* ------------------------------------------------------------------ *
 * Calendar grid (Sunday-first, the convention on Indonesian calendars)
 * ------------------------------------------------------------------ */

export const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

/**
 * Always returns 42 cells (6 weeks) so the grid height never jumps between months.
 * Cells outside the month are marked `outside: true` instead of being dropped.
 */
export function buildMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const lead = first.getDay()
  const start = new Date(year, month, 1 - lead)
  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ date: d, key: toDayKey(d), outside: d.getMonth() !== month })
  }
  return cells
}

/* ------------------------------------------------------------------ *
 * Grouping / stats
 * ------------------------------------------------------------------ */

function momentSortValue(m) {
  return `${m.date ?? ""}T${m.time ?? "00:00"}`
}

/**
 * Newest day first. Returns `[{ key, label, items }]` with items sorted
 * newest-time-first inside each day.
 */
export function groupMomentsByDay(moments) {
  const buckets = new Map()
  for (const m of moments ?? []) {
    const key = m.date ?? ""
    if (!key) continue
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(m)
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      key,
      label: formatLongDate(key),
      items: [...items].sort((a, b) => (a.time < b.time ? 1 : -1)),
    }))
}

/**
 * Rolls up one aggregate per place: visit count, best rating, newest visit,
 * dominant category, the coordinates of the most recent visit, and the newest PHOTO taken
 * there (so the place list can show the same picture the map pin uses).
 */
export function summarisePlaces(moments) {
  const byPlace = new Map()
  for (const m of moments ?? []) {
    const name = (m.place ?? "").trim()
    if (!name) continue
    const prev = byPlace.get(name)
    if (!prev) {
      byPlace.set(name, {
        name,
        area: m.area ?? "",
        count: 1,
        best: m.rating ?? 0,
        total: m.rating ?? 0,
        lastVisit: momentSortValue(m),
        lastDate: m.date ?? "",
        category: m.category ?? "food",
        coords: m.coords ?? null,
        photo: m.photo ?? null,
        titles: [m.title],
      })
      continue
    }
    prev.count += 1
    prev.total += m.rating ?? 0
    prev.best = Math.max(prev.best, m.rating ?? 0)
    prev.titles.push(m.title)
    /* Prefer a photo from the newest visit that actually has one. */
    if (m.photo && !prev.photo) prev.photo = m.photo
    if (momentSortValue(m) > prev.lastVisit) {
      prev.lastVisit = momentSortValue(m)
      prev.lastDate = m.date ?? ""
      prev.coords = m.coords ?? prev.coords
      prev.category = m.category ?? prev.category
      prev.area = m.area ?? prev.area
      if (m.photo) prev.photo = m.photo
    }
  }
  return [...byPlace.values()]
    .map((p) => ({ ...p, avg: p.count ? p.total / p.count : 0 }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))
}

/** Tag → usage count, most used first. */
export function summariseTags(moments) {
  const counts = new Map()
  for (const m of moments ?? []) {
    for (const raw of m.tags ?? []) {
      const tag = String(raw).trim()
      if (!tag) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : 1))
}

/** Distinct calendar days that hold at least one moment. */
export function countRecordedDays(moments) {
  const days = new Set()
  for (const m of moments ?? []) if (m.date) days.add(m.date)
  return days.size
}

/* ------------------------------------------------------------------ *
 * Formatting / misc
 * ------------------------------------------------------------------ */

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

export function formatRupiah(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "—"
  return RUPIAH.format(n)
}

export function formatClock(hhmm) {
  if (!hhmm) return "--:--"
  const [h, m] = String(hhmm).split(":")
  return `${String(h ?? "0").padStart(2, "0")}.${String(m ?? "00").padStart(2, "0")}`
}

export function initialsOf(text) {
  return String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function firstMatch(moments, key, value) {
  return (moments ?? []).find((m) => m[key] === value) ?? null
}

/** `1` → `'1,0'`-style average, used on the You page. */
export function formatAverage(value) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(1).replace(".", ",") : "—"
}

/**
 * Collision-proof enough for a localStorage diary: monotonic counter + timestamp.
 * Deliberately avoids `Math.random()` — the react-hooks/purity lint rule errors on
 * impure calls reachable from render, and `Date.now()` alone is trivially collidable.
 */
let idCounter = 0
export function createId(prefix = "m") {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}
