/**
 * Background matting for "What's on the table?" captures.
 *
 * `cutoutBackdrop` is PURE — it takes and returns plain `{ data, width, height }` objects and
 * never touches the DOM, so it can be exercised from node (see scripts/check-matte.mjs). The
 * `renderMatte` helper at the bottom is the only part that needs a browser, and even it defers
 * every DOM access to call time so importing this module in node stays safe.
 *
 * The algorithm is an edge flood fill, the same idea as a paint program's magic wand:
 *   1. Estimate the backdrop colour from the image border.
 *   2. Flood-fill inward from every border pixel, claiming neighbours whose colour is within
 *      `tolerance` of that backdrop.
 *   3. Punch those pixels to alpha 0, then feather the 1px boundary so the cut-out does not
 *      look like it was sliced with scissors.
 *
 * Why not an ML segmentation model: it would mean shipping a multi-megabyte WASM weight file
 * and a network fetch on first use, for a diary that otherwise runs entirely offline. A flood
 * fill is instant, deterministic, and — on the case this feature targets, food photographed
 * against a table or wall — good enough. Its limitation is honest and documented: a backdrop
 * that matches the food's own colour (a white plate on a white table) will be eaten too.
 */

/** Preview edge, in px. The sticker renders at 80–112px, so 320 is a comfortable 2–4×. */
export const MAX_PREVIEW = 320

/** Below this fraction of surviving foreground we assume the fill ate the subject. */
const RUNAWAY_RATIO = 0.97

export const MATTE_PRESETS = [
  { id: "ringan", label: "Ringan", tolerance: 18, hint: "Latar polos & kontras" },
  { id: "sedang", label: "Sedang", tolerance: 34, hint: "Latat meja / dinding" },
  { id: "kuat", label: "Kuat", tolerance: 54, hint: "Latar bergradasi" },
]

export const DEFAULT_PRESET = "sedang"

export function toleranceOf(presetId) {
  return (MATTE_PRESETS.find((p) => p.id === presetId) ?? MATTE_PRESETS[1]).tolerance
}

/** Per-channel Euclidean distance, normalised to a 0–255 scale so presets read intuitively. */
function channelDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt((dr * dr + dg * dg + db * db) / 3)
}

/** Mean colour of the border ring. Fully transparent pixels are skipped. */
export function estimateBackdrop(data, width, height) {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const add = (i) => {
    if (data[i + 3] === 0) return
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n += 1
  }
  for (let x = 0; x < width; x += 1) {
    add(x * 4)
    add(((height - 1) * width + x) * 4)
  }
  for (let y = 0; y < height; y += 1) {
    add(y * width * 4)
    add((y * width + width - 1) * 4)
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0]
}

/**
 * Averaged 3×3 alpha, applied ONLY where a pixel disagrees with a neighbour. Interior pixels
 * and untouched backdrop therefore keep their exact alpha; only the silhouette edge softens.
 */
function featherAlpha(data, width, height) {
  const alpha = new Uint8ClampedArray(width * height)
  for (let p = 0; p < alpha.length; p += 1) alpha[p] = data[p * 4 + 3]

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const self = alpha[y * width + x]
      let sum = 0
      let count = 0
      let differs = false
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          const near = alpha[ny * width + nx]
          sum += near
          count += 1
          if (near !== self) differs = true
        }
      }
      if (differs) data[(y * width + x) * 4 + 3] = sum / count
    }
  }
}

/**
 * Returns a NEW rgba buffer with the backdrop punched out. The input is never mutated.
 *
 * Fail-safes (both return the original pixels, `failed: true`):
 *  • `cleared === 0`          — nothing matched, e.g. a busy backdrop: better an unmatted
 *                               photo than a sticker with a hole in it.
 *  • `cleared` ≥ 97% of pixels — the fill ate the subject, which is what happens when the
 *                               food and the backdrop share a colour.
 */
export function cutoutBackdrop(imageData, { tolerance = 34 } = {}) {
  const { data, width, height } = imageData
  const src = data
  const original = new Uint8ClampedArray(src)
  const out = new Uint8ClampedArray(src)
  const total = width * height

  if (!width || !height) {
    return { data: original, width, height, cleared: 0, failed: true }
  }

  const [br, bg, bb] = estimateBackdrop(src, width, height)
  const visited = new Uint8Array(total)
  /* Each pixel is enqueued at most once (guarded by `visited`), so `total` slots suffice. */
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  const matches = (idx) => {
    const i = idx * 4
    return channelDistance(src[i], src[i + 1], src[i + 2], br, bg, bb) <= tolerance
  }

  const seed = (idx) => {
    if (visited[idx]) return
    visited[idx] = 1
    if (matches(idx)) queue[tail++] = idx
  }

  for (let x = 0; x < width; x += 1) {
    seed(x)
    seed((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width)
    seed(y * width + width - 1)
  }

  let cleared = 0
  while (head < tail) {
    const idx = queue[head++]
    out[idx * 4 + 3] = 0
    cleared += 1

    const x = idx % width
    const y = (idx - x) / width
    if (x > 0) seed(idx - 1)
    if (x < width - 1) seed(idx + 1)
    if (y > 0) seed(idx - width)
    if (y < height - 1) seed(idx + width)
  }

  if (cleared === 0 || cleared >= total * RUNAWAY_RATIO) {
    return { data: original, width, height, cleared: 0, failed: true }
  }

  featherAlpha(out, width, height)
  return { data: out, width, height, cleared, failed: false }
}

/* ------------------------------------------------------------------ *
 * Browser plumbing — every DOM access happens inside a function body.
 * ------------------------------------------------------------------ */

async function loadBitmap(source) {
  if (typeof source === "string") {
    const response = await fetch(source)
    const blob = await response.blob()
    return await createImageBitmap(blob)
  }
  return await createImageBitmap(source)
}

/**
 * Decodes `source` (a `File`/`Blob` from the camera or a media picker, or a data/object URL),
 * downscales it to `max` px on the long edge, and returns both the raw PNG and the matted
 * transparent PNG as data URLs. Data URLs — not object URLs — because the result is persisted
 * into localStorage, and object URLs do not survive a reload.
 */
export async function renderMatte(source, presetId = DEFAULT_PRESET, max = MAX_PREVIEW) {
  const bitmap = await loadBitmap(source)
  const longest = Math.max(bitmap.width, bitmap.height) || 1
  const scale = Math.min(1, max / longest)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, width, height)
  const raw = canvas.toDataURL("image/png")

  const rgba = ctx.getImageData(0, 0, width, height)
  const { data, cleared, failed } = cutoutBackdrop(rgba, {
    tolerance: toleranceOf(presetId),
  })
  ctx.putImageData(new ImageData(data, width, height), 0, 0)
  const url = failed ? raw : canvas.toDataURL("image/png")

  if (typeof bitmap.close === "function") bitmap.close()

  return { url, rawUrl: raw, width, height, cleared, failed }
}

/** Rough base64 payload size, used to warn before a capture blows the localStorage quota. */
export function approxBytes(dataUrl) {
  const comma = typeof dataUrl === "string" ? dataUrl.indexOf(",") : -1
  return comma < 0 ? 0 : Math.round(((dataUrl.length - comma - 1) * 3) / 4)
}
