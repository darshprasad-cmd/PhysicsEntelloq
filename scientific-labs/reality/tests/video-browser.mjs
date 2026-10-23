import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Start the Vite dev/preview server first. Example:
// VIDEO_TEST_URL=http://127.0.0.1:5173 node tests/video-browser.mjs
const baseUrl = process.env.VIDEO_TEST_URL || "http://127.0.0.1:5173/";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl);
  await page
    .getByRole("button", { name: "Video analysis", exact: true })
    .click();
  await page
    .getByLabel("Choose experiment video")
    .setInputFiles(
      fileURLToPath(
        new URL("../public/fixtures/tracking.webm", import.meta.url),
      ),
    );
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  const canvas = page.locator(".vl-canvas-wrap canvas");
  const box = await canvas.boundingBox();
  assert.ok(box, "A usable video frame should be displayed.");
  const place = (x, y) =>
    canvas.click({
      position: { x: (x / 320) * box.width, y: (y / 240) * box.height },
    });
  await place(20, 200);
  await place(120, 200);
  await place(80, 180);
  await place(80, 100);
  await page.getByRole("button", { name: "Track motion", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".vl-status")?.textContent?.startsWith("Tracked "),
    null,
    { timeout: 60000 },
  );
  const status = await page.locator(".vl-status").textContent();
  assert.match(status, /Tracked 30 positions/);
  assert.equal(await page.locator(".vl-error").count(), 0);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  const rows = csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").map(Number));
  assert.equal(rows.length, 30);
  assert.ok(
    rows.at(-1)[1] > 0.45 && rows.at(-1)[1] < 0.65,
    "Known horizontal displacement should be around 0.55 m.",
  );
  assert.ok(
    rows.every((row) => Math.abs(row[2] - 0.8) < 0.03),
    "Horizontal fixture should keep y around 0.8 m.",
  );
  await page
    .getByRole("button", { name: "Use in comparison", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "A little wonder. A lot to discover." })
    .waitFor({ state: "visible" });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      status,
      positions: rows.length,
      finalX: rows.at(-1)[1],
      comparisonReached: true,
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
