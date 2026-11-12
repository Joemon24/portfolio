const companion = document.querySelector("#ryu-companion");
const bubble = document.querySelector("#walker-chat");
const dismiss = document.querySelector("#walker-toggle");
const panel = document.querySelector("#robot-console");
const hero = document.querySelector(".pixel-pet");
const inlineSprites = [hero, document.querySelector("#footer-ryu")];
const inView = new Set();
let heroMeasured = !("IntersectionObserver" in window);
let dismissed = false;
let shown = 0;
try {
  dismissed = localStorage.getItem("ryu-hidden") === "true";
  shown = Number(sessionStorage.getItem("ryu-bubble-count")) || 0;
} catch { /* Storage can be unavailable. */ }

let timer;
function hideBubble() {
  clearTimeout(timer);
  bubble.hidden = true;
  companion.classList.remove("has-bubble");
}

function scheduleBubble() {
  hideBubble();
  if (companion.hidden || shown >= 2) return;
  timer = setTimeout(() => {
    if (companion.hidden || panel.open) return;
    bubble.hidden = false;
    companion.classList.add("has-bubble");
    shown++;
    try { sessionStorage.setItem("ryu-bubble-count", String(shown)); } catch { /* Optional. */ }
    timer = setTimeout(hideBubble, 3800);
  }, 1500);
}

function sync() {
  const hide = dismissed || panel.open || document.hidden || !heroMeasured || inView.size > 0;
  if (hide === companion.hidden) return;
  companion.hidden = hide;
  document.body.classList.toggle("has-ryu-companion", !hide);
  scheduleBubble();
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === hero) heroMeasured = true;
      if (entry.isIntersecting) inView.add(entry.target);
      else inView.delete(entry.target);
    }
    sync();
  });
  for (const sprite of inlineSprites) observer.observe(sprite);
}
window.addEventListener("scroll", scheduleBubble, { passive: true });
document.addEventListener("visibilitychange", sync);
new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ["open"] });
dismiss.addEventListener("click", () => {
  dismissed = true;
  try { localStorage.setItem("ryu-hidden", "true"); } catch { /* Optional. */ }
  sync();
  const nav = document.querySelector("#nav-ryu");
  (nav.getClientRects().length ? nav : document.querySelector("#theme-toggle")).focus({ preventScroll: true });
});
sync();
