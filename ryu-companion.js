const companion = document.querySelector("#ryu-companion");
const bubble = document.querySelector("#walker-chat");
const dismiss = document.querySelector("#walker-toggle");
const restore = document.querySelector("#walker-restore");
const panel = document.querySelector("#robot-console");
const overlay = document.querySelector("#ryu-visibility-debug");
const announcement = document.querySelector("#ryu-hint-announcement");
const hero = document.querySelector(".pixel-pet");
const contact = document.querySelector("#footer-ryu");
const debug = new URLSearchParams(location.search).get("debug") === "1";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const hideKey = "ryu-hidden";
const hintKey = "ryu-bubble-count";
const storageReads = {};
const inView = new Set();
const enteredAt = Date.now();

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
document.documentElement.classList.toggle("ryu-ios", isIOS);

function readStorage(kind, key) {
  try {
    const value = window[kind].getItem(key);
    storageReads[key] = value ?? "(unset)";
    return value;
  } catch {
    storageReads[key] = "(unavailable)";
    return null;
  }
}
function writeStorage(kind, key, value) {
  try { window[kind].setItem(key, String(value)); } catch { /* Optional. */ }
}

let dismissed = readStorage("localStorage", hideKey) === "true";
let shown = Math.max(0, Number(readStorage("sessionStorage", hintKey)) || 0);
let hasScrolled = false;
let scrolling = false;
let lastStop = null;
let scrollTimer;
let hintTimer;
let expireTimer;

function hiddenReasons() {
  const reasons = [];
  if (inView.has(hero)) reasons.push("hero-in-view");
  if (inView.has(contact)) reasons.push("contact-in-view");
  if (panel.open) reasons.push(panel.classList.contains("is-collapsed") ? "minimized-pill" : "chat-open");
  if (dismissed) reasons.push("user-hidden");
  return reasons;
}

function report() {
  if (!debug) return;
  overlay.hidden = false;
  overlay.textContent = [
    `Companion: ${companion.hidden ? "hidden" : "visible"} (${hiddenReasons().join(", ") || "clear"})`,
    `Reduced motion: ${reduced.matches ? "on (blink disabled)" : "off"}`,
    `Hint: ${bubble.hidden ? "hidden" : "visible"} · ${shown}/2 shown`,
    `Last scroll stop: ${scrolling ? "scrolling" : lastStop === null ? "none" : new Date(lastStop).toISOString()}`,
    `Storage read: localStorage[${hideKey}]=${storageReads[hideKey]}`,
    `Storage read: sessionStorage[${hintKey}]=${storageReads[hintKey]}`,
  ].join("\n");
}

function hideBubble() {
  clearTimeout(hintTimer);
  clearTimeout(expireTimer);
  bubble.hidden = true;
  announcement.textContent = "";
  companion.classList.remove("has-bubble");
}

function showBubble() {
  if (companion.hidden || panel.open || document.hidden || scrolling || shown >= 2 || !bubble.hidden) return;
  bubble.hidden = false;
  announcement.textContent = bubble.textContent.trim();
  companion.classList.add("has-bubble");
  shown++;
  writeStorage("sessionStorage", hintKey, shown);
  expireTimer = setTimeout(() => { hideBubble(); report(); }, 3800);
  report();
}

function scheduleIdle() {
  clearTimeout(hintTimer);
  if (companion.hidden || document.hidden || hasScrolled || shown !== 0) return;
  hintTimer = setTimeout(showBubble, Math.max(0, enteredAt + 5000 - Date.now()));
}

function sync() {
  const hide = hiddenReasons().length > 0;
  if (hide !== companion.hidden) {
    companion.hidden = hide;
    document.body.classList.toggle("has-ryu-companion", !hide);
    if (hide) hideBubble();
    else scheduleIdle();
  }
  restore.hidden = !dismissed;
  report();
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= .25) inView.add(entry.target);
      else inView.delete(entry.target);
    }
    sync();
  }, { threshold: .25 });
  for (const sprite of [hero, contact]) if (sprite) observer.observe(sprite);
}

window.addEventListener("scroll", () => {
  hasScrolled = scrolling = true;
  hideBubble();
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    scrolling = false;
    lastStop = Date.now();
    showBubble();
    report();
  }, 1500);
  report();
}, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hideBubble();
  else scheduleIdle();
  report();
});
reduced.addEventListener("change", report);
new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ["open", "class"] });

dismiss.addEventListener("click", () => {
  dismissed = true;
  writeStorage("localStorage", hideKey, true);
  sync();
  const nav = document.querySelector("#nav-ryu");
  (nav.getClientRects().length ? nav : document.querySelector("#theme-toggle")).focus({ preventScroll: true });
});
restore.addEventListener("click", () => {
  dismissed = false;
  writeStorage("localStorage", hideKey, false);
  sync();
  contact?.focus({ preventScroll: true });
});
sync();
