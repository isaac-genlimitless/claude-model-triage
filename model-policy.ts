import { z } from "zod";

// Configurable source of truth for which model and effort an agent run uses.
// Precedence: explicit override > agent default > trigger/role rules > global default.

export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

export type ModelTier = "cheap" | "standard" | "strong";

export const MODELS = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5", tier: "cheap" as ModelTier, efforts: [] as readonly Effort[] },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", tier: "standard" as ModelTier, efforts: EFFORTS as readonly Effort[] },
  { id: "claude-opus-5-5", label: "Opus 5.5", tier: "strong" as ModelTier, efforts: EFFORTS as readonly Effort[] },
  { id: "claude-fable-5-1", label: "Fable 5.1", tier: "standard" as ModelTier, efforts: EFFORTS as readonly Effort[] },
] as const;

export const MODEL_IDS = MODELS.map((m) => m.id) as unknown as [string, ...string[]];
export const modelIdSchema = z.enum(MODEL_IDS as unknown as ["claude-haiku-4-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]);
export const effortSchema = z.enum(EFFORTS);

export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const CHEAP_MODEL = "claude-haiku-4-5";

/** Configuration for which triggers/roles map to cheaper models, lower effort, or outsider-drafting restrictions. */
export interface ModelPolicyConfig {
  /** Triggers that should use the cheap (Haiku) model. Default: ["event_prep"] */
  cheapTriggers?: string[];
  /** Triggers that should use low effort. Default: ["inbound_texts"] */
  lowEffortTriggers?: string[];
  /** Agent slugs or triggers that draft to outsiders (Haiku is refused for these). Default: ["inbound_email", "inbound_texts", "inbound_sweep"] */
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

export function createPolicy(config: ModelPolicyConfig = {}) {
  const cfg: Required<ModelPolicyConfig> = {
    cheapTriggers: config.cheapTriggers ?? DEFAULT_CONFIG.cheapTriggers,
    lowEffortTriggers: config.lowEffortTriggers ?? DEFAULT_CONFIG.lowEffortTriggers,
    outsiderDrafting: config.outsiderDrafting ?? DEFAULT_CONFIG.outsiderDrafting,
    highEffortSlugs: config.highEffortSlugs ?? DEFAULT_CONFIG.highEffortSlugs,
    highEffortTriggers: config.highEffortTriggers ?? DEFAULT_CONFIG.highEffortTriggers,
  };

  const cheapTriggers = new Set(cfg.cheapTriggers);
  const lowEffortTriggers = new Set(cfg.lowEffortTriggers);
  const outsiderDrafting = new Set(cfg.outsiderDrafting);
  const highEffortSlugs = new Set(cfg.highEffortSlugs);
  const highEffortTriggers = new Set(cfg.highEffortTriggers);

  const modelFor = (trigger: string) => (cheapTriggers.has(trigger) ? CHEAP_MODEL : DEFAULT_MODEL);

  function effortFor(trigger: string, slug: string): Effort {
    if (lowEffortTriggers.has(trigger)) return "low";
    if (highEffortSlugs.has(slug) || highEffortTriggers.has(trigger)) return "high";
    return "medium";
  }

  function assertModelAllowed(model: string, slug: string, trigger: string) {
    if (model === CHEAP_MODEL && (outsiderDrafting.has(slug) || outsiderDrafting.has(trigger)))
      throw new Error(
        `Haiku is refused for '${slug}' (${trigger}): it drafts to outsiders. Use a stronger model.`
      );
  }

  function resolveModelEffort(a: {
    override?: { model?: string | null; effort?: string | null };
    agentDefault?: { model?: string | null; effort?: string | null };
    trigger: string;
    slug: string;
  }): { model: string; effort?: Effort } {
    const o = a.override || {};
    const d = a.agentDefault || {};
    const explicit = o.model || d.model;
    const model = explicit || modelFor(a.trigger);
    if (explicit) assertModelAllowed(model, a.slug, a.trigger);
    if (!supportsEffort(model)) return { model };
    const effort = (o.effort || d.effort || effortFor(a.trigger, a.slug)) as Effort;
    return { model, effort };
  }

  return {
    config: cfg,
    modelFor,
    effortFor,
    assertModelAllowed,
    resolveModelEffort,
  };
}

// Default policy (matches original hardcoded behavior)
export const defaultPolicy = createPolicy();
export const { resolveModelEffort, effortFor, modelFor, assertModelAllowed } = defaultPolicy;

export const modelInfo = (id: string) => MODELS.find((m) => m.id === id);
export const supportsEffort = (id: string) => (modelInfo(id)?.efforts.length ?? 0) > 0;

const allowedText = () =>
  `Allowed models: ${MODELS.map((m) => m.id).join(", ")}. Allowed efforts: ${EFFORTS.join(", ")} (${MODELS.filter((m) => !m.efforts.length).map((m) => m.label).join(", ")} has no effort setting).`;

/** Throws a plain error when the pair isn't allowed. Undefined values are fine (= not set). */
export function validateModelEffort(model?: string | null, effort?: string | null) {
  if (model != null && model !== "" && !modelInfo(model)) throw new Error(`Unknown model '${model}'. ${allowedText()}`);
  if (effort != null && effort !== "" && !(EFFORTS as readonly string[]).includes(effort)) throw new Error(`Unknown effort '${effort}'. ${allowedText()}`);
  if (model && effort && !supportsEffort(model)) throw new Error(`${modelInfo(model)!.label} has no effort setting; leave effort empty. ${allowedText()}`);
}

export const MODEL_GUIDANCE = `Pick the cheapest model/effort that does the job:
- Easy (simple lookups, reformatting, status checks): claude-haiku-4-5 (no effort), or claude-sonnet-5-5 with effort low.
- Normal: claude-sonnet-5-5, medium (the default; leave model/effort out).
- Hard (strategy, code review, multi-step research, complex reasoning): claude-opus-5-5, high.
Never choose Haiku for anything that drafts to outsiders.`;
