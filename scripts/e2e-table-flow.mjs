/**
 * End-to-end check of the "What's on the table?" flow in a real browser.
 *
 * Uses the Playwright already installed in a sibling project (this repo has no test runner).
 * Generates a synthetic "table photo", feeds it to the camera input the way a phone would,
 * then walks capture → matte → name → save and asserts the archive actually changed.
 *
 *   node scripts/e2e-table-flow.mjs
 */
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"

const require = createRequire(import.meta.url)
const { chromium } = require("D:/6. Codingan/wedding-planner/node_modules/playwright")

const BASE = "http://localhost:5180/"
const TMP = "scripts/.fixture-table.png"

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
/* Reset to the seed so the run is deterministic — the assertions below count absolutely, and a
 * previous run's saved moments would otherwise leak into this one. */
await page.evaluate(() => window.localStorage.removeItem("bpndiary.moments.v1"))
await page.reload({ waitUntil: "networkidle" })

/* ---- Fixture: a photo of "food on a light table", built in-page so no binary is committed. */
const fixture = await page.evaluate(async () => {
  const c = document.createElement("canvas")
  c.width = 300
  c.height = 300
  const ctx = c.getContext("2d")
  ctx.fillStyle = "#e8e2d6" /* pale tablecloth */
  ctx.fillRect(0, 0, 300, 300)
  ctx.beginPath()
  ctx.arc(150, 150, 88, 0, Math.PI * 2)
  ctx.fillStyle = "#b8461f" /* the dish */
  ctx.fill()
  return c.toDataURL("image/png")
})
writeFileSync(TMP, Buffer.from(fixture.split(",")[1], "base64"))

console.log("open the modal from the rail")
await page.getByRole("button", { name: /What.s on the table/i }).click()
await page.getByRole("dialog").waitFor()
const dlg = page.getByRole("dialog")
check("dialog is titled", (await dlg.getByRole("heading").textContent()).includes("What"))

console.log("\nstep 2 & 3 are locked until a photo exists")
const stepBtns = dlg.locator("ol button")
check("step 2 disabled", await stepBtns.nth(1).isDisabled())
check("step 3 disabled", await stepBtns.nth(2).isDisabled())

console.log("\ncapture: feed the file input like a phone camera would")
await page.locator("input[type=file][capture]").setInputFiles(TMP)
await page.getByRole("button", { name: /Buka Kamera/ }).waitFor({ state: "detached", timeout: 15000 })

check("advanced to the table stage", (await stepBtns.nth(1).getAttribute("aria-current")) === "step")
check("a matte PNG is staged", await dlg.locator('img[src^="data:image/png"]').first().isVisible())
check("badge reads Stiker", (await dlg.textContent()).includes("Stiker"))

/* The matted sticker must actually be transparent, not merely look it. */
const alpha = await page.evaluate(async () => {
  const img = document.querySelector('[role=dialog] img[src^="data:image/png"]')
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext("2d").drawImage(img, 0, 0)
  const px = c.getContext("2d").getImageData(0, 0, c.width, c.height).data
  const mid = Math.floor(c.height / 2) * c.width + Math.floor(c.width / 2)
  return { corner: px[3], centre: px[mid * 4 + 3], w: c.width }
})
check("sticker corner is transparent", alpha.corner === 0, `alpha=${alpha.corner}`)
check("sticker subject is opaque", alpha.centre === 255, `alpha=${alpha.centre}`)

console.log("\ncompare toggle: original vs matte")
await page.getByRole("button", { name: /Lihat asli/ }).click()
check("shows the original when toggled", (await dlg.textContent()).includes("Asli"))
await page.getByRole("button", { name: /Lihat hasil/ }).click()

console.log("\nstep 3: name the dishes, rate, price, tags, thoughts")
await page.getByRole("button", { name: "Lanjut" }).click()
await page.locator("#table-place").fill("Warung Uji Coba")
/* Daerah is now a Select (it supplies the map coordinates), not a free-text input. */
await page.locator("#table-area").click()
await page.getByRole("option", { name: "Klandasan", exact: true }).click()
await page.locator("#table-title").fill("Meja Uji Otomatis")

const rows = dlg.locator("li").filter({ has: page.locator('input[placeholder*="Nama makanan"]') })
check("starts with one dish row", (await rows.count()) === 1)

await rows.first().locator('input[placeholder*="Nama makanan"]').fill("Kepiting Uji")
await rows.first().getByRole("button", { name: /Beri 4 bintang/ }).click()
await rows.first().locator('input[type=number]').fill("45000")
const tagInput = rows.first().locator('input[placeholder*="Tag"]')
await tagInput.fill("seafood")
await tagInput.press("Enter")
await rows.first().locator("textarea").fill("Pedasnya pas, dagingnya padat.")
check("tag chip committed", (await rows.first().textContent()).includes("#seafood"))

console.log("\nadd a second dish and remove it again (the 'remove this food' button)")
await page.getByRole("button", { name: /Tambah makanan lagi/ }).click()
check("second row added", (await rows.count()) === 2)
await rows.nth(1).getByRole("button", { name: /Remove this food/ }).click()
check("row removed", (await rows.count()) === 1)

console.log("\npick a category on the dish row")
await rows
  .first()
  .getByRole("button", { name: /^Drinks$/ })
  .click()
check(
  "category chip is pressed",
  (await rows.first().getByRole("button", { name: /^Drinks$/ }).getAttribute("aria-pressed")) === "true"
)
/* Put it back to Food so the derived category is predictable. */
await rows
  .first()
  .getByRole("button", { name: /^Food$/ })
  .click()

console.log("\nsave")
const before = await page.locator('[role=tabpanel] h3').count()
await page.getByRole("button", { name: /^Simpan$/ }).click()
await dlg.waitFor({ state: "detached", timeout: 10000 })

const after = await page.locator('[role=tabpanel] h3').count()
check("a new moment appeared", after === before + 1, `${before} → ${after}`)

const card = page.locator('[role=tabpanel] [data-slot=card]').filter({ hasText: "Meja Uji Otomatis" })
check("card shows the new title", (await card.count()) > 0)
const cardText = await card.first().innerText()
check("card shows the dish breakdown", cardText.includes("Kepiting Uji"), cardText.replace(/\n/g, " | ").slice(0, 120))
check("card shows the dish count badge", cardText.includes("1 makanan"))
check("card shows the derived price", cardText.includes("45.000"))
check("card shows the derived rating", cardText.includes("4,0"))

/* The area picker must have supplied coordinates, or the capture can never reach the map. */
const coords = await page.evaluate(() => {
  const parsed = JSON.parse(window.localStorage.getItem("bpndiary.moments.v1"))
  const m = parsed.moments.find((x) => x.place === "Warung Uji Coba")
  return m ? { coords: m.coords, area: m.area } : null
})
check(
  "area picker attached map coordinates",
  JSON.stringify(coords?.coords) === JSON.stringify([-1.2744, 116.843]),
  JSON.stringify(coords)
)

console.log("\npersistence across reload")
await page.reload({ waitUntil: "networkidle" })
const afterReload = await page
  .locator('[role=tabpanel] [data-slot=card]')
  .filter({ hasText: "Meja Uji Otomatis" })
  .count()
check("moment survives a reload", afterReload > 0)

console.log("\nvalidation: a missing place is refused, and the flow stays open")
await page.getByRole("button", { name: /What.s on the table/i }).click()
await page.getByRole("dialog").waitFor()
await page.locator("input[type=file][capture]").setInputFiles(TMP)
await dlg.getByRole("button", { name: "Lanjut" }).click()
await page.locator("#table-place").fill("")
await dlg.getByRole("button", { name: /^Simpan$/ }).click()
check("error is announced", await page.getByRole("alert").isVisible())
check("dialog stays open", await dlg.isVisible())
await page.locator("#table-place").fill("Diisi belakangan")
await dlg.getByRole("button", { name: /^Simpan$/ }).click()
await dlg.waitFor({ state: "detached", timeout: 10000 })
check("saves once the place is filled", (await dlg.count()) === 0)

/* A dish the user left nameless is dropped, so a table saved with no named dish legitimately
 * persists with `foods: []` — it is still a moment (it has a photo and a place), it just has no
 * per-dish breakdown. Assert both halves of that. */
const blank = await page.evaluate(() => {
  const parsed = JSON.parse(window.localStorage.getItem("bpndiary.moments.v1"))
  const withFoods = parsed.moments.filter((m) => Array.isArray(m.foods) && m.foods.length)
  const nameless = parsed.moments.find((m) => m.place === "Diisi belakangan")
  return {
    tables: withFoods.length,
    blankRows: withFoods.flatMap((m) => m.foods).filter((f) => !f.name.trim()).length,
    hasDerived: withFoods.every((m) => typeof m.price === "number" && typeof m.rating === "number"),
    namelessKept: Boolean(nameless),
    namelessFoods: nameless ? nameless.foods.length : -1,
    namelessHasPhoto: nameless ? String(nameless.photo || "").startsWith("data:image/png") : false,
  }
})
check("the table with a named dish stored its breakdown", blank.tables === 1, String(blank.tables))
check("no blank dish rows stored", blank.blankRows === 0, String(blank.blankRows))
check("derived fields are numeric", blank.hasDerived)
check("a nameless table is still saved as a moment", blank.namelessKept)
check("…with an empty breakdown, not a blank row", blank.namelessFoods === 0, String(blank.namelessFoods))
check("…and keeps its photo", blank.namelessHasPhoto)

check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" / "))

await browser.close()
console.log(failures === 0 ? "\nAll e2e checks passed." : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
