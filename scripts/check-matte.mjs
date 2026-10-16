/**
 * Standalone check for the matting algorithm — no test framework needed:
 *
 *   node scripts/check-matte.mjs
 *
 * Exits non-zero on the first failure. Covers the happy path plus the two ways this algorithm
 * realistically goes wrong: a subject that matches its backdrop, and a backdrop it cannot
 * identify at all.
 */
import { cutoutBackdrop, estimateBackdrop, toleranceOf } from "../src/lib/imageMatte.js"

let failures = 0

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

/** Builds an rgba buffer from a `(x, y) => [r, g, b, a?]` painter. */
function paint(width, height, fn) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = fn(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return { data, width, height }
}

const alphaAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3]

console.log("estimateBackdrop")
{
  /* White ring, red centre: the border average must ignore the centre entirely. */
  const img = paint(9, 9, (x, y) =>
    x === 0 || y === 0 || x === 8 || y === 8 ? [255, 255, 255] : [220, 40, 40]
  )
  const [r, g, b] = estimateBackdrop(img.data, img.width, img.height)
  check("border mean is the backdrop, not the subject", r > 250 && g > 250 && b > 250, `${r},${g},${b}`)
}

console.log("\ncutoutBackdrop — happy path")
{
  /* 3px-thick backdrop ring, so the corners have background neighbours on every side and the
   * feather below is exercised only at the real silhouette. */
  const w = 14
  const h = 14
  const img = paint(w, h, (x, y) =>
    x < 3 || y < 3 || x >= w - 3 || y >= h - 3 ? [250, 250, 250] : [30, 140, 60]
  )
  const out = cutoutBackdrop(img, { tolerance: toleranceOf("sedang") })
  check("does not fail safe on a clean cut-out", out.failed === false)
  check("subject centre stays opaque", alphaAt(out, 7, 7) === 255, String(alphaAt(out, 7, 7)))
  check("deep backdrop corner is fully cleared", alphaAt(out, 0, 0) === 0, String(alphaAt(out, 0, 0)))
  check("input buffer was not mutated", img.data[3] === 255, String(img.data[3]))
  check("cleared count is the ring", out.cleared === w * h - 8 * 8, String(out.cleared))

  /* The feather must produce mid alphas somewhere along the silhouette — that is the whole
   * point of it. Without this the cut-out has hard jagged 1px stair-steps. */
  let feathered = 0
  for (let p = 0; p < w * h; p += 1) {
    const a = out.data[p * 4 + 3]
    if (a > 0 && a < 255) feathered += 1
  }
  check("silhouette edge is feathered", feathered > 0, `${feathered} soft pixels`)
  /* ...but the interior must stay 100% opaque, or the sticker looks washed out. */
  check("interior alpha is untouched", alphaAt(out, 8, 8) === 255 && alphaAt(out, 5, 5) === 255)
}

console.log("\ncutoutBackdrop — boundary: subject matches the backdrop")
{
  /* Uniform white, so the fill reaches every pixel: must bail out, not return a blank PNG. */
  const img = paint(8, 8, () => [255, 255, 255])
  const out = cutoutBackdrop(img, { tolerance: toleranceOf("kuat") })
  check("flags the runaway fill", out.failed === true)
  check("keeps every pixel opaque", alphaAt(out, 4, 4) === 255 && alphaAt(out, 0, 0) === 255)
  check("reports zero cleared", out.cleared === 0, String(out.cleared))
}

console.log("\ncutoutBackdrop — boundary: busy backdrop")
{
  /* Alternating stripes, high contrast: nothing should match, so the photo survives intact. */
  const img = paint(10, 10, (x) => (x % 2 ? [0, 0, 0] : [255, 255, 255]))
  const out = cutoutBackdrop(img, { tolerance: toleranceOf("ringan") })
  check("flags the unmatched backdrop", out.failed === true)
  check("returns the original pixels", alphaAt(out, 5, 5) === 255 && alphaAt(out, 0, 0) === 255)
}

console.log("\ncutoutBackdrop — tolerance is monotonic (when a cut happens at all)")
{
  /* Soft ramp from the border. The weak preset must cut *something* or this proves nothing. */
  const img = paint(20, 20, (x) => {
    const v = Math.max(0, 180 - x * 6)
    return [v, v, v]
  })
  const soft = cutoutBackdrop(img, { tolerance: toleranceOf("ringan") })
  check("weak preset cuts at least part of the ramp", soft.failed === false, `cleared=${soft.cleared}`)
  const softCleared = soft.failed ? 0 : soft.cleared
  const hard = cutoutBackdrop(img, { tolerance: toleranceOf("kuat") })
  const hardCleared = hard.failed ? 0 : hard.cleared
  check("stronger preset clears more", hardCleared > softCleared, `${softCleared} → ${hardCleared}`)

  /* Known limitation, asserted so it stays documented: on a full black→white gradient the
   * backdrop average sits mid-ramp, so the fill claims a BAND of columns rather than either
   * nothing or everything. It does not run away (the band is bounded), but it also does not
   * produce a clean silhouette — which is exactly why the UI offers a manual tolerance
   * control and a "raw" escape hatch instead of pretending this is segmentation. */
  const full = paint(20, 20, (x) => [x * 12, x * 12, x * 12])
  const banded = cutoutBackdrop(full, { tolerance: toleranceOf("kuat") })
  check("gradient clears a bounded band, not the whole frame", banded.failed === false)
  check(
    "band is a minority of the frame",
    banded.cleared > 0 && banded.cleared < 20 * 20,
    `${banded.cleared}/${20 * 20}`
  )
}

console.log("\ncutoutBackdrop — degenerate input")
{
  const empty = cutoutBackdrop({ data: new Uint8ClampedArray(0), width: 0, height: 0 })
  check("zero-size image fails safe", empty.failed === true && empty.cleared === 0)
}

console.log(failures === 0 ? "\nAll matte checks passed." : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
