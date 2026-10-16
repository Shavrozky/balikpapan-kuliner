/**
 * Balikpapan area vocabulary — district-level centroids.
 *
 * Coordinates were geocoded from OpenStreetMap/Nominatim (July 2026) and rounded to 4 decimal
 * places (~11 m). They are DISTRICT CENTROIDS, not surveyed restaurant locations: two warungs
 * in the same kelurahan resolve to the same point, so pins in the same area overlap. That is
 * the honest resolution for an archive that tags a place by its kelurahan — the pin answers
 * "which part of Balikpapan was this?", not "which building?".
 *
 * Used by:
 *   • the AddMomentModal / AddTableModal area picker, to attach coordinates to a new moment
 *     (without this, nothing a user archives could ever reach the map)
 *   • the seed data in initialMoments.js
 *
 * Keep the `name` strings EXACTLY as they appear here — they are matched against the `area`
 * field already stored in localStorage, so renaming one orphans existing records.
 */
export const AREAS = [
  { name: "Klandasan", coords: [-1.2744, 116.843] },
  { name: "Karang Joang", coords: [-1.1302, 116.8779] },
  { name: "Kebun Sayur", coords: [-1.2406, 116.8258] },
  { name: "Gunung Sari", coords: [-1.2673, 116.8393] },
  { name: "Manggar", coords: [-1.2269, 116.9502] },
  { name: "Somber", coords: [-1.2092, 116.8333] },
  { name: "Sepinggan", coords: [-1.2431, 116.9201] },
  { name: "Rapak", coords: [-1.227, 116.8377] },
  { name: "Kariangau", coords: [-1.1743, 116.8039] },
  { name: "Margasari", coords: [-1.2375, 116.8214] },
  { name: "Pandan Sari", coords: [-1.239, 116.8268] },
  { name: "Balikpapan", coords: [-1.2399, 116.8593] },
  { name: "Batu Ampar", coords: [-1.2455, 116.8665] },
  { name: "Balikpapan Kota", coords: [-1.2379, 116.8529] },
  { name: "Balikpapan Selatan", coords: [-1.2571, 116.8914] },
  { name: "Balikpapan Utara", coords: [-1.1833, 116.8627] },
  { name: "Balikpapan Timur", coords: [-1.2126, 116.9382] },
  { name: "Balikpapan Barat", coords: [-1.2286, 116.7967] },
  { name: "Balikpapan Tengah", coords: [-1.2407, 116.8446] },
]

const BY_NAME = new Map(AREAS.map((a) => [a.name, a]))

/** `'Klandasan'` → `[-1.2744, 116.843]`, or `null` for an unknown/blank area. */
export function coordsForArea(name) {
  const key = String(name ?? "").trim().toLowerCase()
  if (!key) return null
  for (const [areaName, entry] of BY_NAME) {
    if (areaName.toLowerCase() === key) return entry.coords
  }
  return null
}

export const AREA_NAMES = AREAS.map((a) => a.name)
