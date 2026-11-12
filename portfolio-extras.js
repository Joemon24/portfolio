const samples = {
  access: {
    documents: {
      guide: ["Workspace access guide", 140],
      policy: ["Access approval policy", 100],
      account: ["Account setup", 90],
      roles: ["Workspace roles", 130],
    },
    lexical: ["guide", "policy", "account"],
    vector: ["policy", "guide", "roles"],
  },
  incident: {
    documents: {
      escalation: ["Escalation policy", 160],
      severity: ["Incident severity guide", 110],
      contacts: ["On-call directory", 80],
      review: ["Post-incident review", 120],
    },
    lexical: ["escalation", "contacts", "severity"],
    vector: ["escalation", "severity", "review"],
  },
};

const controls = document.querySelector("#retrieval-controls");
const ranks = document.querySelector("#retrieval-ranks");
const progress = document.querySelector("#budget-used");
const budgetStatus = document.querySelector("#budget-status");

function rankWithRrf(rankings) {
  const scores = new Map();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (60 + index + 1));
    });
  }
  return [...scores].sort(([a, scoreA], [b, scoreB]) => scoreB - scoreA || a.localeCompare(b));
}

function renderList(id, entries) {
  document.getElementById(id).replaceChildren(...entries.map(text => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
}

function renderRetrieval() {
  const { documents, lexical, vector } = samples[controls.elements.query.value];
  const budget = Number(controls.elements.budget.value);
  const fused = rankWithRrf([lexical, vector]);
  let used = 0;
  let included = 0;
  let cutOff = false;
  renderList("lexical-ranks", lexical.map(id => documents[id][0]));
  renderList("vector-ranks", vector.map(id => documents[id][0]));
  renderList("fused-ranks", fused.map(([id, score]) => {
    const [title, tokens] = documents[id];
    cutOff ||= used + tokens > budget;
    if (!cutOff) {
      used += tokens;
      included++;
    }
    return `${title} · ${score.toFixed(4)} · ${tokens} tokens · ${cutOff ? "Excluded" : "Included"}`;
  }));
  document.querySelector("#budget-limit").value = `${budget} tokens`;
  progress.max = Math.max(1, budget);
  progress.value = used;
  budgetStatus.textContent = `${used} of ${budget} tokens used. ${included} of ${fused.length} results fit before the cutoff.`;
}

controls.hidden = ranks.hidden = progress.hidden = false;
controls.addEventListener("input", renderRetrieval);
controls.addEventListener("submit", event => event.preventDefault());
renderRetrieval();

const palette = document.querySelector("#command-palette");
const toggle = document.querySelector("#palette-toggle");
const copyStatus = document.querySelector("#copy-status");
let opener;
let destination;

function openPalette() {
  if (palette.open) return;
  opener = document.activeElement;
  destination = null;
  copyStatus.textContent = "";
  palette.showModal();
  palette.querySelector("ul a").focus();
}

toggle.hidden = false;
toggle.addEventListener("click", openPalette);
document.addEventListener("keydown", event => {
  if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
  event.preventDefault();
  openPalette();
});
palette.addEventListener("click", event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  destination = document.getElementById(link.hash.slice(1)).querySelector("h2");
  palette.close();
});
palette.addEventListener("close", () => {
  if (destination) {
    destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
  } else opener?.focus();
});
document.querySelector("#copy-email").addEventListener("click", async () => {
  const emailLink = document.querySelector('#contact a[href^="mailto:"]');
  const email = emailLink.getAttribute("href").slice("mailto:".length);
  try {
    await navigator.clipboard.writeText(email);
    copyStatus.textContent = "Email address copied.";
  } catch {
    copyStatus.textContent = `Copy this address: ${email}`;
  }
});

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const statement = document.querySelector(".about-statement");
if (!motion.matches && "IntersectionObserver" in window) {
  const words = [];
  for (const node of [...statement.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    node.replaceWith(...node.textContent.split(/(\s+)/).map(part => {
      if (!part.trim()) return document.createTextNode(part);
      const word = document.createElement("span");
      word.textContent = part;
      word.style.setProperty("--word-order", words.length);
      words.push(word);
      return word;
    }));
  }
  statement.classList.add("reveal-ready");
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    statement.classList.add("revealed");
    observer.disconnect();
  }, { threshold: 0.5 });
  observer.observe(statement);
}

const mobileNav = matchMedia("(max-width: 560px)");
function loadMobileNav() {
  if (!mobileNav.matches) return;
  mobileNav.removeEventListener("change", loadMobileNav);
  // The inline navigation remains available if the enhancement cannot load.
  import("./src/portfolio-ui.jsx").catch(() => {});
}
mobileNav.addEventListener("change", loadMobileNav);
loadMobileNav();
