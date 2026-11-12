import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { isDecision } from "../agent-contract.js";
import worker from "../worker/index.js";
import baseline from "./questions.json" with { type: "json" };
import heldOut from "./held-out.json" with { type: "json" };

const flags = process.argv.slice(2);
const questions = flags.includes("--held-out") ? heldOut : baseline;

const [mode, endpoint] = flags.filter(flag => flag !== "--held-out");
if (!["--groq", "--worker"].includes(mode) || (mode === "--worker" && !endpoint)) {
  console.error("Usage: npm run eval -- --groq  OR  npm run eval -- --worker https://YOUR_WORKER/agent [--held-out]");
  process.exit(2);
}
if (mode === "--groq" && !process.env.GROQ_API_KEY) {
  console.error("Set GROQ_API_KEY in your environment to run the live Groq evaluation.");
  process.exit(2);
}

function score(expected, received) {
  if (!isDecision(received) || expected.decision !== received.decision) return false;
  if (expected.decision === "action") return isDeepStrictEqual(expected.action, received.action);
  if (expected.decision === "answer") {
    return expected.required.every(id => received.fact_ids.includes(id))
      && received.fact_ids.every(id => expected.allowed.includes(id));
  }
  return true;
}

// The full fact prompt can reach Groq’s free token limit before its request limit.
const interval = Number(process.env.RYU_EVAL_INTERVAL_MS ?? 20000);
if (!Number.isInteger(interval) || interval < 0 || (mode === "--worker" && interval < 5200)) {
  console.error("RYU_EVAL_INTERVAL_MS must be a nonnegative integer, at least 5200 for --worker.");
  process.exit(2);
}
let passed = 0;
let errors = 0;
const timings = [];
for (const [index, item] of questions.entries()) {
  if (index) await delay(interval);
  const headers = { "Content-Type": "application/json", Origin: "https://joemon24.github.io" };
  const body = JSON.stringify({ question: item.question });
  const start = performance.now();
  try {
    const response = mode === "--worker"
      ? await fetch(endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(7500), redirect: "error" })
      : await worker.fetch(new Request("https://eval.invalid/agent", {
        method: "POST", headers: { ...headers, "CF-Connecting-IP": "192.0.2.1" }, body,
      }), {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        DAILY_BUDGET: { getByName: () => ({ fetch: async () => new Response(null, { status: 204 }) }) },
        AGENT_RATE_LIMIT: { async limit() { return { success: true }; } },
      });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.headers.get("X-Selector-Result") === "invalid-output") throw new Error("Invalid model output");
    const decision = await response.json();
    timings.push(performance.now() - start);
    const ok = score(item, decision);
    passed += Number(ok);
    console.log(`${ok ? "PASS" : "FAIL"} ${index + 1} ${item.question}${ok ? "" : ` → ${JSON.stringify(decision)}`}`);
  } catch (error) {
    errors++;
    console.log(`ERROR ${index + 1} ${item.question} → ${error.message}`);
  }
}
timings.sort((a, b) => a - b);
const percentile = p => timings.length ? `${Math.round(timings[Math.ceil(timings.length * p) - 1])} ms` : "n/a";
console.log(`RESULT: ${passed}/${questions.length} (${(100 * passed / questions.length).toFixed(1)}%) passed, ${errors} request errors, p50 ${percentile(.5)}, p95 ${percentile(.95)}`);
if (passed !== questions.length) process.exitCode = 1;
