"use strict";

const menu = document.querySelector(".project-menu");
const links = [...menu.querySelectorAll("a")];
const moreWork = menu.querySelector("details");
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
  if (index === activeIndex) return;
  activeIndex = index;
  if (moreWork.contains(links[index])) moreWork.open = true;

  for (const [i, link] of links.entries()) {
    const selected = i === index;
    panels[i].hidden = !selected;
    panels[i].classList.toggle("reveal-text", selected);
    if (selected) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }

  if (updateUrl) history.pushState(null, "", links[index].hash);
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
  const visibleLinks = links.filter(link => moreWork.open || !moreWork.contains(link));
  const position = visibleLinks.indexOf(links[index]);
  let next;
  switch (event.key) {
    case "ArrowDown": next = (position + 1) % visibleLinks.length; break;
    case "ArrowUp": next = (position - 1 + visibleLinks.length) % visibleLinks.length; break;
    case "Home": next = 0; break;
    case "End": next = visibleLinks.length - 1; break;
    default: return;
  }
  event.preventDefault();
  visibleLinks[next].focus();
  selectProject(links.indexOf(visibleLinks[next]), true);
});

window.addEventListener("popstate", syncHash);
window.addEventListener("hashchange", syncHash);
syncHash();

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
const petContext = pet.querySelector("canvas").getContext("2d");
const petStatus = document.querySelector("#pet-status");
let waveTimer;

function drawPet(waving = false) {
  const ink = "#050505";
  const paper = "#ffffff";
  const shade = "#d0d0d0";
  function pixels(x, y, width, height, color = ink) {
    petContext.fillStyle = color;
    petContext.fillRect(x, y, width, height);
  }

  petContext.clearRect(0, 0, 24, 24);
  // Antenna, head and side panels.
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
  pixels(9, 9, 1, 1, paper);
  pixels(10, 10, 1, 1, paper);
  pixels(9, 11, 1, 1, paper);
  pixels(13, 11, 2, 1, paper);

  // Body, feet and the waving arm.
  pixels(8, 16, 8, 5);
  pixels(9, 17, 6, 3, shade);
  pixels(11, 18, 2, 1, paper);
  pixels(7, 21, 4, 1);
  pixels(13, 21, 4, 1);
  pixels(6, 17, 2, 3);
  if (waving) {
    pixels(16, 17, 4, 1);
    pixels(19, 14, 1, 3);
    pixels(20, 13, 2, 2);
  } else {
    pixels(16, 17, 2, 3);
  }
}

if (petContext) {
  drawPet();
  pet.hidden = false;
  pet.addEventListener("click", () => {
    clearTimeout(waveTimer);
    drawPet(true);
    pet.classList.add("waving");
    petStatus.textContent = "The pixel robot waved.";
    waveTimer = setTimeout(() => {
      drawPet();
      pet.classList.remove("waving");
      petStatus.textContent = "";
    }, 700);
  });
}
