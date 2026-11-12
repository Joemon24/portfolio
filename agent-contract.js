import facts from "./facts.json" with { type: "json" };

export const MAX_QUESTION_LENGTH = 300;
export const FACTS = new Map(facts.map(fact => [fact.id, fact]));
export const ACTION_ARGS = Object.freeze({
  show_best_work: {},
  show_project: { project: ["arc", "logly", "emotion", "pingo", "fraiseql", "churn"] },
  replay_crash: {},
  run_retrieval: { query: [undefined, "tenant access", "incident escalation"] },
  open_resume: {},
  copy_email: {},
  contact_hiring: {},
  toggle_theme: { mode: [undefined, "dark", "light"] },
  set_accent: { color: ["lime", "red", "blue", "amber", "cyan"] },
  show_help: {},
  go_section: { section: ["projects", "about", "contact"] },
});

export function refusal() {
  return { decision: "refuse", fact_ids: [], action: { name: "", args: {} } };
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

export function isDecision(value) {
  if (!hasKeys(value, ["decision", "fact_ids", "action"]) ||
      !["answer", "action", "refuse"].includes(value.decision) ||
      !Array.isArray(value.fact_ids) || value.fact_ids.length > 4 ||
      new Set(value.fact_ids).size !== value.fact_ids.length ||
      !value.fact_ids.every(id => typeof id === "string" && FACTS.has(id)) ||
      !hasKeys(value.action, ["name", "args"]) || !isRecord(value.action.args)) return false;

  const { name, args } = value.action;
  if (value.decision !== "action") {
    return name === "" && Object.keys(args).length === 0
      && (value.decision === "answer" ? value.fact_ids.length > 0 : value.fact_ids.length === 0);
  }
  if (value.fact_ids.length || typeof name !== "string" || !Object.hasOwn(ACTION_ARGS, name)) return false;
  const spec = ACTION_ARGS[name];
  return Object.keys(args).every(key => Object.hasOwn(spec, key))
    && Object.entries(spec).every(([key, allowed]) => allowed.includes(Object.hasOwn(args, key) ? args[key] : undefined));
}

export function toLocalIntent(action) {
  return { id: action.name, arg: Object.values(action.args)[0] };
}
