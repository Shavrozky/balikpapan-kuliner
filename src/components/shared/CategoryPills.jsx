import { CATEGORY_FILTERS, categoryTone } from "@/data/categories"
import { cn } from "@/lib/utils"

/**
 * CategoryPills — the All / Food / Drinks / Others / Notes filter row.
 *
 * Purely presentational + controlled: the owning view holds `value` and reacts to
 * `onChange`. Horizontally scrollable with the scrollbar hidden so it reads as a native
 * mobile chip rail. Icons come from `categories.js` (lucide), never emoji.
 *
 * `counts` is optional: `{ [value]: number }` renders a small badge per pill.
 */
export default function CategoryPills({ value, onChange, counts = null, className }) {
  return (
    <div
      role="tablist"
      aria-label="Filter kategori"
      className={cn(
        "hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1",
        className
      )}
    >
      {CATEGORY_FILTERS.map((cat) => {
        const active = value === cat.value
        const count = counts ? counts[cat.value] : undefined
        const Icon = cat.icon
        return (
          <button
            key={cat.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(cat.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5",
              "text-xs font-semibold transition-all outline-none select-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-3.5",
                active ? "text-primary-foreground" : categoryTone(cat.value)
              )}
              aria-hidden="true"
            />
            <span>{cat.label}</span>
            {typeof count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
