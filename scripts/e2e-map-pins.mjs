/**
 * Verifies that archived dishes/drinks appear on the Kuliner map as pins showing their own
 * picture ("show icon … sesuai dengan gambar").
 *
 *   node scripts/e2e-map-pins.mjs
 *
 * Covers both pin kinds and the wiring that makes a new archive reach the map at all:
 *   • places WITH a photo  → the photo pin (an <img> inside .bpndiary-pin-photo)
 *   • places WITHOUT       → the plain gradient teardrop
 *   • a freshly archived capture → gets coordinates from its area and shows up as a new pin
 */
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"

const require = createRequire(import.meta.url)
const { chromium } = require("D:/6. Codingan/wedding-planner/node_modules/playwright")

const BASE = "http://localhost:5180/"
const TMP = "scripts/.fixture-map.png"

let failures = 0
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`)
  if (!ok) failures += 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(String(e.message)))
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text())
})

await page.goto(BASE, { waitUntil: "networkidle" })
await page.evaluate(() => window.localStorage.removeItem("bpndiary.moments.v1"))
await page.reload({ waitUntil: "networkidle" })

console.log("open the Kuliner map")
await page.getByRole("tab", { name: /Peta Kuliner/ }).click()
await page.locator(".leaflet-container").waitFor({ timeout: 15000 })
await page.waitForTimeout(1200) /* let tiles + markers settle */

const stats = await page.evaluate(() => {
  const photoPins = [...document.querySelectorAll(".bpndiary-pin-photo")]
  const plainPins = [...document.querySelectorAll(".bpndiary-pin")]
  const imgs = photoPins.map((p) => p.querySelector("img")).filter(Boolean)
  return {
    photoPinCount: photoPins.length,
    plainPinCount: plainPins.length,
    imgCount: imgs.length,
    loadedImgs: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    sampleSrc: imgs[0]?.getAttribute("src") ?? null,
    /* The pin photo must be served as an image, not inlined as markup. */
    srcIsFoodAsset: imgs.every((i) => (i.getAttribute("src") || "").startsWith("/food/")),
    header: document.querySelector("section")?.textContent?.slice(0, 90) ?? "",
  }
})

console.log("\npins rendered")
check("photo pins exist", stats.photoPinCount > 0, String(stats.photoPinCount))
check("plain pins exist for photo-less places", stats.plainPinCount > 0, String(stats.plainPinCount))
check("every photo pin holds an <img>", stats.imgCount === stats.photoPinCount)
check("all pin photos loaded", stats.loadedImgs === stats.imgCount, `${stats.loadedImgs}/${stats.imgCount}`)
check("pin src points at the archived asset", stats.srcIsFoodAsset, stats.sampleSrc)
check("header reports the photo count", /berfoto/.test(stats.header), stats.header)

/* The pin really is transparent-cut art on the map, not an opaque box. */
const alpha = await page.evaluate(async () => {
  const img = document.querySelector(".bpndiary-pin-photo img")
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext("2d")
  ctx.drawImage(img, 0, 0)
  const px = ctx.getImageData(0, 0, c.width, c.height).data
  const mid = Math.floor(c.height / 2) * c.width + Math.floor(c.width / 2)
  return { corner: px[3], centre: px[mid * 4 + 3] }
})
check("pin art corner is transparent", alpha.corner === 0, `alpha=${alpha.corner}`)
check("pin art subject is opaque", alpha.centre === 255, `alpha=${alpha.centre}`)

/* Clicking a photo pin must open its popup — and the popup must survive the focus styling,
 * which is exactly what a naive "swap the icon to style it" approach would break. */
console.log("\nclick a photo pin")
await page.locator(".bpndiary-pin-photo").first().click({ force: true })
await page.waitForTimeout(900)
check("popup opened", (await page.locator(".leaflet-popup-content").count()) > 0)

const popup = await page.evaluate(() => {
  const box = document.querySelector(".leaflet-popup-content")
  if (!box) return null
  const img = box.querySelector("img")
  return {
    text: box.textContent.slice(0, 60),
    hasImg: Boolean(img),
    src: img?.getAttribute("src") ?? null,
    isFood: Boolean(img?.getAttribute("src")?.startsWith("/food/")),
  }
})
check("popup shows the pin's own picture", popup?.hasImg === true && popup?.isFood === true, JSON.stringify(popup))
check("popup still shows the place name", /\S/.test(popup?.text ?? ""), popup?.text)
check("focus chip appears", (await page.getByRole("button", { name: /reset peta/ }).count()) > 0)

/* Focus must be applied to the EXISTING element, not by rebuilding the marker. */
const focusedClass = await page.evaluate(() =>
  document.querySelectorAll(".bpndiary-pin-photo.is-focused, .bpndiary-pin.is-focused").length
)
check("focused pin is highlighted", focusedClass === 1, String(focusedClass))

console.log("\nplace list shows the same picture")
const listPhotos = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("li")]
  const matte = cards.filter((c) => c.querySelector(".sticker-mat img, img"))
  return { cards: cards.length, withImg: matte.length }
})
check("place cards render a thumbnail", listPhotos.withImg > 0, JSON.stringify(listPhotos))

/* ---- A brand-new capture must reach the map: the area picker supplies the coordinates. ---- */
console.log("\narchive a new capture and confirm it lands on the map")
const fixture = await page.evaluate(async () => {
  const c = document.createElement("canvas")
  c.width = 260
  c.height = 260
  const ctx = c.getContext("2d")
  ctx.fillStyle = "#ece6da"
  ctx.fillRect(0, 0, 260, 260)
  ctx.beginPath()
  ctx.arc(130, 130, 74, 0, Math.PI * 2)
  ctx.fillStyle = "#2f7d4f"
  ctx.fill()
  return c.toDataURL("image/png")
})
writeFileSync(TMP, Buffer.from(fixture.split(",")[1], "base64"))

const pinsBefore = await page.locator(".bpndiary-pin-photo, .bpndiary-pin").count()

await page.getByRole("button", { name: /What.s on the table/i }).click()
const dlg = page.getByRole("dialog")
await dlg.waitFor()
await page.locator("input[type=file][capture]").setInputFiles(TMP)
await dlg.getByRole("button", { name: "Lanjut" }).click()
await page.locator("#table-place").fill("Warung Peta Uji")
await page.locator("#table-title").fill("Meja Peta Uji")
/* The area picker is what supplies coords — pick one. */
await page.locator("#table-area").click()
await page.getByRole("option", { name: "Sepinggan", exact: true }).click()
await dlg.locator('input[placeholder*="Nama makanan"]').first().fill("Ikan Uji Peta")
await dlg.getByRole("button", { name: /^Simpan$/ }).click()
await dlg.waitFor({ state: "detached", timeout: 15000 })

/* Re-read from storage: proof the coords were derived, not defaulted. */
const stored = await page.evaluate(() => {
  const parsed = JSON.parse(window.localStorage.getItem("bpndiary.moments.v1"))
  const m = parsed.moments.find((x) => x.place === "Warung Peta Uji")
  return m ? { hasCoords: Array.isArray(m.coords), coords: m.coords, area: m.area, photo: String(m.photo || "").slice(0, 22) } : null
})
check("new capture stored", Boolean(stored))
check("area picker supplied coordinates", stored?.hasCoords === true, JSON.stringify(stored?.coords))
check("coordinates match the chosen area", JSON.stringify(stored?.coords) === JSON.stringify([-1.2431, 116.9201]), JSON.stringify(stored?.coords))
check("capture kept its matted photo", stored?.photo?.startsWith("data:image/png") === true, stored?.photo)

await page.locator(".leaflet-container").waitFor()
await page.waitForTimeout(1500)
const pinsAfter = await page.locator(".bpndiary-pin-photo, .bpndiary-pin").count()
check("a new pin appeared on the map", pinsAfter > pinsBefore, `${pinsBefore} → ${pinsAfter}`)

const newPinLoaded = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll(".bpndiary-pin-photo img")]
  return imgs.filter((i) => i.getAttribute("src")?.startsWith("data:image/png")).length
})
check("the new data-URL photo renders as a pin", newPinLoaded > 0, String(newPinLoaded))

check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" / "))

await browser.close()
console.log(failures === 0 ? "\nAll map-pin checks passed." : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
