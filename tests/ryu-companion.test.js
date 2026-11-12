import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const code = readFileSync(new URL("../ryu-companion.js", import.meta.url), "utf8");

function mount(t, { count = 0, dismissed = false } = {}) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  function element(hidden = false) {
    const node = new EventTarget();
    const classes = new Set();
    return Object.assign(node, {
      hidden, open: false, textContent: "",
      classList: { contains: key => classes.has(key), add: key => classes.add(key),
        remove: key => classes.delete(key), toggle: (key, value) => value ? classes.add(key) : classes.delete(key) },
      focus() {}, getClientRects: () => [],
    });
  }
  const hero = element(), contact = element(), panel = element(), companion = element(true);
  const bubble = element(true), overlay = element(true), restore = element(true), dismiss = element();
  bubble.textContent = "Click to chat with Ryu";
  const entries = {
    ".pixel-pet": hero, "#footer-ryu": contact, "#robot-console": panel, "#ryu-companion": companion,
    "#walker-chat": bubble, "#walker-toggle": dismiss, "#walker-restore": restore, "#ryu-visibility-debug": overlay,
    "#ryu-hint-announcement": element(), "#nav-ryu": element(), "#theme-toggle": element(),
  };
  function storage(initial) {
    const values = new Map(Object.entries(initial));
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  }
  const window = Object.assign(element(), {
    IntersectionObserver: true,
    localStorage: storage({ "ryu-hidden": String(dismissed) }),
    sessionStorage: storage({ "ryu-bubble-count": String(count) }),
  });
  const document = Object.assign(element(), {
    querySelector: selector => entries[selector], documentElement: element(), body: element(),
  });
  let intersections, mutations;
  runInNewContext(code, {
    window, document, location: { search: "?debug=1" }, URLSearchParams,
    navigator: { userAgent: "iPhone", platform: "iPhone" }, Date, setTimeout, clearTimeout,
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    IntersectionObserver: class {
      constructor(fn, options) { assert.equal(options.threshold, .25); intersections = fn; }
      observe(target) { assert.ok(target === hero || target === contact); }
    },
    MutationObserver: class { constructor(fn) { mutations = fn; } observe() {} },
  });
  return {
    companion, bubble, overlay, panel, hero, contact, window, restore,
    intersect: (target, ratio) => intersections([{ target, isIntersecting: ratio > 0, intersectionRatio: ratio }]),
    syncChat: () => mutations(),
    scroll: () => window.dispatchEvent(new Event("scroll")),
    tick: ms => t.mock.timers.tick(ms),
  };
}

test("Ryu hides for actual sprite intersections and chat, including its minimized pill", t => {
  const ui = mount(t);
  ui.intersect(ui.hero, .5);
  assert.equal(ui.companion.hidden, true);
  assert.match(ui.overlay.textContent, /hero-in-view/);
  ui.intersect(ui.hero, .1);
  assert.equal(ui.companion.hidden, false);
  ui.intersect(ui.contact, .25);
  assert.equal(ui.companion.hidden, true);
  ui.intersect(ui.contact, 0);
  assert.equal(ui.companion.hidden, false);
  ui.panel.open = true;
  ui.syncChat();
  assert.equal(ui.companion.hidden, true);
  assert.match(ui.overlay.textContent, /chat-open/);
  ui.panel.classList.add("is-collapsed");
  ui.syncChat();
  assert.match(ui.overlay.textContent, /minimized-pill/);
  ui.panel.open = false;
  ui.syncChat();
  assert.equal(ui.companion.hidden, false);
});

test("first idle hint waits five seconds and scroll hints respect the two-per-session cap", t => {
  const ui = mount(t);
  ui.tick(4999);
  assert.equal(ui.bubble.hidden, true);
  ui.tick(1);
  assert.equal(ui.bubble.hidden, false);
  ui.scroll();
  assert.equal(ui.bubble.hidden, true);
  ui.tick(1499);
  assert.equal(ui.bubble.hidden, true);
  ui.tick(1);
  assert.equal(ui.bubble.hidden, false);
  assert.equal(ui.window.sessionStorage.getItem("ryu-bubble-count"), "2");
  ui.scroll();
  ui.tick(2000);
  assert.equal(ui.bubble.hidden, true);
  assert.match(ui.overlay.textContent, /Last scroll stop: 1970-/);
});

test("footer restores a dismissed companion without resetting the stored hint count", t => {
  const ui = mount(t, { count: 2, dismissed: true });
  assert.equal(ui.companion.hidden, true);
  assert.equal(ui.restore.hidden, false);
  assert.match(ui.overlay.textContent, /user-hidden/);
  ui.restore.dispatchEvent(new Event("click"));
  assert.equal(ui.companion.hidden, false);
  assert.equal(ui.window.localStorage.getItem("ryu-hidden"), "false");
  ui.scroll();
  ui.tick(2000);
  assert.equal(ui.bubble.hidden, true);
  assert.match(ui.overlay.textContent, /2\/2 shown/);
});
