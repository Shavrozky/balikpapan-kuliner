import { Banknote, Star, Trash } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import RatingInput from "@/components/shared/RatingInput"
import TagEditor from "@/components/shared/TagEditor"
import StickerImage from "@/components/shared/StickerImage"
import { CATEGORIES } from "@/data/categories"
import { cn, formatRupiah } from "@/lib/utils"

/**
 * FoodRow — one dish on the table, fully editable in place.
 *
 * Editing is INLINE (not a nested dialog) because a table can hold half a dozen dishes and
 * stacking modal-on-modal to edit one row is worse than a slightly taller list.
 *
 * Controlled component: it owns no state, so AddTableModal's draft stays the single source of
 * truth and a reset is just "give it a fresh array".
 */
export default function FoodRow({ food, index, onChange, onRemove, className }) {
  const set = (key, value) => onChange?.({ ...food, [key]: value })
  const unnamed = !food.name.trim()

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-3",
        unnamed && "border-dashed",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <StickerImage
          src={food.photo || null}
          seed={food.id || food.name || `dish-${index}`}
          alt={food.name}
          size="md"
          variant={food.photo ? "matte" : "tile"}
          rotate={0}
          shadow="soft"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <Input
              value={food.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={`Nama makanan #${index + 1} (boleh dikosongkan)`}
              aria-label={`Nama makanan ${index + 1}`}
              className="h-8"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove this food: ${food.name || `makanan ${index + 1}`}`}
              title="Remove this food"
              onClick={() => onRemove?.(food.id)}
              className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = food.category === cat.value
              const Icon = cat.icon
              return (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("category", cat.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors outline-none",
                    "focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? cn("border-transparent", cat.chip)
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <RatingInput
          value={food.rating}
          onChange={(v) => set("rating", v)}
          size="sm"
          ariaLabel={`Rating ${food.name || `makanan ${index + 1}`}`}
        />

        <div className="relative">
          <Banknote
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={food.price || ""}
            onChange={(e) => set("price", Number(e.target.value) || 0)}
            placeholder="Harga"
            aria-label={`Harga ${food.name || `makanan ${index + 1}`}`}
            className="h-7 w-32 pl-8 text-xs"
          />
        </div>

        {food.price > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {formatRupiah(food.price)}
          </Badge>
        )}
      </div>

      <TagEditor
        id={`food-tags-${food.id}`}
        tags={food.tags}
        onChange={(tags) => set("tags", tags)}
        label={`Tag ${food.name || `makanan ${index + 1}`}`}
        placeholder="Tag — Enter untuk tambah"
        size="sm"
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`food-thoughts-${food.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Star className="size-3" aria-hidden="true" />
          Thoughts
        </label>
        <Textarea
          id={`food-thoughts-${food.id}`}
          rows={2}
          value={food.thoughts}
          onChange={(e) => set("thoughts", e.target.value)}
          placeholder="Rasanya, porsinya, harganya — apa yang mau kamu ingat?"
          className="text-xs"
        />
      </div>
    </li>
  )
}

/** Exported for the summary line in AddTableModal's footer. */
