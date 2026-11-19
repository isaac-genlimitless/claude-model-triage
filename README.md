# Claude Model Triage

Public, sanitized extraction of the task difficulty triage logic used to select the correct Anthropic Claude model and effort level based on task trigger and agent role.

## Overview

This module provides a single source of truth for routing agent runs to appropriate Claude models (`claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-1`) and effort levels (`low`, `medium`, `high`).

### Key Features

- **Precedence**: Explicit override > agent default > trigger/role rules > global default.
- **Cheap model for simple triggers**: e.g., `event_prep` uses Haiku.
- **Effort mapping**: High for code/engineering and triage tasks; low for certain inbound text handling; medium otherwise.
- **Safety**: Refuses Haiku for any drafting to outsiders (to avoid timezone or precision issues).
- **Validation**: Zod schemas and runtime checks for allowed model/effort pairs.

## Usage

```ts
import { resolveModelEffort } from "./model-policy";

const { model, effort } = resolveModelEffort({
  trigger: "triage",
  slug: "full_stack_engineer",
  // optional override or agentDefault
});
```

See `model-policy.ts` for the full implementation and guidance string.

## License

MIT (extracted and sanitized for public use).
