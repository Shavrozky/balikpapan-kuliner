import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * RatingInput — a keyboard-reachable 0..5 star picker.
 *
 * Extracted from AddMomentModal so the "What's on the table?" dish rows can reuse it instead
 * of duplicating five clickable stars per dish. Real `<button>`s (not clickable spans) so it
 * announces as a group of pressed buttons and responds to Enter/Space.
 *
 * `value === 0` means "not rated"; clicking the current value clears it, which is why there is
 * no separate reset button.
 */
export default function RatingInput({
  value = 0,
  onChange,
  size = "md",
  showLabel = true,
  ariaLabel = "Rating",
  className,
}) {
  const box = size === "sm" ? "size-7" : "size-8"
  const star = size === "sm" ? "size-3.5" : "size-4"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div role="group" aria-label={ariaLabel} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value
          return (
            <button
              key={n}
              type="button"
              aria-label={`Beri ${n} bintang`}
              aria-pressed={active}
              onClick={() => onChange?.(value === n ? 0 : n)}
              className={cn(
                "grid place-items-center rounded-lg border transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                box,
                active
                  ? "border-warning/60 bg-warning/15 text-warning"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <Star className={cn(star, active && "fill-warning stroke-warning")} />
            </button>
          )
        })}
      </div>
      {showLabel && (
        <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
          {value > 0 ? `${value},0` : "belum dinilai"}
        </span>
      )}
    </div>
  )
}
