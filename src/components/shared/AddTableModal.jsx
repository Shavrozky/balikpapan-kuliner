import { useRef, useState } from "react"
import {
  Camera,
  CameraOff,
  CircleCheck,
  ImagePlus,
  Images,
  Plus,
  RefreshCw,
  Sparkles,
  Trash,
  UtensilsCrossed,
  WandSparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import FoodRow from "@/components/shared/FoodRow"
import StickerImage from "@/components/shared/StickerImage"
import { categoryLabel, categoryTone } from "@/data/categories"
import { AREAS, coordsForArea } from "@/data/areas"
import { categoryCountsOf } from "@/context/diaryStore"
import { MATTE_PRESETS, approxBytes, renderMatte } from "@/lib/imageMatte"
import { cn, createId, formatRupiah, nowTime, todayKey } from "@/lib/utils"

/**
 * AddTableModal — "What's on the table?"
 *
 * Flow:
 *   1. Capture   take a photo (`capture="environment"` opens the rear camera on a phone, and
 *                degrades to a file picker on desktop) or import from the media library.
 *   2. Nice table  the shot is cut out to a transparent PNG and staged as a sticker on a
 *                table surface, with a tolerance control, a before/after compare, and the
 *                original kept one tap away in case the cut-out went wrong.
 *   3. Name it   every dish on the table gets a row: category FOOD / DRINKS / OTHERS, an
 *                optional free-text name, rating, price, tags and thoughts. Rows can be
 *                removed with "remove this food", and a dish with no name is still saved
 *                (the spec allows leaving it blank).
 *
 * `capture` and `multiple` on the two file inputs, with no `accept` filter, give the OS picker
 * the widest possible net — camera, gallery, and files all at once.
 *
 * Sizing note: the sticker is stored as a ~320px PNG data URL. That is a deliberate ceiling —
 * see the byte counter in the footer, which warns before a capture risks the localStorage
 * quota. Photos are NOT compressed lossily; a JPEG would lose the alpha channel.
 */

const EMPTY_TAG_LIST = []

/* Sentinel for the "no area" Select option — `SelectItem` cannot take an empty-string value. */
const NO_AREA = "__none__"

function emptyDish(name = "") {
  return {
    id: createId("dish"),
    name,
    category: "food",
    rating: 0,
    price: 0,
    tags: EMPTY_TAG_LIST,
    thoughts: "",
    photo: null,
  }
}

function emptyTable(place = "") {
  return {
    title: "",
    place,
    area: "",
    date: todayKey(),
    time: nowTime(),
    note: "",
    photo: null,
    foods: [emptyDish()],
  }
}

const STEPS = ["Ambil foto", "Atur meja", "Beri nama"]

export default function AddTableModal({ open, onOpenChange, onSubmit, defaultPlace = "" }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => emptyTable(defaultPlace))
  const [rawUrl, setRawUrl] = useState(null)
  const [preset, setPreset] = useState("sedang")
  const [showRaw, setShowRaw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [matteInfo, setMatteInfo] = useState(null)
  const [error, setError] = useState("")

  const cameraRef = useRef(null)
  const libraryRef = useRef(null)

  const mattedBytes = approxBytes(draft.photo || "")
  const cutFailed = matteInfo?.failed === true

  function reset() {
    setStep(0)
    setDraft(emptyTable(defaultPlace))
    setRawUrl(null)
    setPreset("sedang")
    setShowRaw(false)
    setBusy(false)
    setMatteInfo(null)
    setError("")
  }

  function handleOpenChange(next) {
    /* Reset on close inside the event handler — calling setState from an effect trips
     * react-hooks/set-state-in-effect, and this is the correct place for it anyway. */
    if (!next) reset()
    onOpenChange?.(next)
  }

  /** Runs the capture through the matting pass. Also used to re-run when the preset changes. */
  async function processFile(file, nextPreset = preset) {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const result = await renderMatte(file, nextPreset)
      setRawUrl(result.rawUrl)
      setDraft((prev) => ({ ...prev, photo: result.url }))
      setMatteInfo({
        width: result.width,
        height: result.height,
        cleared: result.cleared,
        failed: result.failed,
      })
      setShowRaw(false)
      setStep(1)
    } catch {
      setError("Fotonya tidak bisa dibaca. Coba ambil ulang atau pilih file lain.")
    } finally {
      setBusy(false)
    }
  }

  async function changePreset(next) {
    setPreset(next)
    /* Re-cut from the stored original rather than from the current matte, so switching presets
     * is not cumulative — otherwise each change would eat further into the subject. */
    if (rawUrl) await processFile(rawUrl, next)
  }

  function updateDish(next) {
    setDraft((prev) => ({
      ...prev,
      foods: prev.foods.map((f) => (f.id === next.id ? next : f)),
    }))
  }

  function removeDish(id) {
    setDraft((prev) => ({ ...prev, foods: prev.foods.filter((f) => f.id !== id) }))
  }

  function addDish() {
    setDraft((prev) => ({ ...prev, foods: [...prev.foods, emptyDish()] }))
  }

  function handleSubmit() {
    /* Place is the only hard requirement. A dish with no name is explicitly allowed by the
     * spec ("isi sendiri … opsional"), and the photo is always present by step 3 because the
     * stepper gates on it — so there is nothing else here to reject. */
    if (!draft.place.trim()) {
      setError("Nama tempatnya belum diisi.")
      setStep(2)
      return
    }
    onSubmit?.({
      title: draft.title.trim(),
      place: draft.place.trim(),
      area: draft.area.trim(),
      date: draft.date,
      time: draft.time,
      note: draft.note.trim(),
      photo: draft.photo,
      /* Area → district centroid, so the capture lands on the Kuliner map. */
      coords: coordsForArea(draft.area),
      /* Blank rows are dropped: a dish that is empty in every field is noise in the archive. */
      foods: draft.foods.filter((f) => f.name.trim()),
    })
    handleOpenChange(false)
  }

  const summary = categoryCountsOf(draft.foods).map(({ value, count }) => ({
    value,
    count,
    label: categoryLabel(value),
    tone: categoryTone(value),
  }))
  const namedCount = draft.foods.filter((f) => f.name.trim()).length
  const tableTotal = draft.foods.reduce((sum, f) => sum + (Number(f.price) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <UtensilsCrossed className="size-4" aria-hidden="true" />
            </span>
            What&rsquo;s on the table?
          </DialogTitle>
          <DialogDescription>
            Foto meja makanmu, pilih kategorinya, dan beri nama kalau perlu. Foto otomatis
            dipotong jadi stiker transparan.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden inputs: no `accept` filter, so the OS picker offers camera AND files. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => processFile(e.target.files?.[0])}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => processFile(e.target.files?.[0])}
        />

        <Stepper step={step} onStep={setStep} hasPhoto={Boolean(draft.photo)} />

        {step === 0 && (
          <div className="table-stage flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Camera className="size-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Foto apa yang ada di mejamu</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Arahkan kamera ke meja, atau pilih dari galeri. Latar belakangnya akan
                dihilangkan otomatis.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button type="button" disabled={busy} onClick={() => cameraRef.current?.click()}>
                <Camera data-icon="inline-start" />
                Buka Kamera
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => libraryRef.current?.click()}
              >
                <Images data-icon="inline-start" />
                Impor dari Media
              </Button>
            </div>
            {busy && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                Memotong latar belakang…
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="table-stage relative grid h-64 place-items-center overflow-hidden rounded-2xl border border-border">
              {draft.photo ? (
                <StickerImage
                  src={showRaw ? rawUrl : draft.photo}
                  alt="Pratinjau meja"
                  seed="table-preview"
                  size="xl"
                  variant={showRaw ? "tile" : "matte"}
                  rotate={0}
                />
              ) : (
                <span className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="size-7" aria-hidden="true" />
                  <span className="text-xs">Belum ada foto</span>
                </span>
              )}

              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="backdrop-blur">
                  {showRaw ? "Asli" : "Stiker"}
                </Badge>
                {!showRaw && cutFailed && (
                  <Badge variant="destructive">Latar tidak terdeteksi</Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="matte-preset">
                  Seberapa agresif latar dibuang
                </label>
                <Select value={preset} onValueChange={changePreset}>
                  <SelectTrigger id="matte-preset" className="w-56" aria-label="Kekuatan potong">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATTE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label} — {p.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRaw((v) => !v)}
                  disabled={!rawUrl}
                >
                  <WandSparkles data-icon="inline-start" />
                  {showRaw ? "Lihat hasil" : "Lihat asli"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => cameraRef.current?.click()}
                >
                  <CameraOff data-icon="inline-start" />
                  Ambil ulang
                </Button>
              </div>
            </div>

            {cutFailed && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Latar belakangnya kemungkinan sewarna dengan makanannya, jadi foto disimpan
                apa adanya. Coba preset lain, atau lanjut saja — fotonya tetap tersimpan.
              </p>
            )}

            <p className="text-[11px] text-muted-foreground tabular-nums">
              {matteInfo
                ? `${matteInfo.width}×${matteInfo.height} px · ${Math.round(matteInfo.cleared)} piksel latar dibuang · ±${Math.round(mattedBytes / 1024)} KB`
                : "Belum ada foto"}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor="table-title" className="text-xs font-medium text-muted-foreground">
                  Judul meja (opsional)
                </label>
                <Input
                  id="table-title"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="cth. Makan malam keluarga di Klandasan"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="table-place" className="text-xs font-medium text-muted-foreground">
                  Tempat
                </label>
                <Input
                  id="table-place"
                  value={draft.place}
                  onChange={(e) => setDraft((p) => ({ ...p, place: e.target.value }))}
                  placeholder="cth. Kepiting Kenari"
                  aria-invalid={Boolean(error) && !draft.place.trim()}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="table-area" className="text-xs font-medium text-muted-foreground">
                  Daerah
                </label>
                <Select
                  value={draft.area || NO_AREA}
                  onValueChange={(value) =>
                    setDraft((p) => ({ ...p, area: value === NO_AREA ? "" : value }))
                  }
                >
                  <SelectTrigger id="table-area" className="w-full" aria-label="Daerah">
                    <SelectValue placeholder="Pilih daerah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_AREA}>Tanpa daerah</SelectItem>
                    {AREAS.map((area) => (
                      <SelectItem key={area.name} value={area.name}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="table-date" className="text-xs font-medium text-muted-foreground">
                  Tanggal
                </label>
                <Input
                  id="table-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="table-time" className="text-xs font-medium text-muted-foreground">
                  Jam
                </label>
                <Input
                  id="table-time"
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Isi meja</p>
                <p className="text-xs text-muted-foreground">
                  {namedCount} makanan bernama · total {formatRupiah(tableTotal)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {summary.map((s) => (
                  <Badge key={s.value} variant="secondary" className={s.tone}>
                    {s.label} {s.count}
                  </Badge>
                ))}
              </div>
            </div>

            <ul className="flex flex-col gap-3">
              {draft.foods.map((food, index) => (
                <FoodRow
                  key={food.id}
                  food={food}
                  index={index}
                  onChange={updateDish}
                  onRemove={removeDish}
                />
              ))}
            </ul>

            {draft.foods.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                Semua makanan sudah dihapus. Tambahkan lagi kalau meja ini punya isi lain.
              </p>
            )}

            <Button type="button" variant="secondary" onClick={addDish} className="w-full">
              <Plus data-icon="inline-start" />
              Tambah makanan lagi
            </Button>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="table-note" className="text-xs font-medium text-muted-foreground">
                Catatan meja (opsional)
              </label>
              <Textarea
                id="table-note"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
                placeholder="Suasana, siapa yang ikut, atau hal lain di meja ini…"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="mt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="sm:mr-auto"
          >
            <Trash data-icon="inline-start" />
            Batalkan
          </Button>
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              Kembali
            </Button>
          )}
          {step < 2 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !draft.photo}
            >
              Lanjut
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit}>
              <CircleCheck data-icon="inline-start" />
              Simpan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Breadcrumb-style stepper. Buttons, so the flow is skippable and keyboard reachable. */
function Stepper({ step, onStep, hasPhoto }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((label, index) => {
        const done = index < step
        const active = index === step
        /* Steps 1 and 2 are unreachable without a photo — there is nothing to arrange or name. */
        const locked = index > 0 && !hasPhoto
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <button
              type="button"
              disabled={locked}
              onClick={() => onStep(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[10px] tabular-nums",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Sparkles className="size-3" aria-hidden="true" /> : index + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px w-3 shrink-0 bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
