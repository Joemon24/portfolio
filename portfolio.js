"use strict";

const menu = document.querySelector(".project-menu");
const links = [...menu.querySelectorAll("a")];
const panels = links.map(link => document.getElementById(link.hash.slice(1)));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let activeIndex = -1;
for (const panel of panels) {
  const heading = panel.querySelector("h3");
  const title = heading.textContent.trim();
  heading.setAttribute("aria-label", title);
  heading.replaceChildren(...title.split(/(\s+)/).map((part, index) => {
    if (!part.trim()) return document.createTextNode(part);
    const word = document.createElement("span");
    word.className = "project-title-word";
    word.setAttribute("aria-hidden", "true");
    word.style.setProperty("--word-order", index / 2);
    word.textContent = part;
    return word;
  }));
}

function selectProject(index, updateUrl = false) {
  if (updateUrl && location.hash !== links[index].hash) history.pushState(null, "", links[index].hash);
  if (index === activeIndex) return;
  activeIndex = index;

  for (const [i, link] of links.entries()) {
    const selected = i === index;
    panels[i].hidden = !selected;
    if (selected) panels[i].parentElement.scrollTop = 0;
    panels[i].classList.toggle("reveal-text", selected);
    if (selected) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
  document.dispatchEvent(new Event("portfolio:project-change"));
}

function syncHash() {
  const index = links.findIndex(link => link.hash === location.hash);
  if (index >= 0 || !location.hash || activeIndex < 0) selectProject(Math.max(index, 0));
}

menu.addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  selectProject(links.indexOf(link), true);
});

menu.addEventListener("keydown", event => {
  const index = links.indexOf(document.activeElement);
  if (index < 0) return;
  const position = index;
  let next;
  switch (event.key) {
    case "ArrowDown": next = (position + 1) % links.length; break;
    case "ArrowUp": next = (position - 1 + links.length) % links.length; break;
    case "Home": next = 0; break;
    case "End": next = links.length - 1; break;
    default: return;
  }
  event.preventDefault();
  links[next].focus();
  selectProject(next, true);
});

window.addEventListener("popstate", syncHash);
window.addEventListener("hashchange", syncHash);
syncHash();
document.documentElement.classList.add("enhanced");
document.querySelector(".metrics").addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const index = links.findIndex(project => project.hash === link.hash);
  if (index < 0) return;
  event.preventDefault();
  selectProject(index, true);
  document.querySelector("#projects").scrollIntoView();
  links[index].focus({ preventScroll: true });
});

const replayButton = document.querySelector("#replay-button");
const replayEvents = [...document.querySelectorAll("#replay-events li")];
const replayStatus = document.querySelector("#replay-status");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function showReplayResult() {
  for (const event of replayEvents) event.classList.add("arrived");
  replayStatus.textContent = "Recovered: 5 unique events, 1 incident, offset 5 committed.";
  replayButton.disabled = false;
}

async function replayCrash() {
  if (reducedMotion.matches) {
    showReplayResult();
    return;
  }
  replayButton.disabled = true;
  for (const event of replayEvents) event.classList.remove("arrived");
  replayStatus.textContent = "Waiting for events.";
  for (const event of replayEvents) {
    await delay(500);
    if (reducedMotion.matches) {
      showReplayResult();
      return;
    }
    event.classList.add("arrived");
  }

  replayStatus.textContent = "Consumer stopped after event 5 was stored. Committed offset: 4.";
  await delay(850);
  showReplayResult();
}

replayButton.hidden = false;
replayButton.addEventListener("click", replayCrash);

const pet = document.querySelector(".pixel-pet");
const contactPet = document.querySelector(".contact-pet canvas").getContext("2d");
const petContext = pet.querySelector("canvas").getContext("2d");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
let blinking = false;
let gaze = 0;

function drawPet(context, { blinking = false, gaze = 0 } = {}) {
  const ink = "#050505";
  const paper = "#ffffff";
  const shade = "#d0d0d0";
  function pixels(x, y, width, height, color = ink) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  context.clearRect(0, 0, 24, 24);
  pixels(11, 1, 2, 2);
  pixels(12, 3, 1, 2);
  pixels(6, 5, 12, 1);
  pixels(4, 6, 16, 9);
  pixels(3, 8, 1, 5);
  pixels(20, 8, 1, 5);
  pixels(6, 15, 12, 1);
  pixels(6, 6, 12, 9, shade);
  pixels(5, 7, 14, 6, paper);
  pixels(7, 8, 10, 6);
  if (blinking) {
    pixels(9 + gaze, 11, 2, 1, paper);
  } else {
    pixels(9 + gaze, 9, 1, 1, paper);
    pixels(10 + gaze, 10, 1, 1, paper);
    pixels(9 + gaze, 11, 1, 1, paper);
  }
  pixels(13 + gaze, 11, 2, 1, paper);

  pixels(8, 16, 8, 5);
  pixels(9, 17, 6, 3, shade);
  pixels(11, 18, 2, 1, paper);
  pixels(7, 21, 4, 1);
  pixels(13, 21, 4, 1);
  pixels(6, 17, 2, 3);
  pixels(16, 17, 2, 3);
}

if (contactPet) drawPet(contactPet);
if (petContext) {
  const paint = () => drawPet(petContext, { blinking, gaze });
  paint();
  const hero = pet.closest(".identity");
  hero.addEventListener("pointermove", event => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType !== "mouse") return;
    const box = pet.getBoundingClientRect();
    const delta = event.clientX - box.left - box.width / 2;
    const nextGaze = Math.abs(delta) < 12 ? 0 : Math.sign(delta);
    if (nextGaze !== gaze) {
      gaze = nextGaze;
      paint();
    }
  });
  hero.addEventListener("pointerleave", () => {
    gaze = 0;
    paint();
  });

  const blink = setInterval(() => {
    if (reducedMotion.matches || document.hidden || pet.getBoundingClientRect().bottom < 0) return;
    blinking = true;
    paint();
    setTimeout(() => {
      blinking = false;
      paint();
    }, 120);
  }, 4600);
  window.addEventListener("pagehide", event => {
    if (!event.persisted) clearInterval(blink);
  });
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    gaze = 0;
    blinking = false;
    paint();
  });
}
