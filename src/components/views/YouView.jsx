import { useMemo, useState } from "react"
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Flame,
  MapPin,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react"

import StickerImage from "@/components/shared/StickerImage"
import Rating from "@/components/shared/Rating"
import { categoryMeta } from "@/data/categories"
import {
  cn,
  countRecordedDays,
  formatAverage,
  formatRupiah,
  formatShortDate,
  initialsOf,
  summarisePlaces,
  summariseTags,
} from "@/lib/utils"

/**
 * YouView ("You.") — the profile/statistics page: Saves, Moments, Places, Memory.
 *
 * Every number here is DERIVED from the same `moments` array the other views read, so the
 * stats can never disagree with the list. Nothing is stored or cached in the context.
 *
 * Two deliberate choices:
 *  • `now` comes from a lazy `useState` initialiser, not a render-body `new Date()` — the
 *    latter is an impure call that `react-hooks/purity` rejects and would make the
 *    "Rekap bulan ini" card re-render inconsistently.
 *  • The tag cloud shows the top few tags with a "show all" toggle. A raw dump of every tag
 *    buries the stats under 60+ chips on a real archive.
 */
const TAG_PREVIEW = 12

export default function YouView({ moments, onResetSeed }) {
  const [now] = useState(() => new Date())
  const [tagFilter, setTagFilter] = useState(null)
  const [showAllTags, setShowAllTags] = useState(false)

  const stats = useMemo(() => {
    const saves = moments.filter((m) => m.saved).length
    const places = summarisePlaces(moments)
    const tags = summariseTags(moments)
    const days = countRecordedDays(moments)

    const rated = moments.filter((m) => m.rating > 0)
    const avgRating = rated.length
      ? rated.reduce((sum, m) => sum + m.rating, 0) / rated.length
      : 0

    const spend = moments.reduce((sum, m) => sum + (m.price || 0), 0)

    const topCategory = countBy(moments, (m) => m.category)

    /* Longest gap between two consecutive recorded days, in days. */
    const sortedDays = [...new Set(moments.map((m) => m.date))].sort()
    let longestGap = 0
    let gapFrom = null
    let gapTo = null
    for (let i = 1; i < sortedDays.length; i += 1) {
      const a = new Date(sortedDays[i - 1])
      const b = new Date(sortedDays[i])
      const diff = Math.round((b - a) / 86_400_000)
      if (diff > longestGap) {
        longestGap = diff
        gapFrom = sortedDays[i - 1]
        gapTo = sortedDays[i]
      }
    }

    return {
      saves,
      places,
      tags,
      days,
      avgRating,
      spend,
      topCategory,
      longestGap,
      gapFrom,
      gapTo,
      ratedCount: rated.length,
    }
  }, [moments])

  const visibleTags = useMemo(
    () => (showAllTags ? stats.tags : stats.tags.slice(0, TAG_PREVIEW)),
    [stats.tags, showAllTags]
  )

  const visibleMoments = useMemo(
    () => (tagFilter ? moments.filter((m) => m.tags.includes(tagFilter)) : moments.slice(0, 6)),
    [moments, tagFilter]
  )

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now),
    [now]
  )

  return (
    <section className="flex flex-col gap-5">
      {/* Identity card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="paper-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-3.5">
          <StickerImage seed="you-profile" size="xl" shadow="strong" />
          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-lg font-semibold tracking-tight">
              You<span className="text-primary">.</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Penjelajah kuliner Balikpapan · sejak{" "}
              {stats.days > 0 ? formatShortDate(oldestKey(moments)) : "—"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                {monthLabel}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {stats.days} hari tercatat
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Saves / Moments / Places / Memory */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={Bookmark}
          label="Saves"
          value={stats.saves}
          caption={`dari ${moments.length} momen`}
          tone="primary"
        />
        <StatCard
          icon={UtensilsCrossed}
          label="Moments"
          value={moments.length}
          caption="total arsip"
          tone="warning"
        />
        <StatCard
          icon={MapPin}
          label="Places"
          value={stats.places.length}
          caption={`${stats.places.filter((p) => p.coords).length} berkoordinat`}
          tone="success"
        />
        <StatCard
          icon={Sparkles}
          label="Memory"
          value={formatAverage(stats.avgRating)}
          caption={`${stats.ratedCount} momen dinilai`}
          tone="destructive"
        />
      </div>

      {/* Monthly recap */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
          <CalendarDays className="size-3.5 text-primary" />
          Rekap bulan ini
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <Metric label="Total pengeluaran" value={formatRupiah(stats.spend)} />
          <Metric
            label="Kategori terfavorit"
            value={
              stats.topCategory
                ? `${categoryMeta(stats.topCategory.value).label} (${stats.topCategory.count})`
                : "—"
            }
          />
          <Metric
            label="Rating rata-rata"
            value={stats.avgRating ? `${formatAverage(stats.avgRating)} / 5` : "—"}
            icon={Star}
          />
          <Metric
            label="Jeda terlama"
            value={stats.longestGap > 0 ? `${stats.longestGap} hari` : "—"}
            caption={
              stats.gapFrom && stats.gapTo
                ? `${formatShortDate(stats.gapFrom)} → ${formatShortDate(stats.gapTo)}`
                : undefined
            }
          />
        </dl>
      </div>

      {/* Tag cloud — doubles as a filter for the strip below */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold">
            <Flame className="size-3.5 text-primary" />
            Tag ({stats.tags.length})
          </h3>
          <div className="flex items-center gap-1.5">
            {tagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground transition-colors hover:bg-muted"
              >
                reset
              </button>
            )}
            {stats.tags.length > TAG_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllTags((v) => !v)}
                aria-expanded={showAllTags}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                {showAllTags ? "ringkas" : `semua ${stats.tags.length}`}
                <ChevronDown
                  className={cn("size-3 transition-transform", showAllTags && "rotate-180")}
                />
              </button>
            )}
          </div>
        </div>
        {stats.tags.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Belum ada tag.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tagFilter === tag}
                onClick={() => setTagFilter((prev) => (prev === tag ? null : tag))}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  tagFilter === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
              >
                #{tag}
                <span className="ml-1 tabular-nums opacity-70">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Highlight strip */}
      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold">
          {tagFilter ? `Momen #${tagFilter}` : "Kilas balik terakhir"}
        </h3>
        {visibleMoments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Tidak ada momen untuk tag ini.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5">
            {visibleMoments.map((m) => (
              <li
                key={m.id}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center shadow-sm"
              >
                <StickerImage
                  src={m.photo}
                  seed={m.id}
                  alt={m.title}
                  size="md"
                  shadow="soft"
                />
                <p className="line-clamp-2 text-[11px] leading-tight font-medium">
                  {m.title}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {formatShortDate(m.date)}
                </p>
                <Rating value={m.rating} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger zone — resets localStorage back to the bundled seed */}
      <div className="rounded-2xl border border-dashed border-border p-3.5">
        <h3 className="text-xs font-semibold">Data &amp; penyimpanan</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Arsip disimpan otomatis di localStorage perangkat ini (kunci{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            bpndiary.moments.v1
          </code>
          ). Membuat ulang data awal akan menghapus perubahan lokal.
        </p>
        <button
          type="button"
          onClick={onResetSeed}
          className="mt-2.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Buat ulang dari data awal
        </button>
      </div>

      <p className="pb-1 text-center text-[10px] text-muted-foreground">
        BpnDiary · {moments.length} momen · {initialsOf("Balikpapan Diary")} · data lokal
      </p>
    </section>
  )
}

function StatCard({ icon: Icon, label, value, caption, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/12 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <span
        className={cn(
          "mb-2 grid size-7 place-items-center rounded-lg",
          tones[tone] ?? tones.primary
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="font-heading text-2xl leading-none font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium">{label}</p>
      <p className="truncate text-[10px] text-muted-foreground">{caption}</p>
    </div>
  )
}

function Metric({ label, value, caption, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs font-semibold">
      {Icon && <Icon className="mr-1 inline size-3 fill-warning stroke-warning" />}
        {value}
      </dd>
      {caption && (
        <dd className="truncate text-[10px] font-normal text-muted-foreground">
          {caption}
        </dd>
      )}
    </div>
  )
}

function countBy(items, keyOf) {
  const counts = new Map()
  for (const item of items) {
    const key = keyOf(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best = null
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count }
  }
  return best
}

function oldestKey(moments) {
  let oldest = null
  for (const m of moments) {
    if (!oldest || m.date < oldest) oldest = m.date
  }
  return oldest ?? ""
}
