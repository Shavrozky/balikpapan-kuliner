import assert from "node:assert/strict";
import { createRequire } from "node:module";

/* Playwright lives in a sibling project (this repo has no test runner of its own), so it is
 * resolved by absolute path. A bare "playwright" import would not resolve here. */
const require = createRequire(import.meta.url);
const { chromium } = require("D:/6. Codingan/wedding-planner/node_modules/playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto("http://localhost:5180/", { waitUntil: "networkidle" });
  await page.evaluate(() =>
    window.localStorage.removeItem("bpndiary.moments.v1"),
  );
  await page.reload({ waitUntil: "networkidle" });

  const before = await page.locator("[role=tabpanel] h3").count();

  await page
    .getByRole("button", { name: "Tambah Kuliner", exact: true })
    .click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor();

  // Input dasar
  await page.locator("#moment-title").fill("Uji Modal Biasa");
  await page.locator("#moment-place").fill("Tempat Uji");
  await page.locator("#moment-price").fill("20000");

  // Test Rating
  const starBtn = dlg.getByRole("button", { name: /Beri 3 bintang/ });
  await starBtn.click();
  assert.equal(
    await starBtn.getAttribute("aria-pressed"),
    "true",
    "Star should be active",
  );

  await starBtn.click();
  assert.equal(
    await starBtn.getAttribute("aria-pressed"),
    "false",
    "Star should be cleared",
  );
  await starBtn.click();

  // Test Tags
  const tagInput = dlg.locator('input[placeholder*="Ketik lalu Enter"]');
  await tagInput.fill("pedas");
  await tagInput.press("Enter");
  assert.ok(
    (await dlg.textContent()).includes("#pedas"),
    "Tag #pedas should exist",
  );

  await tagInput.fill("PEDAS");
  await tagInput.press("Enter");
  const chipCount = await dlg
    .locator("li button[aria-label^='Hapus tag']")
    .count();
  assert.equal(chipCount, 1, "Duplicate tag should be rejected");

  await dlg.locator("li button[aria-label='Hapus tag pedas']").click();
  assert.ok(
    !(await dlg.textContent()).includes("#pedas"),
    "Tag #pedas should be removed",
  );

  await tagInput.fill("pedas");
  await tagInput.press("Enter");

  // Submit Form
  await dlg.locator("#moment-note").fill("catatan uji");
  await dlg.getByRole("button", { name: /Simpan Momen/ }).click();
  await dlg.waitFor({ state: "detached", timeout: 10000 });

  // Assertions
  const after = await page.locator("[role=tabpanel] h3").count();
  assert.equal(after, before + 1, "Moment should be saved");

  const cardText = await page
    .locator("[role=tabpanel] [data-slot=card]")
    .filter({ hasText: "Uji Modal Biasa" })
    .first()
    .innerText();
  assert.ok(cardText.includes("3,0"), "Card should show rating 3,0");
  assert.ok(cardText.includes("20.000"), "Card should show price 20.000");

  console.log("All moment-flow checks passed.");
} catch (err) {
  console.error("Test failed:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
