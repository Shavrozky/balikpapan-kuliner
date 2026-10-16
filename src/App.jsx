import { useMemo, useState } from "react"
import {
  BookmarkCheck,
  Calendar,
  ChartColumn,
  CirclePlus,
  Heart,
  LayoutGrid,
  MapPin,
  Minus,
  Plus,
  Printer,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash,
  UtensilsCrossed,
} from "lucide-react"

import { DiaryProvider, useDiary } from "@/context/DiaryContext"
import StickerImage from "@/components/shared/StickerImage"
import AddMomentModal from "@/components/shared/AddMomentModal"
import AddTableModal from "@/components/shared/AddTableModal"
import MonthView from "@/components/views/MonthView"
import PlacesView from "@/components/views/PlacesView"
import YouView from "@/components/views/YouView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ALL_CATEGORY,
  CATEGORIES,
  categoryLabel,
  categoryTone,
  mealPeriodOf,
} from "@/data/categories"
import { foodCountOf } from "@/context/diaryStore"
import { cn, formatAverage, formatRupiah } from "@/lib/utils"

/**
 * BpnDiary — dashboard shell: navigation rail, catalogue, and a plan panel.
 *
 * Every interactive primitive is a shadcn/ui component (`Button`, `Input`, `Card`, `Badge`,
 * `Tabs`, `ScrollArea`, `Separator`) and every glyph is a lucide-react icon. No emoji is
 * rendered and no raw palette colour (`blue-600`, `slate-400`, `#F8FAFC`) is used — the whole
 * palette lives in `src/index.css` so it stays swappable from one file.
 *
 * Navigation is a real `<Tabs>` root instead of hand-rolled buttons: that buys correct
 * `tablist` / `tab` / `tabpanel` semantics and arrow-key navigation for free, and the active
 * style comes from `data-active` rather than a boolean threaded through `className`.
 *
 * Icon note: the previous revision imported `Home`, `BarChart3`, `PlusCircle`, `Trash2` and
 * `IceCream` — none of which exist in the installed lucide-react build, so they were
 * `undefined` at render. The replacements (`House`/`ChartColumn`/`CirclePlus`/`Trash`/
 * `IceCreamBowl`) are verified present.
 */

/* ---------------------------------------------------------------- *
 * Static config + pure view models
 * ---------------------------------------------------------------- */

const NAV_ITEMS = [
  { value: "katalog", label: "Menu Katalog", icon: LayoutGrid },
  { value: "kalender", label: "Kalender Momen", icon: Calendar },
  { value: "peta", label: "Peta Kuliner", icon: MapPin },
  { value: "favorit", label: "Favorit / Saved", icon: Heart },
  { value: "statistik", label: "Statistik & Rekap", icon: ChartColumn },
]

/** Diary wording for money: an unset price reads "Belum ada harga", not "Rp0". */
function priceLabel(value) {
  const n = Number(value) || 0
  return n > 0 ? formatRupiah(n) : "Belum ada harga"
}

/* ---------------------------------------------------------------- *
 * Navigation rail
 * ---------------------------------------------------------------- */

function NavRail({ counts, total, onOpenAdd, onOpenTable }) {
  return (
    <aside className="flex w-[17rem] shrink-0 flex-col justify-between border-r border-border bg-card px-5 py-7">
      <div className="flex flex-col gap-7">
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            Bpn<span className="text-primary">Culinaire</span>
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Menu Dashboard
          </p>
          {/* One vertical TabsList: ARIA stays intact and arrow keys move between tabs. */}
          <TabsList
            variant="line"
            className="h-fit w-full flex-col items-stretch gap-1 bg-transparent p-0"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                    /* `variant="line"` paints the active tab transparent via a
                     * `group-data-[variant=line]/tabs-list:` rule. That selector is more
                     * specific than a bare `data-active:`, so the override has to repeat the
                     * group prefix to win. */
                    "group-data-[variant=line]/tabs-list:data-active:bg-primary/10",
                    "group-data-[variant=line]/tabs-list:data-active:text-primary"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.value === "favorit" && counts.saved > 0 && (
                    <Badge variant="secondary" className="ml-auto tabular-nums">
                      {counts.saved}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            General
          </p>
          {/* "What's on the table?" is the camera-first path; "Tambah Kuliner" is the manual
           * one. Both are ACTIONS, not destinations — so Buttons, not tabs. */}
          <Button
            variant="ghost"
            onClick={onOpenTable}
            className="justify-start gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            <UtensilsCrossed className="size-4" aria-hidden="true" />
            What&rsquo;s on the table?
          </Button>
          <Button
            variant="ghost"
            onClick={onOpenAdd}
            className="justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <CirclePlus className="size-4" aria-hidden="true" />
            Tambah Kuliner
          </Button>
        </div>
      </div>

      <Card size="sm" className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-xs">Arsip Kuliner Balikpapan</CardTitle>
          <CardDescription className="text-[11px]">
            Total {total} momen tercatat
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="secondary" size="sm" className="w-full" onClick={onOpenAdd}>
            <CirclePlus data-icon="inline-start" />
            Catat Momen Baru
          </Button>
        </CardFooter>
      </Card>
    </aside>
  )
}

/* ---------------------------------------------------------------- *
 * Category rail (the big category cards above the grid)
 * ---------------------------------------------------------------- */

function CategoryRail({ counts, value, onChange }) {
  const items = [ALL_CATEGORY, ...CATEGORIES]
  return (
    <div className="hide-scrollbar flex shrink-0 items-stretch gap-3 overflow-x-auto px-9 pb-5">
      {items.map((cat) => {
        const active = value === cat.value
        const Icon = cat.icon
        const count = counts[cat.value] ?? 0
        return (
          <button
            key={cat.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(cat.value)}
            className={cn(
              "flex min-w-[12rem] shrink-0 items-center gap-4 rounded-2xl border p-4 text-left",
              "transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl border",
                active
                  ? "border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground"
                  : cn("border-border bg-muted/50", categoryTone(cat.value))
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{cat.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-xs font-medium tabular-nums",
                  active ? "text-primary-foreground/75" : "text-muted-foreground"
                )}
              >
                {count} {cat.value === "notes" ? "catatan" : "kuliner"}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * Catalogue grid (shared by the katalog + favorit tabs)
 * ---------------------------------------------------------------- */

function CatalogGrid({ items, quantities, onQtyChange, onAdd, onReset }) {
  if (items.length === 0) {
    return (
      <Card className="items-center py-16 text-center">
        <CardContent className="flex flex-col items-center gap-2">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="size-6" aria-hidden="true" />
          </span>
          <CardTitle className="text-sm">Tidak ada kuliner yang sesuai</CardTitle>
          <CardDescription className="text-xs">
            Coba ganti kata kunci pencarian atau kategori filter
          </CardDescription>
          <Button variant="secondary" size="sm" className="mt-2" onClick={onReset}>
            Reset Filter
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
      {items.map((item) => {
        const qty = quantities[item.id] ?? 1
        const period = mealPeriodOf(item.time)
        const PeriodIcon = period.icon
        const dishCount = foodCountOf(item)
        return (
          <Card key={item.id} className="gap-4 py-5 transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-5">
              <div
                className={cn(
                  "grid size-28 shrink-0 place-items-center rounded-2xl",
                  /* A captured sticker floats free on the card; a tile still needs its frame. */
                  item.photo ? "table-stage" : "border border-border bg-muted/40 p-2"
                )}
              >
                <StickerImage
                  seed={item.id || item.title}
                  src={item.photo}
                  alt={item.title}
                  size="lg"
                  variant={item.photo ? "matte" : "tile"}
                  rotate={item.photo ? null : 0}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={cn("capitalize", categoryTone(item.category))}
                    >
                      {categoryLabel(item.category)}
                    </Badge>
                    {dishCount > 0 && (
                      <Badge variant="outline">
                        <UtensilsCrossed className="size-3" aria-hidden="true" />
                        {dishCount} makanan
                      </Badge>
                    )}
                  </div>
                  {item.rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
                      <Star className="size-3.5 fill-warning stroke-warning" aria-hidden="true" />
                      {`${item.rating},0`}
                    </span>
                  )}
                </div>

                <h3 className="font-heading truncate text-base font-bold">{item.title}</h3>

                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {item.place || "Balikpapan"}
                    {item.area ? ` · ${item.area}` : ""}
                  </span>
                </p>

                {/* For a captured table, list what was actually on it — that is the point of
                 * the feature, and it is more useful than a generic meal-period label. */}
                {dishCount > 0 ? (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.foods.map((f) => f.name).join(" · ")}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <PeriodIcon className="size-3 shrink-0" aria-hidden="true" />
                    {period.label}
                  </p>
                )}

                <p className="text-base font-bold text-primary">{priceLabel(item.price)}</p>

                {/* Porsi stepper — real Buttons, so it is keyboard reachable. */}
                <div className="mt-1.5 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Kurangi porsi ${item.title}`}
                    disabled={qty <= 1}
                    onClick={() => onQtyChange(item.id, -1)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-4 text-center text-xs font-bold tabular-nums">{qty}</span>
                  <Button
                    size="icon-xs"
                    aria-label={`Tambah porsi ${item.title}`}
                    onClick={() => onQtyChange(item.id, 1)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t-0 pt-0">
              <Button variant="secondary" className="w-full" onClick={() => onAdd(item, qty)}>
                Masukkan ke Rencana Kuliner
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * Plan panel
 * ---------------------------------------------------------------- */

function PlanPanel({ orderList, onRemove, onGotoMap, onPrint, subtotal, tax, total, onOpenAdd }) {
  return (
    <aside className="flex w-[21.5rem] shrink-0 flex-col border-l border-border bg-card px-6 py-7">
      <div className="mb-5 flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-heading text-base font-bold">Rencana Kuliner</h2>
        <Badge className="tabular-nums">{orderList.length} Item</Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 pr-1">
          {orderList.length === 0 ? (
            <p className="px-2 py-10 text-center text-xs leading-relaxed text-muted-foreground">
              Klik <span className="font-semibold">“Masukkan ke Rencana Kuliner”</span> pada
              kartu di tengah untuk menambahkan ke daftar ini.
            </p>
          ) : (
            orderList.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-14 shrink-0 place-items-center rounded-xl",
                    item.photo ? "table-stage" : "border border-border bg-muted/40 p-1"
                  )}
                >
                  <StickerImage
                    seed={item.id || item.title}
                    src={item.photo}
                    alt={item.title}
                    size="sm"
                    variant={item.photo ? "matte" : "tile"}
                    rotate={item.photo ? null : 0}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-xs font-bold">{item.title}</h4>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Hapus ${item.title} dari rencana`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash />
                    </Button>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold text-primary tabular-nums">
                    {priceLabel((Number(item.price) || 0) * (item.qty || 1))}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {item.qty || 1}x
                    </span>
                    <Badge variant="secondary" className="max-w-[9rem] truncate font-normal">
                      {item.area || item.place || "Balikpapan"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="mt-5 shrink-0 border-t border-border pt-5">
        <dl className="flex flex-col gap-2.5 text-xs">
          <div className="flex justify-between font-semibold">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatRupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Estimasi Pajak (10%)</dt>
            <dd className="tabular-nums">{formatRupiah(tax)}</dd>
          </div>
        </dl>
        <Separator className="my-3" />
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Total Budget</span>
          <span className="text-primary tabular-nums">{formatRupiah(total)}</span>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-bold">Mode Arsip &amp; Ekspor</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="sm" onClick={onGotoMap}>
              <Route data-icon="inline-start" />
              Rute Peta
            </Button>
            <Button variant="secondary" size="sm" onClick={onPrint}>
              <Printer data-icon="inline-start" />
              Cetak Daftar
            </Button>
          </div>

          <Button size="lg" className="mt-3 w-full" onClick={onOpenAdd}>
            <BookmarkCheck data-icon="inline-start" />
            Simpan / Tambah Kuliner Baru
          </Button>
        </div>
      </div>
    </aside>
  )
}

/* ---------------------------------------------------------------- *
 * Shell
 * ---------------------------------------------------------------- */

function BpnDiaryContent() {
  const { moments = [], addMoment, addTable, resetToSeed } = useDiary()

  const [activeTab, setActiveTab] = useState("katalog")
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY.value)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isTableOpen, setIsTableOpen] = useState(false)
  const [quantities, setQuantities] = useState({})

  /* Seed the plan once on mount on purpose: this panel is a scratch pad the user edits, so
   * re-deriving it from `moments` on every change would wipe those edits. */
  const [orderList, setOrderList] = useState(() =>
    moments
      .filter((m) => m.saved)
      .slice(0, 4)
      .map((item) => ({ ...item, qty: 1 }))
  )

  const counts = useMemo(() => {
    const next = { all: moments.length, saved: 0 }
    for (const m of moments) {
      if (m.saved) next.saved += 1
      if (m.category) next[m.category] = (next[m.category] ?? 0) + 1
    }
    return next
  }, [moments])

  const avgRating = useMemo(() => {
    const rated = moments.filter((m) => m.rating > 0)
    return rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0
  }, [moments])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return moments
    return moments.filter((item) =>
      [item.title, item.place, item.area, item.note].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(q)
      )
    )
  }, [moments, searchQuery])

  const categorized = useMemo(
    () =>
      selectedCategory === ALL_CATEGORY.value
        ? filtered
        : filtered.filter((m) => m.category === selectedCategory),
    [filtered, selectedCategory]
  )

  const favourites = useMemo(() => filtered.filter((m) => m.saved), [filtered])

  const totals = useMemo(() => {
    const subtotal = orderList.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (item.qty || 1),
      0
    )
    /* `tax` is a placeholder for a foodcourt-style estimate; the diary stores no tax figure.
     * Rename or drop it if this panel is not meant to double as a budget planner. */
    const tax = Math.round(subtotal * 0.1)
    return { subtotal, tax, total: subtotal + tax }
  }, [orderList])

  const changeQty = (id, delta) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }))

  const addToPlan = (item, qty) =>
    setOrderList((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i))
      }
      return [{ ...item, qty }, ...prev]
    })

  const removeFromPlan = (id) => setOrderList((prev) => prev.filter((i) => i.id !== id))

  const resetFilters = () => {
    setSelectedCategory(ALL_CATEGORY.value)
    setSearchQuery("")
  }

  const openAdd = () => setIsAddOpen(true)
  const openTable = () => setIsTableOpen(true)

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      orientation="vertical"
      className="flex h-screen w-screen gap-0 overflow-hidden bg-background text-foreground select-none"
    >
      <NavRail
        counts={counts}
        total={moments.length}
        onOpenAdd={openAdd}
        onOpenTable={openTable}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-6 px-9 pt-7 pb-5">
          <div className="min-w-0">
            <h1 className="font-heading truncate text-xl font-bold tracking-tight">
              Arsip Kuliner Balikpapan
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {moments.length} momen · rata-rata {formatAverage(avgRating)} dari 5
            </p>
          </div>

          <div className="flex w-[24rem] shrink-0 items-center gap-2.5">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kuliner, tempat makan, atau kawasan…"
                aria-label="Cari kuliner"
                className="h-10 pl-3.5"
              />
              <Search
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
            </div>
            <Button
              variant="outline"
              size="icon-lg"
              title="Reset filter"
              aria-label="Reset filter"
              onClick={resetFilters}
            >
              <SlidersHorizontal />
            </Button>
          </div>
        </header>

        <TabsContent value="katalog" className="flex min-h-0 flex-1 flex-col">
          <CategoryRail counts={counts} value={selectedCategory} onChange={setSelectedCategory} />
          <ScrollArea className="min-h-0 flex-1 px-9 pb-9">
            <CatalogGrid
              items={categorized}
              quantities={quantities}
              onQtyChange={changeQty}
              onAdd={addToPlan}
              onReset={resetFilters}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorit" className="flex min-h-0 flex-1 flex-col">
          <CategoryRail counts={counts} value={selectedCategory} onChange={setSelectedCategory} />
          <ScrollArea className="min-h-0 flex-1 px-9 pb-9">
            <CatalogGrid
              items={favourites}
              quantities={quantities}
              onQtyChange={changeQty}
              onAdd={addToPlan}
              onReset={resetFilters}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="kalender" className="min-h-0 flex-1 px-9 pb-9">
          <ScrollArea className="h-full">
            <Card className="p-5">
              <MonthView moments={moments} category="all" onCategoryChange={() => {}} />
            </Card>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="peta" className="min-h-0 flex-1 px-9 pb-9">
          <ScrollArea className="h-full">
            <Card className="p-5">
              <PlacesView moments={moments} onOpenAdd={openAdd} />
            </Card>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="statistik" className="min-h-0 flex-1 px-9 pb-9">
          <ScrollArea className="h-full">
            <Card className="p-5">
              <YouView moments={moments} onResetSeed={resetToSeed} />
            </Card>
          </ScrollArea>
        </TabsContent>
      </main>

      <PlanPanel
        orderList={orderList}
        onRemove={removeFromPlan}
        onGotoMap={() => setActiveTab("peta")}
        onPrint={() => window.print()}
        subtotal={totals.subtotal}
        tax={totals.tax}
        total={totals.total}
        onOpenAdd={openAdd}
      />

      <AddMomentModal open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={addMoment} />
      <AddTableModal open={isTableOpen} onOpenChange={setIsTableOpen} onSubmit={addTable} />
    </Tabs>
  )
}

export default function App() {
  return (
    <DiaryProvider>
      <BpnDiaryContent />
    </DiaryProvider>
  )
}
