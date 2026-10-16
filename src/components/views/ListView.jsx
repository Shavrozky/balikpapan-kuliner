import { useMemo, useState } from "react"
import { Bookmark, Clock, MapPin } from "lucide-react"

import CategoryPills from "@/components/shared/CategoryPills"
import Rating from "@/components/shared/Rating"
import StickerImage from "@/components/shared/StickerImage"
import { CATEGORY_FILTERS, categoryLabel, categoryMeta } from "@/data/categories"
import {
  cn,
  formatClock,
  formatRupiah,
  formatShortDate,
  groupMomentsByDay,
  initialsOf,
  todayKey,
} from "@/lib/utils"

/**
 * ListView ("Table") — the diary timeline: newest day first, each row carrying the clock
 * time, the plate sticker and the rating.
 *
 * Rows are grouped by day with a sticky day header, which is what makes a long archive
 * scannable. The "hari ini" header is computed once from lazy state, not during render.
 */
export default function ListView({
  moments,
  category,
  onCategoryChange,
  onToggleSaved,
  onRemove,
}) {
  const [today] = useState(() => todayKey())
  const [expandedId, setExpandedId] = useState(null)

  const counts = useMemo(() => {
    const out = { all: moments.length }
    for (const cat of CATEGORY_FILTERS) {
      if (cat.value === "all") continue
      out[cat.value] = moments.filter((m) => m.category === cat.value).length
    }
    return out
  }, [moments])

  const filtered = useMemo(
    () => (category === "all" ? moments : moments.filter((m) => m.category === category)),
    [moments, category]
  )

  const groups = useMemo(() => groupMomentsByDay(filtered), [filtered])

  const totals = useMemo(() => {
    let ratingSum = 0
    let rated = 0
    for (const m of filtered) {
      if (m.rating > 0) {
        ratingSum += m.rating
        rated += 1
      }
    }
    return { rated, avg: rated ? ratingSum / rated : 0 }
  }, [filtered])

  if (moments.length === 0) {
    return <EmptyState onCategoryChange={onCategoryChange} category={category} />
  }

  return (
    <section className="flex flex-col gap-4">
      <CategoryPills value={category} onChange={onCategoryChange} counts={counts} />

      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold">
          {category === "all" ? "Semua momen" : categoryLabel(category)}
        </h2>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} momen
          {totals.rated > 0 ? ` · rata-rata ${formatAverageShort(totals.avg)}` : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          Tidak ada momen untuk filter ini.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {groups.map((group) => (
            <li key={group.key} className="flex flex-col gap-2">
              <div className="sticky top-[57px] z-10 -mx-1 flex items-center gap-2 bg-background/85 px-1 py-1 backdrop-blur">
                <h3 className="font-heading text-xs font-semibold tracking-wide uppercase">
                  {group.key === today ? "Hari ini" : group.label}
                </h3>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatShortDate(group.key)}
                </span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground tabular-nums">
                  {group.items.length}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {group.items.map((m) => (
                  <TimelineRow
                    key={m.id}
                    moment={m}
                    expanded={expandedId === m.id}
                    onToggleExpand={() =>
                      setExpandedId((prev) => (prev === m.id ? null : m.id))
                    }
                    onToggleSaved={() => onToggleSaved?.(m.id)}
                    onRemove={() => onRemove?.(m.id)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function TimelineRow({ moment, expanded, onToggleExpand, onToggleSaved, onRemove }) {
  const meta = categoryMeta(moment.category)
  return (
    <li className="rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-3">
        <div className="flex w-11 shrink-0 flex-col items-center gap-1 pt-1">
          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
            <Clock className="size-3" />
            {formatClock(moment.time)}
          </span>
          <span
            className={cn("size-1.5 rounded-full", meta.dot)}
            title={meta.label}
            aria-hidden="true"
          />
        </div>

        <StickerImage
          src={moment.photo}
          seed={moment.id}
          alt={moment.title}
          size="lg"
          shadow="soft"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className="min-w-0 flex-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <p className="truncate text-sm font-semibold">{moment.title}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {moment.place || "tanpa tempat"}
                  {moment.area ? ` · ${moment.area}` : ""}
                </span>
              </p>
            </button>

            <button
              type="button"
              onClick={onToggleSaved}
              aria-pressed={moment.saved}
              aria-label={moment.saved ? "Hapus dari simpanan" : "Simpan momen"}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                moment.saved
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Bookmark className={cn("size-4", moment.saved && "fill-primary")} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
            <Rating value={moment.rating} />
            {moment.price > 0 && (
              <span className="tabular-nums">{formatRupiah(moment.price)}</span>
            )}
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {meta.label}
            </span>
          </div>

          {expanded && (
            <div className="mt-1 flex flex-col gap-2 border-t border-border/70 pt-2">
              {moment.note && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {moment.note}
                </p>
              )}
              {moment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {moment.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  ID {initialsOf(moment.place || moment.title)} · {moment.id.slice(-6)}
                </span>
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Hapus momen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function EmptyState({ category, onCategoryChange }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <StickerImage seed="empty-archive" size="xl" shadow="soft" />
      <h2 className="font-heading text-base font-semibold">Arsip masih kosong</h2>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Tekan tombol kamera di bawah untuk menyimpan momen kuliner pertamamu di Balikpapan.
      </p>
      <CategoryPills value={category} onChange={onCategoryChange} className="justify-center" />
    </section>
  )
}

function formatAverageShort(value) {
  return value.toFixed(1).replace(".", ",")
}
