const companion = document.querySelector("#ryu-companion");
const body = document.querySelector("#walker-ryu");
const bubble = document.querySelector("#walker-chat");
const toggle = document.querySelector("#walker-toggle");
const panel = document.querySelector("#robot-console");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const touch = matchMedia("(pointer: coarse), (max-width: 899px)");
let hidden = false;
let shown = 0;
try {
  hidden = localStorage.getItem("ryu-hidden") === "true";
  shown = Number(sessionStorage.getItem("ryu-bubble-count")) || 0;
} catch { /* Storage can be unavailable. */ }

let width = innerWidth, height = innerHeight;
let x = 12, goal = x, frame = 0, bubbleTimer, scrollTimer;
let scrolling = false, lastY = scrollY;

function visible() {
  return !hidden && !panel.open && !document.hidden;
}

function position() {
  companion.style.transform = `translateX(${x.toFixed(2)}px)`;
  companion.style.setProperty("--walker-x", `${x.toFixed(2)}px`);
}

function animate() {
  frame = 0;
  if (!visible() || reduced.matches || touch.matches) return;
  const delta = goal - x;
  const moving = Math.abs(delta) > 1;
  if (moving) {
    x += delta * 0.14;
    position();
    body.style.setProperty("--face", delta < 0 ? "-1" : "1");
    frame = requestAnimationFrame(animate);
  }
  body.classList.toggle("walking", moving || scrolling);
}

function resetBubble() {
  bubble.hidden = true;
  clearTimeout(bubbleTimer);
  if (!visible() || shown >= (reduced.matches ? 1 : 3)) return;
  bubbleTimer = setTimeout(() => {
    if (!visible() || scrolling || frame) return;
    bubble.hidden = false;
    shown++;
    try { sessionStorage.setItem("ryu-bubble-count", String(shown)); } catch { /* Optional. */ }
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 3800);
  }, 1500);
}

function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  body.classList.remove("walking");
  companion.hidden = !visible();
  toggle.hidden = panel.open || document.hidden;
  toggle.textContent = hidden ? "Show Ryu" : "Hide Ryu";
  document.body.classList.toggle("has-ryu-companion", visible());
  if (touch.matches || reduced.matches) {
    companion.style.removeProperty("transform");
    body.style.setProperty("--face", "1");
    body.style.setProperty("--pupil-x", "0px");
    body.style.setProperty("--pupil-y", "0px");
  } else {
    x = Math.min(Math.max(12, x), Math.max(12, width - 164));
    position();
  }
  resetBubble();
}

function look(event) {
  if (reduced.matches) return;
  const center = touch.matches ? width - 44 : x + 32;
  body.style.setProperty("--pupil-x", `${Math.max(-2, Math.min(2, (event.clientX - center) / 45))}px`);
  body.style.setProperty("--pupil-y", `${Math.max(-2, Math.min(2, (event.clientY - height + 44) / 45))}px`);
}

window.addEventListener("pointermove", event => {
  if (!visible() || touch.matches || event.pointerType !== "mouse") return;
  if (event.target.closest?.("#ryu-companion, #walker-toggle")) return;
  look(event);
  if (!reduced.matches) {
    goal = Math.min(Math.max(12, event.clientX - 32), Math.max(12, width - 164));
    if (!frame && Math.abs(goal - x) > 1) frame = requestAnimationFrame(animate);
  }
  resetBubble();
}, { passive: true });
window.addEventListener("pointerdown", event => {
  if (visible() && touch.matches && !event.target.closest?.("#ryu-companion, #walker-toggle")) {
    look(event);
    resetBubble();
  }
}, { passive: true });
window.addEventListener("scroll", () => {
  const y = scrollY;
  const direction = Math.sign(y - lastY);
  lastY = y;
  if (!visible()) return;
  scrolling = true;
  if (!reduced.matches) {
    if (touch.matches && direction) body.style.setProperty("--face", String(direction));
    body.classList.add("walking");
  }
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    scrolling = false;
    if (!frame) body.classList.remove("walking");
    resetBubble();
  }, 100);
  resetBubble();
}, { passive: true });
window.addEventListener("resize", () => {
  width = innerWidth;
  height = innerHeight;
  sync();
}, { passive: true });
document.addEventListener("visibilitychange", sync);
reduced.addEventListener("change", sync);
touch.addEventListener("change", sync);
new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ["open"] });
toggle.addEventListener("click", () => {
  hidden = !hidden;
  try { localStorage.setItem("ryu-hidden", String(hidden)); } catch { /* Optional. */ }
  sync();
});

const contact = document.querySelector(".contact-sprite");
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => contact.classList.toggle("in-view", entry.isIntersecting))
    .observe(contact);
}
sync();
