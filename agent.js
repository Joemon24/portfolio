import { openProject, paintAgent, replayCrash } from "./portfolio.js";
import { runRetrievalSample } from "./portfolio-extras.js";
import { prepareHiringDraft } from "./contact.js";
import { matchIntent, retrievalSample } from "./agent-intents.js";

const root = document.documentElement;
const robot = document.querySelector(".pixel-pet");
const consolePanel = document.querySelector("#robot-console");
const palette = document.querySelector("#command-palette");
const paletteToggle = document.querySelector("#palette-toggle");
const input = document.querySelector("#robot-input");
const trace = document.querySelector("#agent-trace");
const projects = [...document.querySelectorAll(".project-menu a")].map(link => ({
  name: link.textContent.trim(), id: link.hash.slice(1),
}));
for (const entry of document.querySelectorAll(".more-work li[id]")) {
  projects.push({ name: entry.querySelector("a").textContent.trim(), id: entry.id, moreWork: true });
}
const themes = new Set(["light", "dark"]);
const accents = new Set(["lime", "amber", "cyan"]);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let dialog;
let opener;
let destination;
let busy = false;

function appendTrace(text) {
  const line = document.createElement("li");
  line.textContent = text;
  trace.append(line);
  if (trace.children.length > 24) trace.firstElementChild.remove();
  trace.scrollTop = trace.scrollHeight;
}

function speak(panel, text) {
  panel.querySelector("[data-feedback]").textContent = text;
}

function setState(state) {
  paintAgent(state);
  consolePanel.dataset.state = state;
  consolePanel.querySelector(".console-state").textContent = state;
}

function scrollToId(id) {
  const target = document.getElementById(id);
  target.scrollIntoView({ block: "start", behavior: "instant" });
  return target;
}

function selectCase(id, step) {
  const project = projects.find(item => item.id === id);
  if (!project) throw new Error("That project isn’t on this page.");
  step(`select(${project.name})`, `Selecting ${project.name}.`, () => openProject(id));
  return project;
}

function openVisualizer(sample, step) {
  return step("open(visualizer)", "Opening the ARC retrieval visualizer.", () => runRetrievalSample(sample));
}

const actions = {
  async show_best_work(_, step) {
    step("scroll(#projects)", "Opening the project case studies.", () => scrollToId("projects"));
    if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 200));
    selectCase("arc", step);
    if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 200));
    openVisualizer(undefined, step);
    step("scroll(#retrieval-demo)", "Bringing the visualizer into view.", () => scrollToId("retrieval-demo"));
    destination = document.querySelector("#retrieval-demo summary");
    return "ARC is open with its retrieval visualizer.";
  },
  show_project(id, step) {
    const entry = projects.find(project => project.id === id && project.moreWork);
    const project = entry || selectCase(id, step);
    const panel = step(`scroll(#${id})`, `Showing ${project.name}.`, () => scrollToId(id));
    destination = panel.querySelector(entry ? "a" : "h3");
    return `${project.name} is open.`;
  },
  async replay_crash(_, step) {
    selectCase("logly", step);
    step("scroll(#replay-title)", "Opening the Logly crash replay.", () => scrollToId("replay-title"));
    destination = document.querySelector("#replay-button");
    await step("replay(crash)", "Running the recorded crash replay.", () => replayCrash(step));
    return document.querySelector("#replay-status").textContent;
  },
  run_retrieval(query, step) {
    const sample = retrievalSample(query);
    if (sample === null) throw new Error("The ARC demo has two sample queries. Try “tenant access” or “incident escalation”.");
    selectCase("arc", step);
    const label = openVisualizer(sample, step);
    step(`run(sample: ${label})`, "Running the sample query.", () => scrollToId("retrieval-demo"));
    destination = document.querySelector("#retrieval-demo summary");
    return `Ran the ARC sample “${label}” ${document.querySelector("#budget-status").textContent}`;
  },
  open_resume(_, step) {
    const url = document.querySelector(".hero-links a[download]").href;
    step("open(resume PDF)", "Opening the resume PDF.", () => window.open(url, "_blank", "noopener"));
    return "Requested the resume PDF in a new tab.";
  },
  async copy_email(confirmed, step) {
    const email = document.querySelector('#contact a[href^="mailto:"]').getAttribute("href").slice(7);
    if (confirmed !== true) {
      dialog.querySelector("[data-confirm]").hidden = false;
      dialog.querySelector("[data-confirm]").focus();
      step("confirm(copy email)", `Copy ${email} to your clipboard?`);
      return null;
    }
    try {
      await step("clipboard.write(email)", "Copying the email address.", () => navigator.clipboard.writeText(email));
      return "Email address copied.";
    } catch {
      throw new Error(`Clipboard unavailable. Copy this address manually: ${email}`);
    }
  },
  contact_hiring(_, step) {
    destination = step("select(Hiring)", "Preparing a hiring draft.", prepareHiringDraft);
    step("scroll(#contact)", "Opening the contact form.", () => scrollToId("contact"));
    return "Hiring is selected. Your draft is ready to edit.";
  },
  toggle_theme(mode, step) {
    const theme = themes.has(mode) ? mode : root.dataset.theme === "dark" ? "light" : "dark";
    step(`theme(${theme})`, `Applying ${theme} mode.`, () => { root.dataset.theme = theme; });
    return `${theme === "dark" ? "Dark" : "Light"} mode is on.`;
  },
  set_accent(color, step) {
    if (!accents.has(color)) throw new Error("Choose lime, amber, or cyan. Try “set accent to lime”.");
    step(`accent(${color})`, `Applying the ${color} accent.`, () => { root.dataset.accent = color; });
    return `Accent set to ${color}.`;
  },
  show_help() {
    return "Try “best work”, “show Logly”, “break something”, “run retrieval for tenant access”, “resume”, “copy email”, “hire him”, “dark mode”, or “set accent to lime”.";
  },
  go_section(id, step) {
    const section = step(`scroll(#${id})`, "Opening the section.", () => scrollToId(id));
    destination = section.querySelector("h2");
    return `${destination.textContent.trim()} is open.`;
  },
};

async function execute(panel, intent) {
  if (busy) return;
  const confirm = panel.querySelector("[data-confirm]");
  const needsFocus = document.activeElement === confirm;
  confirm.hidden = true;
  if (needsFocus) (panel === consolePanel ? input : palette.querySelector('[data-action="copy_email"]')).focus();
  if (!intent) {
    appendTrace("intent: unknown");
    speak(panel, "I can’t do that yet. Try “show Logly”, “resume”, or choose a suggestion.");
    return;
  }
  busy = true;
  setState("working");
  const steps = [`intent: ${intent.id}`];
  appendTrace(steps[0]);
  function step(label, narration, action) {
    steps.push(label);
    if (dialog === panel) speak(panel, narration);
    appendTrace(label);
    return action?.();
  }
  try {
    const result = await actions[intent.id](intent.arg, step);
    if (result) {
      appendTrace(`${steps.join(" → ")} ok`);
      if (dialog === panel) {
        speak(panel, result);
        if (panel === palette && destination) panel.close();
      }
    }
  } catch (error) {
    appendTrace(`${steps.join(" → ")} stopped`);
    if (dialog === panel) speak(panel, error.message);
  } finally {
    busy = false;
    setState(dialog ? (dialog.querySelector("[data-confirm]").hidden ? "done" : "listening") : "idle");
  }
}

function placeConsole() {
  if (!consolePanel.open) return;
  const anchor = robot.getBoundingClientRect();
  consolePanel.style.maxHeight = "";
  const box = consolePanel.getBoundingClientRect();
  const below = innerHeight - anchor.bottom - 16;
  const above = anchor.top - 16;
  const visible = anchor.bottom > 0 && anchor.top < innerHeight && Math.max(above, below) >= 220;
  const left = visible ? anchor.right - box.width : (innerWidth - box.width) / 2;
  const useBelow = below >= box.height || below >= above;
  const available = useBelow ? below : above;
  if (visible) consolePanel.style.maxHeight = `${available}px`;
  consolePanel.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, left))}px`;
  consolePanel.style.top = !visible ? "8px" : useBelow ? `${anchor.bottom + 8}px` : "auto";
  consolePanel.style.bottom = visible && !useBelow ? `${innerHeight - anchor.top + 8}px` : "auto";
}

function openPanel(panel, trigger) {
  if (dialog || busy) return;
  dialog = panel;
  opener = trigger;
  destination = null;
  panel.querySelector("[data-confirm]").hidden = true;
  speak(panel, panel === consolePanel ? "Ready to talk. What should I open?" : "");
  panel.showModal();
  if (panel === consolePanel) {
    robot.setAttribute("aria-expanded", "true");
    placeConsole();
    input.focus();
  } else panel.querySelector("[data-action]").focus();
  setState("listening");
}

for (const panel of [consolePanel, palette]) {
  panel.addEventListener("close", () => {
    const target = destination || opener;
    if (target && !target.matches("a, button, input, summary, [tabindex]")) target.tabIndex = -1;
    target?.focus({ preventScroll: true });
    if (destination) destination.scrollIntoView({ block: "nearest", behavior: "instant" });
    dialog = opener = destination = null;
    robot.setAttribute("aria-expanded", "false");
    if (!busy) setState("idle");
  });
  panel.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const items = [...panel.querySelectorAll("button, input, a[href], [tabindex='0']")]
      .filter(item => !item.disabled && !item.hidden && item.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  panel.querySelector("[data-confirm]").addEventListener("click", () => execute(panel, { id: "copy_email", arg: true }));
}
robot.hidden = paletteToggle.hidden = false;
robot.addEventListener("click", () => openPanel(consolePanel, robot));
paletteToggle.addEventListener("click", () => openPanel(palette, paletteToggle));
window.addEventListener("resize", placeConsole);
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return;
  const quick = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.shiftKey;
  const editable = event.target.closest?.("input, textarea, select, [contenteditable]:not([contenteditable=false])");
  const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !editable;
  if (dialog || (!quick && !slash)) return;
  event.preventDefault();
  openPanel(quick ? palette : consolePanel, document.activeElement);
});

document.querySelector("#robot-command").addEventListener("submit", event => {
  event.preventDefault();
  if (input.value.trim()) execute(consolePanel, matchIntent(input.value, projects));
});
consolePanel.querySelector(".console-chips").addEventListener("click", event => {
  const button = event.target.closest("[data-command]");
  if (!button || busy) return;
  input.value = button.dataset.command;
  execute(consolePanel, matchIntent(input.value, projects));
});
palette.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (button) execute(palette, { id: button.dataset.action, arg: button.dataset.arg });
});
