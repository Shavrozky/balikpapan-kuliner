import { Camera, Search, Settings, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import logoUrl from "@/assets/bpndiary-logo.svg"
import { cn } from "@/lib/utils"

/**
 * Header — the BpnDiary wordmark plus the Search and Settings affordances.
 *
 * The search field expands in place (no new route) and is fully controlled by
 * `search` / `onSearchChange` from App, so the query survives tab switches and can also
 * be set from a URL hash. Escape clears and collapses it.
 */
export default function Header({
  search,
  onSearchChange,
  onOpenSettings,
  onOpenAdd,
  searchOpen,
  onSearchOpenChange,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={logoUrl}
            alt="BpnDiary"
            width="32"
            height="32"
            className="size-8 shrink-0 rounded-xl shadow-sm"
          />
          <div className="min-w-0 leading-tight">
            <p className="font-heading truncate text-base font-semibold tracking-tight">
              Bpn<span className="text-primary">Diary</span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Arsip kuliner Balikpapan
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div
            className={cn(
              "flex items-center overflow-hidden transition-[width,opacity] duration-200",
              searchOpen ? "w-40 opacity-100 sm:w-56" : "w-0 opacity-0"
            )}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                autoFocus={searchOpen}
                aria-label="Cari momen kuliner"
                placeholder="Cari makanan / tempat…"
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onSearchChange?.("")
                    onSearchOpenChange?.(false)
                  }
                }}
                className="pl-8"
              />
            </div>
          </div>

          <Button
            variant={searchOpen ? "secondary" : "ghost"}
            size="icon"
            aria-label={searchOpen ? "Tutup pencarian" : "Buka pencarian"}
            aria-pressed={searchOpen}
            onClick={() => {
              /* Closing also clears the query, otherwise the list stays filtered with no
               * visible affordance explaining why. */
              if (searchOpen) onSearchChange?.("")
              onSearchOpenChange?.(!searchOpen)
            }}
          >
            {searchOpen ? <X /> : <Search />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Tambah momen cepat"
            className="sm:hidden"
            onClick={() => onOpenAdd?.()}
          >
            <Camera />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Pengaturan"
            onClick={() => onOpenSettings?.()}
          >
            <Settings />
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5 px-4 pb-2 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="size-3" />
          <span>
            Menyaring {search ? "seluruh arsip" : "semua momen"} — tekan Esc untuk menutup.
          </span>
        </div>
      )}
    </header>
  )
}
