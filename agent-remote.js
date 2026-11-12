import { FACTS, isDecision, toLocalIntent } from "./agent-contract.js";

export async function selectWithWorker(endpoint, question, signal) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error("Selector unavailable");
  const decision = await response.json();
  if (!isDecision(decision)) throw new Error("Invalid selector response");
  if (decision.decision === "answer") return { facts: decision.fact_ids.map(id => FACTS.get(id)) };
  if (decision.decision === "action") return { intent: toLocalIntent(decision.action) };
  return {};
}
