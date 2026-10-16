import { CalendarDays, LayoutGrid, Tag, User } from "lucide-react"

/**
 * The bottom-dock tab vocabulary, kept in its own module (no components) so BottomDock.jsx
 * exports exactly one component and stays fast-refresh clean.
 *
 * `value` → URL hash segment and `aria-current` identity.
 * `view`  → key into App's VIEWS map (the component that renders the tab).
 */
export const NAV_ITEMS = [
  { value: "table", label: "Table", icon: LayoutGrid, view: "list" },
  { value: "collections", label: "Collections", icon: CalendarDays, view: "month" },
  { value: "tags", label: "Tags", icon: Tag, view: "places" },
  { value: "you", label: "You", icon: User, view: "you" },
]

export const LEFT_ITEMS = NAV_ITEMS.slice(0, 2)
export const RIGHT_ITEMS = NAV_ITEMS.slice(2)
export const DEFAULT_TAB = NAV_ITEMS[0].value

export function isTab(value) {
  return NAV_ITEMS.some((item) => item.value === value)
}

export function viewForTab(tab) {
  return NAV_ITEMS.find((item) => item.value === tab)?.view ?? "list"
}
