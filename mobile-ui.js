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
  const update = () => {
    const root = document.documentElement;
    root.style.setProperty("--visual-height", `${viewport.height}px`);
    root.style.setProperty("--keyboard-inset", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
  };
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  update();
}
