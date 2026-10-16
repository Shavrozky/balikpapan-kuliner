import { useState } from "react"
import { Tag, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * TagEditor — free-text tag chips with Enter/comma commit and Backspace-to-delete.
 *
 * Extracted from AddMomentModal so the per-dish rows in AddTableModal reuse it verbatim; the
 * keydown contract is fiddly enough that two copies would drift.
 *
 * Chips are read-only here (removal only) because in both call sites the tag set is a draft
 * the user is still assembling — editing a chip in place would need a second input state for
 * no real gain.
 */
export default function TagEditor({
  tags = [],
  onChange,
  label = "Tag",
  placeholder = "Ketik lalu Enter — cth. seafood",
  id,
  className,
  size = "md",
}) {
  const [draft, setDraft] = useState("")

  function commit() {
    const raw = draft.trim().replace(/^#/, "")
    if (!raw) return
    /* Case-insensitive de-dupe: "#Seafood" and "#seafood" are the same tag to a human. */
    const exists = tags.some((t) => t.toLowerCase() === raw.toLowerCase())
    if (!exists) onChange?.([...tags, raw])
    setDraft("")
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commit()
    } else if (event.key === "Backspace" && !draft && tags.length) {
      event.preventDefault()
      onChange?.(tags.slice(0, -1))
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <Tag
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          /* Commit on blur so a typed-but-unconfirmed tag is not silently dropped by Save. */
          onBlur={commit}
          placeholder={placeholder}
          aria-label={label}
          className={size === "sm" ? "h-7 pl-8 text-xs" : "pl-8"}
        />
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange?.(tags.filter((t) => t !== tag))}
                aria-label={`Hapus tag ${tag}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground transition-colors",
                  "hover:bg-destructive/15 hover:text-destructive",
                  size === "sm" ? "text-[10px]" : "text-xs"
                )}
              >
                #{tag}
                <X className="size-2.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
