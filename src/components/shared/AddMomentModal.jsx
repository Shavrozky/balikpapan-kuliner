import { useState } from "react"
import { ImagePlus, UtensilsCrossed } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import RatingInput from "@/components/shared/RatingInput"
import TagEditor from "@/components/shared/TagEditor"
import StickerImage from "@/components/shared/StickerImage"
import { AREAS, coordsForArea } from "@/data/areas"
import { CATEGORIES, categoryTone } from "@/data/categories"
import { cn, nowTime, todayKey } from "@/lib/utils"

/**
 * AddMomentModal — dialog for archiving a new culinary moment.
 *
 * Design notes:
 *  • The dialog is CONTROLLED by the caller (`open` / `onOpenChange`) because both the
 *    Header and the dock FAB need to open it.
 *  • Form state resets on every CLOSE, inside the `onOpenChange` event handler — not in an
 *    effect. Calling `setState` from an effect body trips `react-hooks/set-state-in-effect`,
 *    and event handlers are the correct place for this anyway.
 *  • Rating and tags reuse the shared `RatingInput` / `TagEditor` (the same components the
 *    "What's on the table?" dish rows use) instead of re-implementing clickable stars and
 *    chip handling a second time.
 */

const EMPTY_TAGS = []

/* Sentinel for the "no area" Select option — `SelectItem` cannot take an empty-string value. */
const NO_AREA = "__none__"

function emptyDraft(defaultDate) {
  return {
    title: "",
    place: "",
    area: "",
    date: defaultDate || todayKey(),
    time: nowTime(),
    category: "food",
    rating: 0,
    price: "",
    tags: EMPTY_TAGS,
    note: "",
    photo: "",
  }
}

export default function AddMomentModal({ open, onOpenChange, onSubmit, defaultDate }) {
  const [draft, setDraft] = useState(() => emptyDraft(defaultDate))
  const [error, setError] = useState("")

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))

  function handleOpenChange(next) {
    /* Reset on close so the next open is always a blank form. */
    if (!next) {
      setDraft(emptyDraft(defaultDate))
      setError("")
    }
    onOpenChange?.(next)
  }

  function handleSubmit(event) {
    event.preventDefault()
    /* Boundary case: the only fields we truly require are title + place. Everything else
     * has a safe default, so an empty date/time is backfilled by the provider. */
    if (!draft.title.trim()) {
      setError("Nama makanannya belum diisi.")
      return
    }
    if (!draft.place.trim()) {
      setError("Nama tempatnya belum diisi.")
      return
    }
    onSubmit?.({
      ...draft,
      title: draft.title.trim(),
      place: draft.place.trim(),
      area: draft.area.trim(),
      note: draft.note.trim(),
      price: Number(draft.price) || 0,
      photo: draft.photo.trim() ? draft.photo.trim() : null,
      /* The area IS the location: its district centroid becomes the moment's coordinates, which
       * is what puts the moment on the Kuliner map. A blank area stays coordinate-less rather
       * than being dropped at an invented point. */
      coords: coordsForArea(draft.area),
    })
    handleOpenChange(false)
  }

  const previewSeed = draft.title || draft.place || "moment-baru"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <UtensilsCrossed className="size-4" />
            </span>
            Tambah Arsip Kuliner
          </DialogTitle>
          <DialogDescription>
            Simpan momen makan hari ini ke arsip BpnDiary. Tersimpan otomatis di perangkat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
            <StickerImage
              src={draft.photo || null}
              seed={previewSeed}
              size="lg"
              shadow="soft"
            />
            <div className="min-w-0 flex-1">
              <label
                htmlFor="moment-photo"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Foto (opsional, URL)
              </label>
              <Input
                id="moment-photo"
                value={draft.photo}
                onChange={(e) => setField("photo", e.target.value)}
                placeholder="https://… atau /foto.jpg"
              />
            </div>
          </div>

          <Field label="Nama makanan / minuman" htmlFor="moment-title">
            <Input
              id="moment-title"
              value={draft.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="cth. Kepiting Soka Saus Padang"
              aria-invalid={Boolean(error) && !draft.title.trim()}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tempat" htmlFor="moment-place">
              <Input
                id="moment-place"
                value={draft.place}
                onChange={(e) => setField("place", e.target.value)}
                placeholder="cth. Kepiting Kenari"
                aria-invalid={Boolean(error) && !draft.place.trim()}
              />
            </Field>
            <Field label="Daerah" htmlFor="moment-area">
              <Select
                value={draft.area || NO_AREA}
                onValueChange={(value) =>
                  setField("area", value === NO_AREA ? "" : value)
                }
              >
                <SelectTrigger id="moment-area" className="w-full" aria-label="Daerah">
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
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal" htmlFor="moment-date">
              <Input
                id="moment-date"
                type="date"
                value={draft.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </Field>
            <Field label="Jam" htmlFor="moment-time">
              <Input
                id="moment-time"
                type="time"
                value={draft.time}
                onChange={(e) => setField("time", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <Select
                value={draft.category}
                onValueChange={(value) => setField("category", value)}
              >
                <SelectTrigger className="w-full" aria-label="Kategori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <cat.icon className={cn("size-3.5", categoryTone(cat.value))} />
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Harga (Rp)" htmlFor="moment-price">
              <Input
                id="moment-price"
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="25000"
              />
            </Field>
          </div>

          <Field label="Rating (opsional)">
            <RatingInput
              value={draft.rating}
              onChange={(value) => setField("rating", value)}
              ariaLabel="Rating"
            />
          </Field>

          <Field label="Tag" htmlFor="moment-tags">
            <TagEditor
              id="moment-tags"
              tags={draft.tags}
              onChange={(tags) => setDraft((prev) => ({ ...prev, tags }))}
              label="Tag"
            />
          </Field>

          <Field label="Catatan" htmlFor="moment-note">
            <Textarea
              id="moment-note"
              rows={3}
              value={draft.note}
              onChange={(e) => setField("note", e.target.value)}
              placeholder="Rasa, porsi, suasana, atau hal yang mau diingat…"
              className="resize-none"
            />
          </Field>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit">
              <ImagePlus data-icon="inline-start" />
              Simpan Momen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
