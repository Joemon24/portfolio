import { openProject, paintAgent, replayCrash } from "./portfolio.js";
import { runRetrievalSample } from "./portfolio-extras.js";
import { matchIntent, retrievalSample } from "./agent-intents.js";

const root = document.documentElement;
const robot = document.querySelector(".pixel-pet");
const consolePanel = document.querySelector("#robot-console");
const palette = document.querySelector("#command-palette");
const paletteToggle = document.querySelector("#palette-toggle");
const input = document.querySelector("#robot-input");
const trace = document.querySelector("#agent-trace");
const consoleBody = document.querySelector("#console-body");
const fold = document.querySelector("#console-fold");
const themeControls = document.querySelector("#theme-controls");
const themeToggle = document.querySelector("#theme-toggle");
const consoleTheme = document.querySelector("#console-theme");
const accentToggle = document.querySelector("#console-accent");
const accentOptions = document.querySelector("#accent-options");
const contactActions = document.querySelector("#contact-actions");
const contactCopy = document.querySelector("#contact-copy");
const recruiter = document.querySelector("#recruiter-commands");
const answer = document.querySelector("#agent-answer");
const refusalCopy = document.querySelector("#refusal-copy");
const resumeLink = document.querySelector("#agent-resume-link");
const llmMode = document.querySelector("#llm-mode");
const workerUrl = import.meta.env?.VITE_AGENT_WORKER_URL?.trim();
let pendingSelection;
const projects = [...document.querySelectorAll(".project-menu a")].map(link => ({
  name: link.textContent.trim(), id: link.hash.slice(1),
}));
for (const entry of document.querySelectorAll(".more-work li[id]")) {
  projects.push({ name: entry.querySelector("a").textContent.trim(), id: entry.id, moreWork: true });
}
const themes = new Set(["light", "dark"]);
const accents = new Set(["lime", "red", "blue", "amber", "cyan"]);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let dialog;
let opener;
let destination;
let queuedPaletteTrigger;
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
  if (panel === consolePanel) {
    panel.querySelector(".console-bubble").textContent = text;
    if (consoleBody.hidden) setFoldLabel(text);
  }
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
  open_resume(_, step, panel, source) {
    const url = document.querySelector(".hero-links a[download]").href;
    if (source && panel === consolePanel) {
      step("offer(resume PDF)", "Preparing the resume link.", () => {
        resumeLink.href = url;
        resumeLink.hidden = false;
        setCollapsed(false);
        resumeLink.focus();
      });
      return "Open the resume PDF using the link.";
    }
    step("open(resume PDF)", "Opening the resume PDF.", () => window.open(url, "_blank", "noopener"));
    return "Requested the resume PDF in a new tab.";
  },
  async copy_email(confirmed, step, panel) {
    const email = contactActions.querySelector('a[href^="mailto:"]').getAttribute("href").slice(7);
    if (confirmed !== true) {
      const confirm = panel.querySelector("[data-confirm]");
      confirm.hidden = false;
      if (panel === consolePanel) setCollapsed(false);
      confirm.focus();
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
    step("scroll(#contact)", "Opening contact options.", () => scrollToId("contact"));
    destination = contactActions.querySelector('a[href^="mailto:"]');
    return "Use Email me or Copy email to get in touch about a role.";
  },
  toggle_theme(mode, step) {
    const theme = themes.has(mode) ? mode : root.dataset.theme === "dark" ? "light" : "dark";
    step(`theme(${theme})`, `Applying ${theme} mode.`, () => {
      root.dataset.theme = theme;
      const dark = theme === "dark";
      themeToggle.setAttribute("aria-pressed", String(dark));
      consoleTheme.dataset.command = dark ? "light mode" : "dark mode";
      consoleTheme.textContent = dark ? "Light mode" : "Dark mode";
    });
    return `${theme === "dark" ? "Dark" : "Light"} mode is on.`;
  },
  set_accent(color, step) {
    if (!accents.has(color)) throw new Error("Choose lime, red, blue, amber, or cyan. Try “set accent to lime”.");
    step(`accent(${color})`, `Applying the ${color} accent.`, () => {
      root.dataset.accent = color;
      for (const button of accentOptions.querySelectorAll("button")) {
        button.setAttribute("aria-pressed", String(button.dataset.command === `accent ${color}`));
      }
    });
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

async function execute(panel, intent, source) {
  if (busy) return;
  const confirm = panel.querySelector("[data-confirm]");
  if (confirm) {
    if (document.activeElement === confirm) {
      const returnFocus = panel === consolePanel ? input
        : panel === palette ? palette.querySelector('[data-action="copy_email"]') : contactCopy;
      returnFocus.focus();
    }
    confirm.hidden = true;
  }
  if (dialog === panel) destination = null;
  if (panel === consolePanel) resetAnswer();
  trace.replaceChildren();
  if (source) appendTrace(source);
  if (!intent) {
    appendTrace("intent: unknown");
    speak(panel, source === "local fallback" ? "AI selector unavailable. Try “show Logly”, “resume”, or choose a suggestion."
      : "I can’t do that yet. Try “show Logly”, “resume”, or choose a suggestion.");
    setState("listening");
    return;
  }
  busy = true;
  setState("working");
  if (panel === consolePanel) setCollapsed(true, true);
  const steps = [`intent: ${intent.id}`];
  appendTrace(steps[0]);
  function step(label, narration, action) {
    steps.push(label);
    if (dialog === panel || !panel.matches("dialog")) speak(panel, narration);
    appendTrace(label);
    return action?.();
  }
  try {
    const result = await actions[intent.id](intent.arg, step, panel, source);
    if (result) {
      appendTrace(`${steps.join(" → ")} ok`);
      if (dialog === panel || !panel.matches("dialog")) {
        speak(panel, result);
        if (panel === palette && destination) panel.close();
      }
    }
  } catch (error) {
    appendTrace(`${steps.join(" → ")} stopped`);
    if (dialog === panel || !panel.matches("dialog")) speak(panel, error.message);
  } finally {
    busy = false;
    setState(dialog ? (dialog.querySelector("[data-confirm]").hidden ? "done" : "listening") : "idle");
  }
}

function setFoldLabel(text) {
  fold.querySelector(".fold-label").textContent = text;
}

function setCollapsed(collapsed, focus = false) {
  consoleBody.hidden = collapsed;
  consolePanel.classList.toggle("is-collapsed", collapsed);
  fold.setAttribute("aria-expanded", String(!collapsed));
  fold.querySelector(".fold-icon").textContent = collapsed ? "+" : "−";
  setFoldLabel(collapsed ? consolePanel.querySelector("[data-feedback]").textContent : "Ryu console");
  if (focus) fold.focus({ preventScroll: true });
}

if ("ResizeObserver" in window) {
  const drawerSize = new ResizeObserver(() => {
    root.style.setProperty("--drawer-height", `${consolePanel.offsetHeight}px`);
  });
  drawerSize.observe(consolePanel);
}
fold.addEventListener("click", () => setCollapsed(!consoleBody.hidden));
accentToggle.addEventListener("click", () => {
  accentOptions.hidden = !accentOptions.hidden;
  accentToggle.setAttribute("aria-expanded", String(!accentOptions.hidden));
  if (!accentOptions.hidden) accentOptions.querySelector("button").focus();
});

function openPanel(panel, trigger) {
  if (dialog || busy) return false;
  dialog = panel;
  opener = trigger;
  destination = null;
  panel.querySelector("[data-confirm]").hidden = true;
  if (panel === consolePanel) resetAnswer();
  speak(panel, panel === consolePanel ? "I’m Ryu, Joemon’s portfolio assistant. Ask me about his work." : "");
  if (panel === consolePanel) {
    setCollapsed(false);
    panel.show();
    robot.setAttribute("aria-expanded", "true");
    input.focus({ preventScroll: true });
  } else {
    panel.showModal();
    panel.querySelector("[data-action]").focus();
  }
  setState("listening");
  return true;
}

for (const panel of [consolePanel, palette]) {
  panel.addEventListener("close", () => {
    if (panel === consolePanel) pendingSelection?.abort();
    const target = destination || opener;
    if (target && !target.matches("a, button, input, summary, [tabindex]")) target.tabIndex = -1;
    target?.focus({ preventScroll: true });
    if (destination) destination.scrollIntoView({ block: "nearest", behavior: "instant" });
    dialog = opener = destination = null;
    robot.setAttribute("aria-expanded", "false");
    if (!busy) setState("idle");
    if (panel === consolePanel && queuedPaletteTrigger) {
      const trigger = queuedPaletteTrigger;
      queuedPaletteTrigger = null;
      openPanel(palette, trigger);
    }
  });
  panel.addEventListener("keydown", event => {
    if (panel === consolePanel || event.key !== "Tab") return;
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
function openQuickActions() {
  if (dialog === consolePanel && !busy) {
    queuedPaletteTrigger = paletteToggle;
    consolePanel.close();
    return;
  }
  openPanel(palette, paletteToggle);
}
paletteToggle.addEventListener("click", openQuickActions);
themeControls.hidden = contactCopy.hidden = recruiter.hidden = false;
themeToggle.addEventListener("click", () => execute(themeControls, { id: "toggle_theme" }));
contactCopy.addEventListener("click", () => execute(contactActions, { id: "copy_email" }));
contactActions.querySelector("[data-confirm]").addEventListener("click", () =>
  execute(contactActions, { id: "copy_email", arg: true }));
recruiter.addEventListener("click", event => {
  const button = event.target.closest("[data-command]");
  if (!button || (dialog !== consolePanel && !openPanel(consolePanel, button))) return;
  input.value = button.dataset.command;
  execute(consolePanel, matchIntent(input.value, projects));
});
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return;
  if (event.key === "Escape" && dialog === consolePanel) {
    event.preventDefault();
    consolePanel.close();
    return;
  }
  const quick = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.shiftKey;
  const editable = event.target.closest?.("input, textarea, select, [contenteditable]:not([contenteditable=false])");
  const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !editable;
  if (quick && dialog !== palette && !busy) {
    event.preventDefault();
    openQuickActions();
  } else if (slash && !dialog && !busy) {
    event.preventDefault();
    openPanel(consolePanel, document.activeElement);
  }
});

function resetAnswer() {
  answer.hidden = refusalCopy.hidden = resumeLink.hidden = true;
  answer.replaceChildren();
}

function renderSelection(selection) {
  setCollapsed(false);
  if (!selection.facts) {
    appendTrace("selector: refuse");
    speak(consolePanel, "I’ll need to ask Boss about that.");
    refusalCopy.hidden = false;
    refusalCopy.focus({ preventScroll: true });
    return;
  }
  appendTrace(`selector: answer (${selection.facts.length} facts)`);
  const list = document.createElement("ul");
  for (const fact of selection.facts) {
    const item = document.createElement("li");
    const text = document.createElement("p");
    text.textContent = fact.text;
    const source = document.createElement("a");
    source.href = fact.source_url;
    source.target = "_blank";
    source.rel = "noopener";
    source.textContent = "Source ↗";
    item.append(text, source);
    list.append(item);
  }
  answer.append(list);
  answer.hidden = false;
  speak(consolePanel, `Selected ${selection.facts.length} portfolio ${selection.facts.length === 1 ? "fact" : "facts"} below.`);
  answer.tabIndex = -1;
  answer.focus();
}

document.querySelector("#llm-option").hidden = !workerUrl;
refusalCopy.addEventListener("click", () => execute(consolePanel, { id: "copy_email" }));
document.querySelector("#robot-command").addEventListener("submit", async event => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question || busy) return;
  if (!workerUrl || !llmMode.checked) {
    execute(consolePanel, matchIntent(question, projects));
    return;
  }

  busy = true;
  destination = null;
  resetAnswer();
  consolePanel.querySelector("[data-confirm]").hidden = true;
  trace.replaceChildren();
  appendTrace("selector: requesting");
  const controller = new AbortController();
  pendingSelection = controller;
  setState("working");
  setCollapsed(true, true);
  speak(consolePanel, "Checking the portfolio facts…");
  let selection;
  let unavailable = false;
  try {
    const { selectWithWorker } = await import("./agent-remote.js");
    selection = await selectWithWorker(workerUrl, question, controller.signal);
  } catch {
    unavailable = true;
  } finally {
    pendingSelection = null;
    busy = false;
  }
  if (controller.signal.aborted || !consolePanel.open || dialog !== consolePanel) {
    setState(dialog ? "listening" : "idle");
    return;
  }
  if (unavailable) {
    execute(consolePanel, matchIntent(question, projects), "local fallback");
  } else if (selection.intent) {
    execute(consolePanel, selection.intent, "selector: action");
  } else {
    renderSelection(selection);
    setState("done");
  }
});
consolePanel.addEventListener("click", event => {
  const button = event.target.closest("[data-command]");
  if (!button || busy) return;
  input.value = button.dataset.command;
  execute(consolePanel, matchIntent(input.value, projects));
});
palette.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (button) execute(palette, { id: button.dataset.action, arg: button.dataset.arg });
});
