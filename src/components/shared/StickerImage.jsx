import {
  Beef,
  CakeSlice,
  Cherry,
  Coffee,
  Cookie,
  CupSoda,
  Donut,
  Drumstick,
  EggFried,
  Fish,
  IceCreamBowl,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * StickerImage — a food photo rendered with the "sticker" treatment: a thick white outline
 * around a die-cut shape plus a soft offset drop shadow.
 *
 * Two rendering modes:
 *
 *  1. `variant="matte"` (used for camera/import captures) — the PNG already has a
 *     transparent background, so it is drawn as a free-floating cut-out: no frame, no
 *     background, no padding, and it may OVERFLOW its box slightly. That overflow is what
 *     makes it read as a sticker peeled off a sheet rather than an image in a slot, and a
 *     framed transparent PNG would look like a picture of a hole.
 *
 *  2. `variant="tile"` (used for seed data and any moment with no photo) — a DETERMINISTIC
 *     gradient + lucide food icon derived from `seed`, so a given moment looks identical
 *     across reloads and across the month/list/places views. `Math.random()` is deliberately
 *     avoided: the react-hooks/purity lint rule rejects impure calls reachable from render,
 *     and random art would make the diary look different on every visit.
 *
 * No emoji anywhere — the icon set is the same lucide-react library the rest of the app uses.
 */

const SIZES = {
  xs: "size-8 rounded-lg border-2",
  sm: "size-11 rounded-xl border-2",
  md: "size-14 rounded-xl border-[3px]",
  lg: "size-20 rounded-2xl border-4",
  xl: "size-28 rounded-2xl border-4",
}

/** `matte` boxes are deliberately smaller: the cut-out spills past them (see MATTE_SCALE). */
const MATTE_BOXES = {
  xs: "size-9",
  sm: "size-12",
  md: "size-16",
  lg: "size-24",
  xl: "size-32",
}

const MATTE_SCALE = {
  xs: "size-[130%]",
  sm: "size-[135%]",
  md: "size-[140%]",
  lg: "size-[145%]",
  xl: "size-[150%]",
}

const ICON_SIZES = {
  xs: "size-4",
  sm: "size-5",
  md: "size-7",
  lg: "size-9",
  xl: "size-12",
}

/* Literal class strings only — Tailwind's scanner cannot see interpolated names. */
const TILES = [
  "bg-gradient-to-br from-primary/25 to-primary/60",
  "bg-gradient-to-br from-chart-3/25 to-chart-3/60",
  "bg-gradient-to-br from-success/25 to-success/60",
  "bg-gradient-to-br from-warning/30 to-warning/65",
  "bg-gradient-to-br from-chart-5/25 to-chart-5/60",
  "bg-gradient-to-br from-primary/20 via-accent to-warning/50",
  "bg-gradient-to-tl from-chart-2/25 to-chart-4/60",
  "bg-gradient-to-br from-accent to-primary/45",
]

const ICONS = [
  Beef,
  CupSoda,
  Fish,
  Pizza,
  Soup,
  Salad,
  Sandwich,
  Donut,
  Coffee,
  CakeSlice,
  Cookie,
  Cherry,
  IceCreamBowl,
  Drumstick,
  EggFried,
  UtensilsCrossed,
]

/** FNV-1a — small, fast, and stable across engines (unlike hashing via Math.random). */
function hashString(value) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export default function StickerImage({
  src,
  alt = "",
  seed = "seed",
  size = "md",
  variant = "tile",
  rotate = null,
  shadow = "strong",
  className,
  imgClassName,
}) {
  const hash = hashString(String(seed))
  /* ±7° keeps a scattered, hand-placed feel without looking broken. */
  const angle = rotate === null ? ((hash % 15) - 7) : rotate

  if (variant === "matte" && src) {
    return (
      <figure
        className={cn("relative m-0 grid shrink-0 place-items-center", MATTE_BOXES[size], className)}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn(
            /* The white sticker outline is three drop-shadows under the PNG: a hard ring around
             * the alpha silhouette, a second ring for thickness, then the soft cast shadow. A
             * `border` cannot do this — it would trace the box, not the cut-out. */
            "max-w-none object-contain",
            shadow === "strong" && "sticker-mat",
            shadow === "soft" && "sticker-mat-soft",
            MATTE_SCALE[size],
            imgClassName
          )}
        />
      </figure>
    )
  }

  const tile = TILES[hash % TILES.length]
  const Icon = ICONS[hash % ICONS.length]
  const dims = SIZES[size] ?? SIZES.md
  const iconDims = ICON_SIZES[size] ?? ICON_SIZES.md

  return (
    <figure
      className={cn("relative m-0 shrink-0", className)}
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden border-white bg-muted",
          shadow === "strong" && "sticker-shadow",
          shadow === "soft" && "sticker-shadow-soft",
          dims
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={cn("size-full object-cover", imgClassName)}
          />
        ) : (
          <span
            role="img"
            aria-label={alt || "stiker kuliner"}
            className={cn("grid size-full place-items-center", tile)}
          >
            <Icon className={cn(iconDims, "text-white/95 drop-shadow-sm")} aria-hidden="true" />
          </span>
        )}
      </div>
    </figure>
  )
}
