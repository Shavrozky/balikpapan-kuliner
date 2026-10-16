import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import CategoryPills from "@/components/shared/CategoryPills"
import StickerImage from "@/components/shared/StickerImage"
import { categoryDot, categoryLabel } from "@/data/categories"
import {
  WEEKDAY_LABELS,
  buildMonthMatrix,
  cn,
  formatClock,
  formatLongDate,
  formatMonthYear,
  todayKey,
} from "@/lib/utils"

/**
 * MonthView ("Collections") — a calendar whose cells hold food stickers.
 *
 * Up to 3 stickers show per day (a 4th+ collapses into a "+N" chip) so the grid keeps a
 * stable height. Selecting a day reveals that day's moments underneath, which is how the
 * calendar stays readable on a phone.
 *
 * `today` is captured once via lazy `useState` initialiser: reading the clock during render
 * would be an impure call and would re-highlight the wrong cell past midnight anyway.
 */
export default function MonthView({ moments, category, onCategoryChange }) {
  const [today] = useState(() => todayKey())
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(
    () => (category === "all" ? moments : moments.filter((m) => m.category === category)),
    [moments, category]
  )

  const byDay = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date).push(m)
    }
    return map
  }, [filtered])

  const cells = useMemo(
    () => buildMonthMatrix(anchor.year, anchor.month),
    [anchor.year, anchor.month]
  )

  const monthCount = useMemo(
    () => filtered.filter((m) => m.date.startsWith(monthPrefix(anchor))).length,
    [filtered, anchor]
  )

  const selectedMoments = selected ? (byDay.get(selected) ?? []) : []

  function shiftMonth(delta) {
    setAnchor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
    setSelected(null)
  }

  function goToday() {
    const d = new Date()
    setAnchor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(today)
  }

  return (
    <section className="flex flex-col gap-4">
      <CategoryPills value={category} onChange={onCategoryChange} />

      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-heading truncate text-sm font-semibold capitalize">
              {formatMonthYear(anchor.year, anchor.month)}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {monthCount} momen
              {category !== "all" ? ` · ${categoryLabel(category)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}>
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="outline" onClick={goToday}>
              Hari ini
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const items = byDay.get(cell.key) ?? []
            const isToday = cell.key === today
            const isSelected = cell.key === selected
            const extra = items.length - 3

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(isSelected ? null : cell.key)}
                aria-label={`${cell.key}, ${items.length} momen`}
                aria-pressed={isSelected}
                className={cn(
                  "flex h-[68px] min-w-0 flex-col items-stretch gap-1 rounded-xl border p-1 text-left transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent hover:bg-muted/70",
                  cell.outside && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none tabular-nums",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {cell.date.getDate()}
                </span>

                <span className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-0.5 overflow-hidden">
                  {items.slice(0, 3).map((m) => (
                    <StickerImage
                      key={m.id}
                      src={m.photo}
                      seed={m.id}
                      alt={m.title}
                      size="xs"
                      rotate={0}
                      shadow="soft"
                    />
                  ))}
                  {extra > 0 && (
                    <span className="rounded-full bg-secondary px-1 py-0.5 text-[9px] leading-none font-medium text-secondary-foreground tabular-nums">
                      +{extra}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selected ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold">
              {formatLongDate(selected)}
            </h3>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {selectedMoments.length} momen
            </span>
          </div>

          {selectedMoments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Belum ada arsip di tanggal ini. Tekan tombol kamera untuk menambah.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedMoments.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                >
                  <StickerImage
                    src={m.photo}
                    seed={m.id}
                    alt={m.title}
                    size="md"
                    rotate={0}
                    shadow="soft"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatClock(m.time)} · {m.place || "tanpa tempat"}
                      {m.area ? `, ${m.area}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn("size-2 shrink-0 rounded-full", categoryDot(m.category))}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          Pilih satu tanggal untuk melihat detail momennya.
        </p>
      )}
    </section>
  )
}

function monthPrefix({ year, month }) {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}
