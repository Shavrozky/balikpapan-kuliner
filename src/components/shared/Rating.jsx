import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Rating — read-only 0..5 star strip. Shared by ListView, PlacesView and YouView.
 *
 * Lives in its own file (rather than being exported from ListView) because
 * `react-refresh/only-export-components` rejects a module that mixes a default-exported
 * component with a second named component export.
 */
export default function Rating({ value = 0, size = "sm", showValue = false, className }) {
  const dim = size === "md" ? "size-3.5" : "size-3"

  if (!value) {
    return (
      <span className={cn("text-[11px] text-muted-foreground", className)}>
        belum dinilai
      </span>
    )
  }

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} dari 5 bintang`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            dim,
            n <= value ? "fill-warning stroke-warning" : "stroke-muted-foreground/40"
          )}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">
          {value},0
        </span>
      )}
    </span>
  )
}
