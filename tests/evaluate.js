import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { isDecision } from "../agent-contract.js";
import worker from "../worker/index.js";
import questions from "./questions.json" with { type: "json" };

const [mode, endpoint] = process.argv.slice(2);
if (!["--groq", "--worker"].includes(mode) || (mode === "--worker" && !endpoint)) {
  console.error("Usage: npm run eval -- --groq  OR  npm run eval -- --worker https://YOUR_WORKER/agent");
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

let passed = 0;
let errors = 0;
const timings = [];
for (const [index, item] of questions.entries()) {
  // Space calls out so the 12/minute Worker binding does not gate a clean run.
  if (index && mode === "--worker") await delay(5200);
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
