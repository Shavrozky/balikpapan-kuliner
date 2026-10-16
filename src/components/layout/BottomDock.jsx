import { Camera } from "lucide-react"

import { LEFT_ITEMS, RIGHT_ITEMS } from "@/components/layout/nav"
import { cn } from "@/lib/utils"

/**
 * BottomDock — the floating bottom navigation with a raised camera FAB.
 *
 * The dock is `fixed`, so App adds matching bottom padding to the scroll container. The nav
 * wrapper is `pointer-events-none` with `pointer-events-auto` on the pill, so the
 * transparent gutter either side of the pill stays click-through.
 *
 * The tab vocabulary lives in `./nav.js`, which keeps this file at one component export
 * (required by `react-refresh/only-export-components`).
 *
 * Grid: `1fr 1fr auto 1fr 1fr` — the FAB gets its own centred auto column, so the two pairs
 * of tabs flank it symmetrically at any width.
 */
export default function BottomDock({ active, onChange, onOpenAdd }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-3"
    >
      <div className="dock-glass pointer-events-auto grid w-full max-w-sm grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-0.5 rounded-2xl border border-border/70 p-1.5 shadow-lg shadow-black/5">
        {LEFT_ITEMS.map((item) => (
          <DockButton
            key={item.value}
            item={item}
            active={active === item.value}
            onSelect={onChange}
          />
        ))}

        <button
          type="button"
          onClick={() => onOpenAdd?.()}
          aria-label="Tambah momen kuliner"
          className={cn(
            "-mt-7 grid size-14 place-items-center rounded-full border-4 border-background",
            "bg-gradient-to-br from-primary to-chart-5 text-primary-foreground",
            "shadow-lg shadow-primary/30 transition-transform outline-none",
            "hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
          )}
        >
          <Camera className="size-6" />
        </button>

        {RIGHT_ITEMS.map((item) => (
          <DockButton
            key={item.value}
            item={item}
            active={active === item.value}
            onSelect={onChange}
          />
        ))}
      </div>
    </nav>
  )
}

function DockButton({ item, active, onSelect }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.value)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("size-[18px]", active && "stroke-[2.4]")} />
      <span className="max-w-full truncate text-[10px] font-medium">{item.label}</span>
    </button>
  )
}
