# Claude Model Triage

Configurable library for selecting the right Anthropic Claude model and effort level based on task type and agent role.

## Quick start

```ts
import { resolveModelEffort, createPolicy } from "claude-model-triage";

// Use the default rules (same as the original internal system)
const { model, effort } = resolveModelEffort({
  trigger: "triage",
  slug: "full_stack_engineer",
});
// → { model: "claude-sonnet-5-5", effort: "high" }

// Or create a custom policy for your own triggers/roles
const myPolicy = createPolicy({
  cheapTriggers: ["simple_lookup", "status"],
  highEffortSlugs: ["engineer", "researcher"],
  highEffortTriggers: ["complex_analysis"],
  lowEffortTriggers: ["quick_reply"],
  outsiderDrafting: ["email_draft", "customer_message"], // Haiku refused for these
});

const result = myPolicy.resolveModelEffort({
  trigger: "complex_analysis",
  slug: "researcher",
  override: { effort: "medium" }, // explicit override wins
});
```

## Configuration

`createPolicy(config)` accepts:

| Option | Default | Description |
|--------|---------|-------------|
| `cheapTriggers` | `["event_prep"]` | Triggers that use the cheap model (Haiku 5.5) |
| `lowEffortTriggers` | `["inbound_texts"]` | Triggers that default to low effort |
| `highEffortSlugs` | `["full_stack_engineer"]` | Agent slugs that default to high effort |
| `highEffortTriggers` | `["triage"]` | Triggers that default to high effort |
| `outsiderDrafting` | `["inbound_email", "inbound_texts", "inbound_sweep"]` | Triggers/slugs where any Haiku model is refused, even if the trigger is also listed as cheap |

Precedence is always: **explicit override > agent default > configured rules > global default**.

Every result is validated: an unknown model or effort (for example a typo in an override) throws instead of passing through, and a Haiku model is refused for outsider drafting whether it came from an override, an agent default or the rules.

## Models

| Model | Tier | Effort levels |
|-------|------|---------------|
| `claude-haiku-5-5` | cheap | low, medium, high, xhigh, max |
| `claude-haiku-4-5` | cheap | none |
| `claude-sonnet-5-5` | standard (default) | low, medium, high, xhigh, max |
| `claude-opus-5-5` | strong | low, medium, high, xhigh, max |
| `claude-fable-5-2` | strong | low, medium, high, xhigh, max |

## Validation helpers

```ts
import { validateModelEffort, supportsEffort, modelInfo } from "claude-model-triage";

validateModelEffort("claude-sonnet-5-5", "high"); // ok
validateModelEffort("claude-haiku-4-5", "medium"); // throws — Haiku 4.5 has no effort setting
```

## Development

Requires Node 22.18+ (tests run TypeScript directly).

```bash
npm install
npm run typecheck
npm test
npm run build   # emits dist/
```

## Changelog

**2.0.0**: Haiku 5.5 is now the cheap model and Fable 5.2 replaces Fable 5.1. Adds the `xhigh` and `max` effort levels. Fixes: a trigger listed as both cheap and outsider-drafting no longer resolves to Haiku, and unknown models or efforts in overrides now throw. The package now ships compiled JavaScript in `dist/`.

## License

MIT
