/**
 * Minimal usage example.
 * Run with: npx tsx example.ts  (or any TS runner)
 */
import { resolveModelEffort, createPolicy } from "./model-policy.ts";

// Default policy (original rules)
console.log("Default triage:", resolveModelEffort({ trigger: "triage", slug: "full_stack_engineer" }));
console.log("Default simple:", resolveModelEffort({ trigger: "event_prep", slug: "assistant" }));

// Custom policy for a different system
const custom = createPolicy({
  cheapTriggers: ["summarize", "extract"],
  highEffortSlugs: ["code_reviewer"],
  highEffortTriggers: ["deep_research"],
  outsiderDrafting: ["send_email"],
});

console.log(
  "Custom:",
  custom.resolveModelEffort({
    trigger: "deep_research",
    slug: "code_reviewer",
  })
);

console.log(
  "With override:",
  custom.resolveModelEffort({
    trigger: "summarize",
    slug: "assistant",
    override: { model: "claude-opus-5-5", effort: "low" },
  })
);
