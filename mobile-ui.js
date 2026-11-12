const toggle = document.querySelector("#mobile-menu-toggle");
const menu = document.querySelector("#mobile-menu");
toggle.hidden = false;
toggle.addEventListener("click", () => menu.showModal());
menu.addEventListener("click", event => {
  if (event.target.closest("a")) menu.close();
});
matchMedia("(max-width: 640px)").addEventListener("change", event => {
  if (!event.matches && menu.open) menu.close();
});

const viewport = window.visualViewport;
if (viewport) {
  let lastHeight, lastInset;
  const update = () => {
    const root = document.documentElement;
    const height = Math.round(viewport.height);
    const inset = Math.max(0, Math.round(document.documentElement.clientHeight - viewport.height - viewport.offsetTop));
    if (height !== lastHeight) root.style.setProperty("--visual-height", `${height}px`);
    if (inset !== lastInset) root.style.setProperty("--keyboard-inset", `${inset}px`);
    lastHeight = height;
    lastInset = inset;
  };
  viewport.addEventListener("resize", update, { passive: true });
  viewport.addEventListener("scroll", update, { passive: true });
  update();
}
