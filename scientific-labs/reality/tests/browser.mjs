import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL || "chrome",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173/", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "A little wonder. A lot to discover." })
    .waitFor();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('input[aria-label="Simulation time"]').value,
      ) > 0.1,
  );
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const earth = Number(
    await page
      .locator(".metrics strong")
      .first()
      .innerText()
      .then((t) => t.replace("s", "").trim()),
  );
  await page.getByRole("button", { name: "◐ Moon", exact: true }).click();
  await page.waitForFunction(
    () => parseFloat(document.querySelector(".metrics strong").textContent) > 5,
  );
  const moon = Number(
    await page
      .locator(".metrics strong")
      .first()
      .innerText()
      .then((t) => t.replace("s", "").trim()),
  );
  assert(moon > earth * 2);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: /A bouncing ball/ }).click();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('input[aria-label="Simulation time"]').value,
      ) > 0.15,
  );
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await page.getByRole("button", { name: /A flight through space/ }).click();
  await page.getByRole("button", { name: /The pendulum/ }).click();
  await page
    .getByLabel("Investigation title", { exact: true })
    .fill("A measured question");
  await page
    .getByLabel("I predict…", { exact: true })
    .fill("A longer pendulum has a longer period.");
  await page
    .getByRole("button", { name: "Save investigation", exact: true })
    .click();
  await page.getByRole("button", { name: /My notebook/ }).click();
  await page.getByRole("heading", { name: "A measured question" }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /My notebook/ }).click();
  await page.getByRole("heading", { name: "A measured question" }).waitFor();
  await page
    .getByRole("button", { name: "Open investigation", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export motion CSV" }).click();
  assert((await download).suggestedFilename().endsWith(".csv"));
  await page.getByRole("button", { name: "Field guide", exact: true }).click();
  await page
    .getByRole("heading", { name: "Give your pixels a scale." })
    .waitFor();
  await page
    .getByRole("button", { name: "Experiment lab", exact: true })
    .click();
  await mkdir("qa", { recursive: true });
  await page.screenshot({ path: "qa/reality-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Video analysis", exact: true })
    .click();
  await page.screenshot({ path: "qa/reality-video.png", fullPage: true });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("button", { name: "Experiment lab", exact: true })
      .click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Overflow at ${width}px`,
    );
    await page.screenshot({ path: `qa/reality-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  assert(
    !(await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .count()),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "playback",
        "Earth/Moon period",
        "Rapier bounce",
        "projectile",
        "notebook persistence",
        "CSV export",
        "guide",
        "video entry",
        "desktop/tablet/mobile no overflow",
        "reduced-motion starts paused",
      ],
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
