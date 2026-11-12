// Run with an existing Playwright install. No browser dependency is added to the site.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium, webkit, devices } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.RYU_PREVIEW_URL || "http://127.0.0.1:8765/";
const output = process.env.RYU_SCREENSHOTS || "/tmp/ryu-browser-check";
await mkdir(output, { recursive: true });
let failures = 0;
for (const [engine, options, device, sizes] of [
  [webkit, {}, devices["iPhone 13"], [{ width: 390, height: 844 }]],
  [chromium, process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}, {}, [{ width: 390, height: 844 }, { width: 1440, height: 900 }]],
]) {
  let browser;
  try {
    browser = await engine.launch(options);
    for (const viewport of sizes) {
      for (const theme of ["light", "dark"]) for (const accent of ["lime", "blue"]) {
        const context = await browser.newContext({ ...device, viewport });
        const page = await context.newPage();
        await page.goto(base);
        if (theme === "dark") await page.locator("#theme-toggle").click();
        if (accent !== "lime") await page.evaluate(color => { document.documentElement.dataset.accent = color; }, accent);
        const prefix = `${engine.name()}-${viewport.width}x${viewport.height}-${theme}-${accent}`;
        const shot = name => page.screenshot({ path: join(output, `${prefix}-${name}.png`) });
        assert.equal(await page.locator(".hero-links .social-tile, #mobile-menu .social-tile").count(), 0);
        assert.equal(await page.locator("#contact .social-tile").count(), 3);
        await page.locator(".opening").screenshot({ path: join(output, `${prefix}-hero.png`) });
        await page.locator("#contact").screenshot({ path: join(output, `${prefix}-contact.png`) });
        await page.locator("#projects").evaluate(section => section.scrollIntoView({ block: "start" }));
        await page.locator("#walker-ryu").waitFor();
        await shot("companion-docked");
        await page.locator("#walker-chat").waitFor({ timeout: 5000 });
        await shot("companion-bubble");
        await page.evaluate(() => scrollTo(0, 0));
        const opener = viewport.width < 640 ? "#nav-ryu" : ".pixel-pet";
        await page.locator(opener).click();
        const input = page.locator("#robot-input");
        await input.pressSequentially("How does ");
        if (viewport.width < 640) {
          // This exercises a viewport change while typing; it is not an iOS keyboard.
          await page.setViewportSize({ ...viewport, height: 520 });
          assert.equal(await input.inputValue(), "How does ");
          assert.equal(await input.evaluate(element => document.activeElement === element), true);
          await shot("short-viewport");
          await page.setViewportSize(viewport);
        }
        await input.pressSequentially("Logly recover?");
        assert.equal(await input.inputValue(), "How does Logly recover?");
        assert.equal(await input.evaluate(element => document.activeElement === element), true);
        await shot("open");
        await input.press("Enter");
        await page.locator("#agent-answer p").waitFor();
        assert.match(await page.locator("#agent-answer").innerText(), /incident replay/);
        assert.equal(await page.locator("#logly").isVisible(), true);
        assert.equal(await page.locator("#console-body").isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await shot("answer");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#robot-console").isVisible(), false);
        await shot("closed");
        await context.close();
      }
    }
  } catch (error) {
    failures++;
    console.error(engine.name(), error.message.split("\n")[0]);
  } finally {
    await browser?.close();
  }
}
process.exitCode = failures ? 1 : 0;
