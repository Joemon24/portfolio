import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ACTION_ARGS, FACTS, isDecision, refusal } from "../agent-contract.js";
import worker from "../worker/index.js";
import questions from "./questions.json" with { type: "json" };

const origin = "https://joemon24.github.io";
const url = "https://test.workers.dev/agent";
const action = (name, args = {}) => ({ decision: "action", fact_ids: [], action: { name, args } });
const answer = (...ids) => ({ ...refusal(), decision: "answer", fact_ids: ids });
const upstream = (content, finish = "stop") => Response.json({
  choices: [{ message: { content }, finish_reason: finish }],
});
const request = (body = { question: "hello" }, headers = {}, method = "POST") => new Request(url, {
  method,
  headers: { Origin: origin, "CF-Connecting-IP": "192.0.2.1", "Content-Type": "application/json", ...headers },
  ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
});

test("facts quote the source page or have a reviewed external source, and every action exists locally", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const text = html.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
  const externalSources = new Map([
    ["github_handle", "https://github.com/Joemon24"],
    ["linkedin_school", "https://www.linkedin.com/in/joemon24/"],
    ["resume_languages", "https://joemon24.github.io/portfolio/assets/Joemon-Joy-Resume.pdf"],
    ["resume_degree", "https://joemon24.github.io/portfolio/assets/Joemon-Joy-Resume.pdf"],
  ]);
  for (const fact of FACTS.values()) {
    if (externalSources.has(fact.id)) assert.equal(fact.source_url, externalSources.get(fact.id));
    else assert.ok(text.includes(fact.text), fact.id);
    assert.equal(new URL(fact.source_url).protocol, "https:");
  }
  const source = await readFile(new URL("../agent.js", import.meta.url), "utf8");
  const registry = source.split("const actions = {")[1].split("\n};")[0];
  assert.deepEqual(Object.keys(ACTION_ARGS).sort(), [...registry.matchAll(/^  (?:async )?(\w+)\(/gm)].map(match => match[1]).sort());
});

test("decision schema rejects unknown IDs, extra prose and unexpected or unsafe action arguments", () => {
  for (const value of [
    answer("unknown"), answer(), answer("bio", "bio"), action("send_email"),
    action("copy_email", { confirmed: true }), action("show_project", { project: "https://example.com" }),
    action("show_project"), action("constructor"), action("run_retrieval", { query: "payroll" }),
    action("open_resume", { url: "https://example.com" }), { ...refusal(), prose: "raw model text" },
    { ...refusal(), action: { name: "show_help", args: {} } }, { ...action("show_help"), fact_ids: ["bio"] },
    JSON.parse('{"decision":"action","fact_ids":[],"action":{"name":"open_resume","args":{"__proto__":{}}}}'),
  ]) assert.equal(isDecision(value), false, JSON.stringify(value));
  for (const value of [answer("bio"), refusal(), action("copy_email"), action("show_project", { project: "arc" })]) {
    assert.equal(isDecision(value), true);
  }
});

test("all evaluation expectations use known facts and allowed actions", () => {
  assert.ok(questions.length >= 30);
  assert.equal(new Set(questions.map(item => item.question)).size, questions.length);
  for (const item of questions) {
    assert.ok(item.question.length <= 300);
    if (item.decision === "answer") {
      assert.ok(isDecision(answer(...item.required)), item.question);
      assert.ok(item.required.every(id => item.allowed.includes(id) && FACTS.has(id)));
      assert.ok(item.allowed.every(id => FACTS.has(id)));
    } else if (item.decision === "action") {
      assert.ok(isDecision(action(item.action.name, item.action.args)), item.question);
    } else assert.equal(item.decision, "refuse");
  }
});

test("Worker protocol and model boundary", async t => {
  let requests = 0;
  let allow = true;
  let result = () => upstream(JSON.stringify(answer("fraiseql_status")));
  const ips = [];
  const env = { GROQ_API_KEY: "test-placeholder", AGENT_RATE_LIMIT: {
    async limit({ key }) { ips.push(key); return { success: allow }; },
  } };
  t.mock.method(globalThis, "fetch", async (target, init) => {
    requests++;
    assert.equal(target, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(init.headers.Authorization, "Bearer test-placeholder");
    assert.equal(init.redirect, "error");
    const body = JSON.parse(init.body);
    assert.equal(body.temperature, 0);
    const { type, json_schema: schema } = body.response_format;
    assert.equal(type, "json_schema");
    assert.equal(schema.strict, true);
    assert.deepEqual(schema.schema.properties.fact_ids.items.enum, [...FACTS.keys()]);
    const shapes = schema.schema.properties.action.anyOf;
    assert.deepEqual(shapes.map(shape => shape.properties.name.enum[0]), ["", ...Object.keys(ACTION_ARGS)]);
    assert.deepEqual(shapes.find(shape => shape.properties.name.enum[0] === "copy_email").properties.args, { type: "object", additionalProperties: false });
    assert.equal(body.tools, undefined);
    assert.equal(body.messages.length, 2);
    assert.equal(body.messages[1].role, "user");
    for (const fact of FACTS.values()) assert.ok(body.messages[0].content.includes(JSON.stringify(fact)));
    assert.equal(init.signal.aborted, false);
    return result(init);
  });

  let res = await worker.fetch(request({}, { Origin: "https://example.com" }), env);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
  assert.deepEqual(await res.json(), refusal());
  res = await worker.fetch(request({}, {}, "OPTIONS"), env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(requests, 0);

  assert.equal((await worker.fetch(request({ question: "x".repeat(301) }), env)).status, 400);
  assert.equal((await worker.fetch(request({ question: " ", messages: [] }), env)).status, 400);
  assert.equal((await worker.fetch(request({ question: "x".repeat(5000) }), env)).status, 400);
  assert.equal((await worker.fetch(request({}, { "Content-Type": "text/plain" }), env)).status, 415);
  assert.equal((await worker.fetch(request(), { ...env, GROQ_API_KEY: undefined })).status, 503);
  allow = false;
  res = await worker.fetch(request(), env);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
  assert.equal(requests, 0);
  assert.ok(ips.every(ip => ip === "192.0.2.1"));

  allow = true;
  res = await worker.fetch(request({ question: "Was the PR merged?" }), env);
  assert.deepEqual(await res.json(), answer("fraiseql_status"));
  for (const mock of [
    () => upstream("Here is the answer!"),
    () => upstream(JSON.stringify(answer("made_up"))),
    () => upstream(JSON.stringify(action("send_email"))),
    () => upstream(JSON.stringify(action("copy_email", { confirmed: true }))),
    () => upstream(JSON.stringify(answer("bio")), "length"),
  ]) {
    result = mock;
    res = await worker.fetch(request(), env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("X-Selector-Result"), "invalid-output");
    assert.deepEqual(await res.json(), refusal());
  }
  for (const status of [429, 500]) {
    result = () => new Response("private provider detail", { status });
    res = await worker.fetch(request(), env);
    assert.equal(res.status, status === 429 ? 429 : 502);
    assert.deepEqual(await res.json(), refusal());
  }
});

test("Worker aborts the upstream request at its five-second deadline", async t => {
  let timeout;
  let requested = false;
  const controller = new AbortController();
  t.mock.method(AbortSignal, "timeout", ms => {
    timeout = ms;
    return controller.signal;
  });
  t.mock.method(globalThis, "fetch", async (_, { signal }) => {
    requested = true;
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      queueMicrotask(() => controller.abort(new DOMException("Simulated deadline", "TimeoutError")));
    });
  });
  const res = await worker.fetch(request(), {
    GROQ_API_KEY: "test-placeholder", AGENT_RATE_LIMIT: { async limit() { return { success: true }; } },
  });
  assert.equal(requested, true);
  assert.equal(timeout, 5000);
  assert.equal(res.status, 504);
  assert.deepEqual(await res.json(), refusal());
});

test("browser selection resolves only bundled facts and validated action arguments", async t => {
  const { selectWithWorker } = await import("../agent-remote.js");
  const controller = new AbortController();
  let reply = Response.json(answer("fraiseql_status"));
  t.mock.method(globalThis, "fetch", async (target, init) => {
    assert.equal(target, url);
    assert.equal(init.credentials, "omit");
    assert.equal(init.redirect, "error");
    assert.deepEqual(JSON.parse(init.body), { question: "Was the PR merged?" });
    return reply;
  });
  const select = () => selectWithWorker(url, "Was the PR merged?", controller.signal);
  assert.deepEqual(await select(), { facts: [FACTS.get("fraiseql_status")] });
  reply = Response.json(action("show_project", { project: "arc" }));
  assert.deepEqual(await select(), { intent: { id: "show_project", arg: "arc" } });
  reply = Response.json(refusal());
  assert.deepEqual(await select(), {});
  reply = Response.json(action("copy_email", { confirmed: true }));
  await assert.rejects(select(), /Invalid selector response/);
  reply = Response.json(refusal(), { status: 429 });
  await assert.rejects(select(), /Selector unavailable/);
});
