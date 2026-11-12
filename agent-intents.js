const aliases = {
  show_best_work: ["show me your best work", "best work", "featured work"],
  replay_crash: ["break something", "replay crash", "crash replay", "replay logly"],
  open_resume: ["resume", "open resume", "show resume", "cv"],
  copy_email: ["copy email", "copy email address", "copy contact email"],
  contact_hiring: ["hire him", "hiring", "contact hiring", "hire joemon"],
  toggle_theme: ["toggle theme", "switch theme"],
  show_help: ["help", "show help", "what can you do", "commands"],
};

const normalize = text => text.toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  let previousRow;
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        next[j] = Math.min(next[j], previousRow[j - 2] + 1);
      }
    }
    previousRow = row;
    row = next;
  }
  return row[b.length];
}

function fuzzyMatch(text, choices) {
  const exact = choices.find(([phrase]) => phrase === text);
  if (exact) return exact[1];
  if (text.length < 4) return null;
  const matches = choices.flatMap(([phrase, value]) => {
    if (phrase.length < 4 || Math.abs(text.length - phrase.length) > 2) return [];
    const distance = editDistance(text, phrase);
    return distance <= (phrase.length >= 11 ? 2 : 1) ? [{ distance, value }] : [];
  }).sort((a, b) => a.distance - b.distance);
  if (!matches.length || matches.some(item => item.distance === matches[0].distance && item.value !== matches[0].value)) return null;
  return matches[0].value;
}

const aliasPairs = Object.entries(aliases).flatMap(([id, phrases]) => phrases.map(phrase => [phrase, id]));

export function matchIntent(input, projects) {
  const text = normalize(input.slice(0, 160)).replace(/^please /, "").replace(/ please$/, "");
  if (!text) return null;
  const intent = (id, arg) => ({ id, arg });
  const theme = text.match(/^(?:(?:enable|use|switch to|turn on) )?(dark|light)(?: mode| theme)$/);
  if (theme) return intent("toggle_theme", theme[1]);
  const accent = text.match(/^(?:set )?accent(?: (?:to|color))? (.+)$/);
  if (accent) return intent("set_accent", accent[1]);
  const retrieval = text.match(/^(?:run |try |open )?(?:retrieval|retreival|retrival|visualizer)(?: (?:for|on))?(?: (.+))?$/);
  if (retrieval) return intent("run_retrieval", retrieval[1]);
  const exact = aliasPairs.find(([phrase]) => phrase === text);
  if (exact) return intent(exact[1]);
  const project = text.replace(/^(?:show|open|select|view) (?:me )?(?:(?:the )?project )?/, "");
  const names = projects.map(({ name, id }) => [normalize(name), id]);
  const projectId = fuzzyMatch(project, names);
  if (projectId) return intent("show_project", projectId);
  const approximate = fuzzyMatch(text, aliasPairs);
  return approximate ? intent(approximate) : null;
}

export function retrievalSample(query) {
  if (!query) return undefined;
  const access = /\b(access|tenant|workspace|permission|account|approval)\b/.test(query);
  const incident = /\b(incident|escalate|escalation|severity|on call)\b/.test(query);
  if (access === incident) return null;
  return access ? "access" : "incident";
}
