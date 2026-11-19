# Claude Model Triage

Configurable library for selecting the right Anthropic Claude model and effort level based on task type and agent role.

Model IDs are left as the original internal ones (`claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-1`). Swap them for real Anthropic model IDs when you integrate with the API.

## Quick start

```ts
import { resolveModelEffort, createPolicy } from "./model-policy.ts";

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
| `cheapTriggers` | `["event_prep"]` | Triggers that use the cheap (Haiku) model |
| `lowEffortTriggers` | `["inbound_texts"]` | Triggers that default to low effort |
| `highEffortSlugs` | `["full_stack_engineer"]` | Agent slugs that default to high effort |
| `highEffortTriggers` | `["triage"]` | Triggers that default to high effort |
| `outsiderDrafting` | `["inbound_email", "inbound_texts", "inbound_sweep"]` | Triggers/slugs where Haiku is refused |

Precedence is always: **explicit override > agent default > configured rules > global default**.

## Validation helpers

```ts
import { validateModelEffort, supportsEffort, modelInfo } from "./model-policy.ts";

validateModelEffort("claude-sonnet-5-5", "high"); // ok
validateModelEffort("claude-haiku-4-5", "medium"); // throws — Haiku has no effort
```

## License

MIT
