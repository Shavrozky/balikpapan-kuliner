import { useEffect, useMemo, useRef, useState } from "react"
import { useMap, MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import L from "leaflet"
import { Navigation, Star, Store, TrendingUp } from "lucide-react"

import "leaflet/dist/leaflet.css"

import Rating from "@/components/shared/Rating"
import StickerImage from "@/components/shared/StickerImage"
import { categoryMeta } from "@/data/categories"
import { cn, formatShortDate, summarisePlaces } from "@/lib/utils"

/**
 * PlacesView ("Tags") — the Balikpapan map plus a ranked list of the place vocabulary.
 *
 * Every archived dish/drink is a pin on the map: places whose newest visit carried a photo get
 * the photo itself as the marker ("show icon … sesuai dengan gambar"), and places with no
 * photo keep the plain gradient teardrop.
 *
 * Three Leaflet-in-Vite pitfalls are handled here:
 *
 * 1. `leaflet` is imported at the top of THIS file, and App mounts this module through
 *    `React.lazy`. Leaflet dereferences `window` at import time, so a static import from App
 *    would break any node-side render/test of the app shell.
 * 2. Leaflet's DEFAULT marker icon resolves `marker-icon.png` relative to the CSS file, which
 *    bundlers rewrite into a 404 — a pin that renders as nothing. So every icon here is an
 *    explicit `L.divIcon` (pure CSS, no image request).
 * 3. `L.divIcon` accepts an HTMLElement as well as a string, and Leaflet installs it with
 *    `appendChild`. We pass an ELEMENT, never a string: the photo is a user-supplied data URL,
 *    and building the marker via `innerHTML` would make that value parsed as markup. Assigning
 *    `img.src` as a property keeps it data, so there is no injection surface even in principle.
 *
 * A `divIcon` instance owns its element, and Leaflet MOVES that element when the instance is
 * attached to a second marker. Each pin therefore gets its own instance, memoised per place.
 */

const BALIKPAPAN_CENTER = [-1.2379, 116.8529] // approximate city centre
const DEFAULT_ZOOM = 12
const FOCUS_ZOOM = 15

const PLAIN_PIN = L.divIcon({
  className: "",
  html: '<span class="bpndiary-pin"></span>', // static literal — no user data
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -20],
})

/**
 * Builds the photo pin DOM. `src` is set as a PROPERTY, so a data URL is never parsed as HTML.
 * The `onerror` handler falls back to the plain gradient pin if the stored image is corrupt,
 * rather than leaving a broken-image glyph on the map.
 */
function createPhotoPin(photo, alt) {
  const box = document.createElement("span")
  box.className = "bpndiary-pin-photo"

  const img = document.createElement("img")
  img.src = photo
  img.alt = alt
  img.draggable = false
  img.decoding = "async"
  img.addEventListener("error", () => {
    box.replaceChildren()
    const fallback = document.createElement("span")
    fallback.className = "bpndiary-pin"
    box.appendChild(fallback)
  })

  box.appendChild(img)
  return box
}

/**
 * Marks the focused marker's DOM without touching React state or the icon instance.
 *
 * Why not drive focus by swapping the icon: replacing a marker's `icon` prop makes Leaflet
 * re-create the marker's DOM node, and `react-leaflet` unmounts the `<Popup>` in the same
 * commit — so the popup the click just opened would vanish. Toggling a class on the existing
 * element keeps the popup (and the browser's own focus handling) intact.
 *
 * The lookup goes through Leaflet's own `_icon` reference rather than matching on text or
 * `title`: those are DOM heuristics that break the moment a place name is also a dish name.
 */
function useFocusHighlight(markers, focusedName) {
  useEffect(() => {
    for (const [name, marker] of markers.current) {
      const el = marker.getElement?.()?.querySelector(".bpndiary-pin-photo, .bpndiary-pin")
      if (el) el.classList.toggle("is-focused", name === focusedName)
    }
  }, [markers, focusedName])
}

export default function PlacesView({ moments, onOpenAdd }) {
  const [focused, setFocused] = useState(null)

  const places = useMemo(() => summarisePlaces(moments), [moments])
  const mapped = useMemo(() => places.filter((p) => p.coords), [places])
  const listed = useMemo(() => places.filter((p) => !p.coords), [places])

  /* name → Leaflet marker, so focus styling can reach a marker without re-rendering it. */
  const markers = useRef(new Map())

  useEffect(() => {
    const registry = markers.current
    return () => registry.clear()
  }, [])

  useFocusHighlight(markers, focused?.name ?? null)

  /* One divIcon per PLACE: a `divIcon` OWNS its element and Leaflet MOVES that element when the
   * instance is attached again, so two markers sharing one instance would move the pin instead
   * of drawing it twice. Keyed by place name so two places holding the same picture stay
   * distinct. Derived with `useMemo` rather than a ref: reading a ref during render is what
   * `react-hooks/refs` forbids, and the memo is exactly the right lifetime anyway. */
  const icons = useMemo(
    () =>
      new Map(
        mapped.map((place) => [
          place.name,
          place.photo
            ? L.divIcon({
                className: "",
                html: createPhotoPin(place.photo, place.name),
                iconSize: [42, 42],
                iconAnchor: [21, 44],
                popupAnchor: [0, -42],
              })
            : PLAIN_PIN,
        ])
      ),
    [mapped]
  )

  const withPhoto = useMemo(() => mapped.filter((p) => p.photo).length, [mapped])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold">Peta &amp; Tempat</h2>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {places.length} tempat · {mapped.length} berkoordinat · {withPhoto} berfoto
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <MapContainer
          center={BALIKPAPAN_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="z-0 h-64 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocus target={focused} zoom={FOCUS_ZOOM} />
          {mapped.map((place) => (
            <Marker
              key={place.name}
              position={place.coords}
              alt={place.name}
              icon={icons.get(place.name)}
              ref={(marker) => {
                if (marker) markers.current.set(place.name, marker)
                else markers.current.delete(place.name)
              }}
              eventHandlers={{ click: () => setFocused(place) }}
            >
              <Popup>
                <PopupCard place={place} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {focused && (
        <button
          type="button"
          onClick={() => setFocused(null)}
          className="self-start rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          Fokus: {focused.name} · reset peta
        </button>
      )}

      {places.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          Belum ada tempat tercatat.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {places.map((place, index) => (
            <PlaceCard
              key={place.name}
              place={place}
              rank={index + 1}
              active={focused?.name === place.name}
              onFocus={() => setFocused(place.coords ? place : null)}
            />
          ))}
        </ul>
      )}

      {listed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <Store className="size-3.5 text-primary" aria-hidden="true" />
            Tanpa koordinat ({listed.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {listed.map((p) => (
              <span
                key={p.name}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {p.name} · {p.count}x
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Tempat ini tersimpan tanpa koordinat, jadi belum bisa dipasang di peta. Catat
            kunjungan baru dengan koordinat untuk memunculkannya.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenAdd?.()}
        className="rounded-xl border border-dashed border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        + Catat kunjungan tempat baru
      </button>
    </section>
  )
}

/**
 * Imperative recentre. Leaflet's `center` prop is only read on mount, so driving the map
 * from React state requires a child that can reach `useMap()`. `flyTo` in an effect is a
 * legitimate "sync React state to an external system" effect — it calls no setState.
 */
function MapFocus({ target, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (!target?.coords) return
    map.flyTo(target.coords, zoom, { duration: 0.6 })
  }, [map, target, zoom])
  return null
}

/** Marker popup: the same photo the pin shows, so the two never disagree. */
function PopupCard({ place }) {
  const meta = categoryMeta(place.category)
  return (
    <div className="flex items-center gap-2.5">
      {place.photo ? (
        <img
          src={place.photo}
          alt={place.name}
          className="size-12 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <StickerImage src={null} seed={place.name} alt={place.name} size="sm" shadow="soft" />
      )}
      <div className="min-w-0">
        <span className="block truncate text-xs font-semibold">{place.name}</span>
        <span className="block text-[11px] text-muted-foreground">
          {place.area || "Balikpapan"} · {place.count}x kunjungan
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums">
          <Star className="size-3 fill-warning stroke-warning" aria-hidden="true" />
          {place.avg.toFixed(1).replace(".", ",")} · {meta.label}
        </span>
      </div>
    </div>
  )
}

function PlaceCard({ place, rank, active, onFocus }) {
  const meta = categoryMeta(place.category)
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors",
        active ? "border-primary/50 bg-primary/5" : "border-border"
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold tabular-nums",
          rank <= 3 ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {rank}
      </span>

      {/* Same picture as the pin: matte when it is a cut-out capture, tile otherwise. */}
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          place.photo ? "table-stage" : "border border-border bg-muted/40 p-1"
        )}
      >
        <StickerImage
          src={place.photo}
          seed={place.name}
          alt={place.name}
          size="sm"
          variant={place.photo ? "matte" : "tile"}
          rotate={place.photo ? null : 0}
          shadow="soft"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{place.name}</p>
          {rank === 1 && (
            <TrendingUp className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {place.area || "Balikpapan"} · {place.count}x kunjungan · terakhir{" "}
          {formatShortDate(place.lastDate)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Rating value={place.best} />
          <span
            className={cn("size-1.5 rounded-full", meta.dot)}
            title={meta.label}
            aria-hidden="true"
          />
          <span className="text-[10px] text-muted-foreground">{meta.label}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
          <Star className="size-3 fill-warning stroke-warning" aria-hidden="true" />
          {place.avg.toFixed(1).replace(".", ",")}
        </span>
        {place.coords && (
          <button
            type="button"
            onClick={onFocus}
            aria-label={`Fokuskan peta ke ${place.name}`}
            className={cn(
              "grid size-7 place-items-center rounded-lg transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Navigation className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}
