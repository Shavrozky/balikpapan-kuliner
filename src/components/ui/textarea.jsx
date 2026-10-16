import * as React from "react"
import { cn } from "cn"

/**
 * Textarea — shadcn/ui styling for a native `<textarea>`.
 *
 * There is no `textarea` primitive in `@base-ui/react`, so unlike `Input` this wraps the
 * plain element. The class string mirrors `input.jsx` (same border/ring/invalid/dark tokens)
 * so a textarea and an input sitting side by side stay pixel-consistent.
 */
function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-16 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
