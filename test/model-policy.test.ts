import { test } from "node:test";
import assert from "node:assert/strict";
import { createPolicy, resolveModelEffort, validateModelEffort, CHEAP_MODEL, DEFAULT_MODEL } from "../model-policy.ts";

test("default rules: triage on the engineer is Sonnet at high effort", () => {
  assert.deepEqual(resolveModelEffort({ trigger: "triage", slug: "full_stack_engineer" }), { model: DEFAULT_MODEL, effort: "high" });
});

test("cheap trigger picks the cheap model", () => {
  assert.equal(resolveModelEffort({ trigger: "event_prep", slug: "assistant" }).model, CHEAP_MODEL);
});

test("a trigger that is both cheap and outsider-drafting never gets a Haiku model", () => {
  const p = createPolicy({ cheapTriggers: ["send_email"], outsiderDrafting: ["send_email"] });
  assert.equal(p.resolveModelEffort({ trigger: "send_email", slug: "assistant" }).model, DEFAULT_MODEL);
});

test("forcing Haiku on an outsider-drafting slug throws", () => {
  for (const model of ["claude-haiku-5-5", "claude-haiku-4-5"]) {
    assert.throws(() => resolveModelEffort({ trigger: "x", slug: "inbound_email", override: { model } }), /drafts to outsiders/);
  }
});

test("agent default Haiku is also refused for outsider drafting", () => {
  assert.throws(() => resolveModelEffort({ trigger: "inbound_texts", slug: "a", agentDefault: { model: "claude-haiku-5-5" } }), /drafts to outsiders/);
});

test("unknown model in an override throws", () => {
  assert.throws(() => resolveModelEffort({ trigger: "x", slug: "y", override: { model: "claude-sonet-5-5" } }), /Unknown model/);
});

test("unknown effort in an override throws", () => {
  assert.throws(() => resolveModelEffort({ trigger: "x", slug: "y", override: { effort: "extreme" } }), /Unknown effort/);
});

test("override effort wins over rules", () => {
  assert.equal(resolveModelEffort({ trigger: "triage", slug: "full_stack_engineer", override: { effort: "low" } }).effort, "low");
});

test("models without an effort setting drop effort and reject an explicit one", () => {
  assert.deepEqual(resolveModelEffort({ trigger: "x", slug: "y", override: { model: "claude-haiku-4-5" } }), { model: "claude-haiku-4-5" });
  assert.throws(() => validateModelEffort("claude-haiku-4-5", "medium"), /does not accept effort/);
});

test("validateModelEffort accepts current pairs and empty values", () => {
  validateModelEffort("claude-opus-5-5", "xhigh");
  validateModelEffort("claude-fable-5-2", "max");
  validateModelEffort(undefined, null);
  validateModelEffort("", "");
});

test("custom config does not share arrays with the caller", () => {
  const cheap = ["a"];
  const p = createPolicy({ cheapTriggers: cheap });
  cheap.push("b");
  assert.deepEqual(p.config.cheapTriggers, ["a"]);
});
