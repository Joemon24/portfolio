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

export function runRetrievalSample(sample) {
  if (sample) {
    if (!Object.hasOwn(samples, sample)) throw new Error("Unknown retrieval sample");
    controls.elements.query.value = sample;
  }
  document.querySelector("#retrieval-demo").open = true;
  renderRetrieval();
  return controls.elements.query.selectedOptions[0].textContent;
}

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
