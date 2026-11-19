import { z } from "zod";

// Configurable source of truth for which model and effort an agent run uses.
// Precedence: explicit override > agent default > trigger/role rules > global default.
// Every resolved result is validated: unknown models or efforts throw instead of passing through.

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

export type ModelTier = "cheap" | "standard" | "strong";

export type ModelInfo = {
  readonly id: string;
  readonly label: string;
  readonly tier: ModelTier;
  /** Effort levels the model accepts. Empty = the model has no effort setting. */
  readonly efforts: readonly Effort[];
};

export const MODELS = [
  { id: "claude-haiku-5-5", label: "Haiku 5.5", tier: "cheap", efforts: EFFORTS },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", tier: "cheap", efforts: [] },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", tier: "standard", efforts: EFFORTS },
  { id: "claude-opus-5-5", label: "Opus 5.5", tier: "strong", efforts: EFFORTS },
  { id: "claude-fable-5-2", label: "Fable 5.2", tier: "strong", efforts: EFFORTS },
] as const satisfies readonly ModelInfo[];

export type ModelId = (typeof MODELS)[number]["id"];
export const MODEL_IDS = MODELS.map((m) => m.id) as [ModelId, ...ModelId[]];
export const modelIdSchema = z.enum(MODEL_IDS);
export const effortSchema = z.enum(EFFORTS);

export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";
export const CHEAP_MODEL: ModelId = "claude-haiku-5-5";

export const modelInfo = (id: string): ModelInfo | undefined => MODELS.find((m) => m.id === id);
export const supportsEffort = (id: string) => (modelInfo(id)?.efforts.length ?? 0) > 0;
const isCheap = (id: string) => modelInfo(id)?.tier === "cheap";

/** Configuration for which triggers/roles map to cheaper models, lower effort, or outsider-drafting restrictions. */
export interface ModelPolicyConfig {
  /** Triggers that should use the cheap model. Default: ["event_prep"] */
  cheapTriggers?: string[];
  /** Triggers that should use low effort. Default: ["inbound_texts"] */
  lowEffortTriggers?: string[];
  /** Agent slugs or triggers that draft to outsiders: cheap-tier models are refused for these. Default: ["inbound_email", "inbound_texts", "inbound_sweep"] */
  outsiderDrafting?: string[];
  /** Agent slugs that should use high effort by default. Default: ["full_stack_engineer"] */
  highEffortSlugs?: string[];
  /** Triggers that should use high effort by default. Default: ["triage"] */
  highEffortTriggers?: string[];
}

const DEFAULT_CONFIG: Required<ModelPolicyConfig> = {
  cheapTriggers: ["event_prep"],
  lowEffortTriggers: ["inbound_texts"],
  outsiderDrafting: ["inbound_email", "inbound_texts", "inbound_sweep"],
  highEffortSlugs: ["full_stack_engineer"],
  highEffortTriggers: ["triage"],
};

export type Choice = { model?: string | null; effort?: string | null };
export type Resolved = { model: ModelId; effort?: Effort };

export function createPolicy(config: ModelPolicyConfig = {}) {
  const cfg: Required<ModelPolicyConfig> = { ...DEFAULT_CONFIG };
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof ModelPolicyConfig)[]) {
    if (config[k] !== undefined) cfg[k] = [...config[k]!];
  }

  const cheapTriggers = new Set(cfg.cheapTriggers);
  const lowEffortTriggers = new Set(cfg.lowEffortTriggers);
  const outsiderDrafting = new Set(cfg.outsiderDrafting);
  const highEffortSlugs = new Set(cfg.highEffortSlugs);
  const highEffortTriggers = new Set(cfg.highEffortTriggers);

  const draftsToOutsiders = (slug: string, trigger: string) => outsiderDrafting.has(slug) || outsiderDrafting.has(trigger);

  /** Rule-based model. A trigger that drafts to outsiders never gets the cheap model, even if listed as cheap. */
  const modelFor = (trigger: string, slug = ""): ModelId =>
    cheapTriggers.has(trigger) && !draftsToOutsiders(slug, trigger) ? CHEAP_MODEL : DEFAULT_MODEL;

  function effortFor(trigger: string, slug: string): Effort {
    if (lowEffortTriggers.has(trigger)) return "low";
    if (highEffortSlugs.has(slug) || highEffortTriggers.has(trigger)) return "high";
    return "medium";
  }

  function assertModelAllowed(model: string, slug: string, trigger: string) {
    if (isCheap(model) && draftsToOutsiders(slug, trigger))
      throw new Error(`${modelInfo(model)!.label} is refused for '${slug}' (${trigger}): it drafts to outsiders. Use a stronger model.`);
  }

  function resolveModelEffort(a: { override?: Choice; agentDefault?: Choice; trigger: string; slug: string }): Resolved {
    const o = a.override ?? {};
    const d = a.agentDefault ?? {};
    const model = o.model || d.model || modelFor(a.trigger, a.slug);
    const explicitEffort = o.effort || d.effort || undefined;
    validateModelEffort(model, explicitEffort);
    assertModelAllowed(model, a.slug, a.trigger);
    if (!supportsEffort(model)) return { model: model as ModelId };
    return { model: model as ModelId, effort: (explicitEffort as Effort | undefined) ?? effortFor(a.trigger, a.slug) };
  }

  return { config: cfg, modelFor, effortFor, assertModelAllowed, resolveModelEffort };
}

// Default policy (matches the original hardcoded rules)
export const defaultPolicy = createPolicy();
export const { resolveModelEffort, effortFor, modelFor, assertModelAllowed } = defaultPolicy;

const allowedText = () =>
  `Allowed models: ${MODEL_IDS.join(", ")}. Allowed efforts: ${EFFORTS.join(", ")} (${MODELS.filter((m) => !m.efforts.length)
    .map((m) => m.label)
    .join(", ")} has no effort setting).`;

/** Throws a plain error when the pair isn't allowed. Undefined/empty values are fine (= not set). */
export function validateModelEffort(model?: string | null, effort?: string | null) {
  if (model && !modelInfo(model)) throw new Error(`Unknown model '${model}'. ${allowedText()}`);
  if (effort && !(EFFORTS as readonly string[]).includes(effort)) throw new Error(`Unknown effort '${effort}'. ${allowedText()}`);
  if (model && effort && !(modelInfo(model)!.efforts as readonly string[]).includes(effort))
    throw new Error(`${modelInfo(model)!.label} does not accept effort '${effort}'. ${allowedText()}`);
}

export const MODEL_GUIDANCE = `Pick the cheapest model/effort that does the job:
- Easy (simple lookups, reformatting, status checks): claude-haiku-5-5 with effort low, or claude-sonnet-5-5 with effort low.
- Normal: claude-sonnet-5-5, medium (the default; leave model/effort out).
- Hard (strategy, code review, multi-step research, complex reasoning): claude-opus-5-5, high or xhigh.
Never choose a Haiku model for anything that drafts to outsiders.`;
