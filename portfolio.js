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

export function openProject(id) {
  const index = links.findIndex(link => link.hash === `#${id}`);
  if (index < 0) throw new Error("Unknown project");
  selectProject(index, true);
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
  replayStatus.textContent = "Recovery produced one incident from five unique events.";
  replayButton.disabled = false;
}

async function playReplay(report) {
  if (reducedMotion.matches) {
    showReplayResult();
    return;
  }
  replayButton.disabled = true;
  for (const event of replayEvents) event.classList.remove("arrived");
  replayStatus.textContent = "Waiting for events.";
  report?.("receive(5 events)", replayStatus.textContent);
  for (const event of replayEvents) {
    await delay(500);
    if (reducedMotion.matches) {
      showReplayResult();
      return;
    }
    event.classList.add("arrived");
  }

  replayStatus.textContent = "Consumer stopped after event 5 was stored. Committed offset: 4.";
  report?.("crash(offset 4)", replayStatus.textContent);
  await delay(850);
  showReplayResult();
}

replayButton.hidden = false;
let activeReplay;
export function replayCrash(report) {
  if (activeReplay) return activeReplay;
  activeReplay = playReplay(report).finally(() => { activeReplay = null; });
  return activeReplay;
}
replayButton.addEventListener("click", () => replayCrash());

const pet = document.querySelector(".pixel-pet");
export function paintAgent(state) {
  pet.dataset.state = state;
}
