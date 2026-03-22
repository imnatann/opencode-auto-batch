import { createBuiltinAgents } from "../agents";
import { createSisyphusJuniorAgentWithOverrides } from "../agents/sisyphus-junior";
import type { OhMyOpenCodeConfig } from "../config";
import { log, migrateAgentConfig } from "../shared";
import { AGENT_NAME_MAP } from "../shared/migration";
import { getAgentDisplayName } from "../shared/agent-display-names";
import {
  discoverConfigSourceSkills,
  discoverOpencodeGlobalSkills,
  discoverOpencodeProjectSkills,
  discoverProjectClaudeSkills,
  discoverUserClaudeSkills,
} from "../features/opencode-skill-loader";
import { loadProjectAgents, loadUserAgents } from "../features/claude-code-agent-loader";
import type { PluginComponents } from "./plugin-components-loader";
import { reorderAgentsByPriority } from "./agent-priority-order";
import { remapAgentKeysToDisplayNames } from "./agent-key-remapper";
import {
  createProtectedAgentNameSet,
  filterProtectedAgentOverrides,
} from "./agent-override-protection";
import { buildPrometheusAgentConfig } from "./prometheus-agent-config-builder";
import { buildPlanDemoteConfig } from "./plan-model-inheritance";

type AgentConfigRecord = Record<string, Record<string, unknown> | undefined> & {
  build?: Record<string, unknown>;
  plan?: Record<string, unknown>;
};

function appendPrompt(agent: Record<string, unknown> | undefined, text: string | undefined) {
  if (!agent || !text) return agent;
  const current = typeof agent.prompt_append === "string" ? agent.prompt_append : "";
  return {
    ...agent,
    prompt_append: current ? `${current}\n\n${text}` : text,
  };
}

function getConfiguredDefaultAgent(config: Record<string, unknown>): string | undefined {
  const defaultAgent = config.default_agent;
  if (typeof defaultAgent !== "string") return undefined;

  const trimmedDefaultAgent = defaultAgent.trim();
  return trimmedDefaultAgent.length > 0 ? trimmedDefaultAgent : undefined;
}

export async function applyAgentConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  ctx: { directory: string; client?: any };
  pluginComponents: PluginComponents;
}): Promise<Record<string, unknown>> {
  const preset = params.pluginConfig.experimental?.workflow_preset;
  const analytics = params.pluginConfig.experimental?.analytics === true;
  const workspaceBatching = params.pluginConfig.experimental?.workspace_batching === true;
  const presetPrompt = preset === "bugfix"
    ? "Default workflow preset: Bugfix. Prioritize root-cause analysis, minimal safe fixes, and targeted verification before broad refactors."
    : preset === "feature"
      ? "Default workflow preset: Feature. Prioritize implementation planning, ownership bundles, and verification that covers new paths and regressions."
      : preset === "audit"
        ? "Default workflow preset: Audit. Prioritize read-heavy analysis, risk surfacing, and staged recommendations before any write-capable work."
        : preset === "refactor"
          ? "Default workflow preset: Refactor. Prioritize safe decomposition, ownership boundaries, and regression-oriented verification while preserving behavior."
          : undefined;
  const analyticsPrompt = analytics
    ? "Include lightweight execution analytics in major summaries: mention running, queued, completed, stalled, and retried worker counts when they are relevant."
    : undefined;
  const workspacePrompt = workspaceBatching
    ? "Workspace-aware batching is enabled. Treat package roots, app folders, shared configs, lockfiles, schemas, generated outputs, and cross-package tests as collision boundaries when planning ownership bundles."
    : undefined;
  const extraPrompt = [presetPrompt, analyticsPrompt, workspacePrompt].filter(Boolean).join("\n\n") || undefined;
  const migratedDisabledAgents = (params.pluginConfig.disabled_agents ?? []).map(
    (agent) => {
      return AGENT_NAME_MAP[agent.toLowerCase()] ?? AGENT_NAME_MAP[agent] ?? agent;
    },
  ) as typeof params.pluginConfig.disabled_agents;

  const includeClaudeSkillsForAwareness = params.pluginConfig.claude_code?.skills ?? true;
  const [
    discoveredConfigSourceSkills,
    discoveredUserSkills,
    discoveredProjectSkills,
    discoveredOpencodeGlobalSkills,
    discoveredOpencodeProjectSkills,
  ] = await Promise.all([
    discoverConfigSourceSkills({
      config: params.pluginConfig.skills,
      configDir: params.ctx.directory,
    }),
    includeClaudeSkillsForAwareness ? discoverUserClaudeSkills() : Promise.resolve([]),
    includeClaudeSkillsForAwareness
       ? discoverProjectClaudeSkills(params.ctx.directory)
       : Promise.resolve([]),
    discoverOpencodeGlobalSkills(),
    discoverOpencodeProjectSkills(params.ctx.directory),
  ]);

  const allDiscoveredSkills = [
    ...discoveredConfigSourceSkills,
    ...discoveredOpencodeProjectSkills,
    ...discoveredProjectSkills,
    ...discoveredOpencodeGlobalSkills,
    ...discoveredUserSkills,
  ];

  const browserProvider =
    params.pluginConfig.browser_automation_engine?.provider ?? "playwright";
  const currentModel = params.config.model as string | undefined;
  const disabledSkills = new Set<string>(params.pluginConfig.disabled_skills ?? []);
  const useTaskSystem = params.pluginConfig.experimental?.task_system ?? false;
  const disableOmoEnv = params.pluginConfig.experimental?.disable_omo_env ?? false;

  const includeClaudeAgents = params.pluginConfig.claude_code?.agents ?? true;
  const userAgents = includeClaudeAgents ? loadUserAgents() : {};
  const projectAgents = includeClaudeAgents ? loadProjectAgents(params.ctx.directory) : {};
  const rawPluginAgents = params.pluginComponents.agents;

  const pluginAgents = Object.fromEntries(
    Object.entries(rawPluginAgents).map(([key, value]) => [
      key,
      value ? migrateAgentConfig(value as Record<string, unknown>) : value,
    ]),
  );

  const configAgent = params.config.agent as AgentConfigRecord | undefined;

  const customAgentSummaries = [
    ...Object.entries(configAgent ?? {}),
    ...Object.entries(userAgents),
    ...Object.entries(projectAgents),
    ...Object.entries(pluginAgents).filter(([, config]) => config !== undefined),
  ]
    .filter(([, config]) => config != null)
    .map(([name, config]) => ({
      name,
      description: typeof (config as Record<string, unknown>)?.description === "string"
        ? ((config as Record<string, unknown>).description as string)
        : "",
    }));

  const builtinAgents = await createBuiltinAgents(
    migratedDisabledAgents,
    params.pluginConfig.agents,
    params.ctx.directory,
    currentModel,
    params.pluginConfig.categories,
    params.pluginConfig.git_master,
    allDiscoveredSkills,
    customAgentSummaries,
    browserProvider,
    currentModel,
    disabledSkills,
    useTaskSystem,
    disableOmoEnv,
  );

  const disabledAgentNames = new Set(
    (migratedDisabledAgents ?? []).map(a => a.toLowerCase())
  );

  const filterDisabledAgents = (agents: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(agents).filter(([name]) => !disabledAgentNames.has(name.toLowerCase()))
    );

  const isSisyphusEnabled = params.pluginConfig.sisyphus_agent?.disabled !== true;
  const builderEnabled =
    params.pluginConfig.sisyphus_agent?.default_builder_enabled ?? false;
  const plannerEnabled = params.pluginConfig.sisyphus_agent?.planner_enabled ?? true;
  const replacePlan = params.pluginConfig.sisyphus_agent?.replace_plan ?? true;
  const shouldDemotePlan = plannerEnabled && replacePlan;
  const configuredDefaultAgent = getConfiguredDefaultAgent(params.config);

  if (isSisyphusEnabled && builtinAgents.sisyphus) {
    if (configuredDefaultAgent) {
      (params.config as { default_agent?: string }).default_agent =
        getAgentDisplayName(configuredDefaultAgent);
    } else {
      (params.config as { default_agent?: string }).default_agent =
        getAgentDisplayName("sisyphus");
    }

    const agentConfig: Record<string, unknown> = {
      sisyphus: builtinAgents.sisyphus,
    };

    agentConfig["sisyphus-junior"] = createSisyphusJuniorAgentWithOverrides(
      params.pluginConfig.agents?.["sisyphus-junior"],
      (builtinAgents.atlas as { model?: string } | undefined)?.model,
      useTaskSystem,
    );

    if (builderEnabled) {
      const { name: _buildName, ...buildConfigWithoutName } =
        configAgent?.build ?? {};
      const migratedBuildConfig = migrateAgentConfig(
        buildConfigWithoutName as Record<string, unknown>,
      );
      const override = params.pluginConfig.agents?.["OpenCode-Builder"];
      const base = {
        ...migratedBuildConfig,
        description: `${(configAgent?.build?.description as string) ?? "Build agent"} (OpenCode default)`,
      };
      agentConfig["OpenCode-Builder"] = override ? { ...base, ...override } : base;
    }

    if (plannerEnabled) {
      const prometheusOverride = params.pluginConfig.agents?.["prometheus"] as
        | (Record<string, unknown> & { prompt_append?: string })
        | undefined;

      agentConfig["prometheus"] = await buildPrometheusAgentConfig({
        configAgentPlan: configAgent?.plan,
        pluginPrometheusOverride: prometheusOverride,
        userCategories: params.pluginConfig.categories,
        currentModel,
      });
    }

    const filteredConfigAgents = configAgent
      ? Object.fromEntries(
          Object.entries(configAgent)
            .filter(([key]) => {
              if (key === "build") return false;
              if (key === "plan" && shouldDemotePlan) return false;
              if (key in builtinAgents) return false;
              return true;
            })
            .map(([key, value]) => [
              key,
              value ? migrateAgentConfig(value as Record<string, unknown>) : value,
            ]),
        )
      : {};

    const migratedBuild = configAgent?.build
      ? migrateAgentConfig(configAgent.build as Record<string, unknown>)
      : {};

    const planDemoteConfig = shouldDemotePlan
      ? buildPlanDemoteConfig(
          agentConfig["prometheus"] as Record<string, unknown> | undefined,
          params.pluginConfig.agents?.plan as Record<string, unknown> | undefined,
        )
      : undefined;

    const protectedBuiltinAgentNames = createProtectedAgentNameSet([
      ...Object.keys(agentConfig),
      ...Object.keys(builtinAgents),
    ]);
    const filteredUserAgents = filterProtectedAgentOverrides(
      userAgents,
      protectedBuiltinAgentNames,
    );
    const filteredProjectAgents = filterProtectedAgentOverrides(
      projectAgents,
      protectedBuiltinAgentNames,
    );
    const filteredPluginAgents = filterProtectedAgentOverrides(
      pluginAgents,
      protectedBuiltinAgentNames,
    );

    params.config.agent = {
      ...agentConfig,
      ...Object.fromEntries(
        Object.entries(builtinAgents).filter(([key]) => key !== "sisyphus"),
      ),
      ...filterDisabledAgents(filteredUserAgents),
      ...filterDisabledAgents(filteredProjectAgents),
      ...filterDisabledAgents(filteredPluginAgents),
      ...filteredConfigAgents,
      build: { ...migratedBuild, mode: "subagent", hidden: true },
      ...(planDemoteConfig ? { plan: planDemoteConfig } : {}),
    };
  } else {
    const protectedBuiltinAgentNames = createProtectedAgentNameSet(
      Object.keys(builtinAgents),
    );
    const filteredUserAgents = filterProtectedAgentOverrides(
      userAgents,
      protectedBuiltinAgentNames,
    );
    const filteredProjectAgents = filterProtectedAgentOverrides(
      projectAgents,
      protectedBuiltinAgentNames,
    );
    const filteredPluginAgents = filterProtectedAgentOverrides(
      pluginAgents,
      protectedBuiltinAgentNames,
    );

    params.config.agent = {
      ...builtinAgents,
      ...filterDisabledAgents(filteredUserAgents),
      ...filterDisabledAgents(filteredProjectAgents),
      ...filterDisabledAgents(filteredPluginAgents),
      ...configAgent,
    };
  }

  if (params.config.agent) {
    if (extraPrompt) {
      const agentConfig = params.config.agent as AgentConfigRecord;
      for (const name of ["sisyphus", "atlas", "prometheus", "OpenCode-Builder", "build", "plan"]) {
        const current = agentConfig[name];
        if (!current || typeof current !== "object") continue;
        agentConfig[name] = appendPrompt(current as Record<string, unknown>, extraPrompt);
      }
    }
    params.config.agent = remapAgentKeysToDisplayNames(
      params.config.agent as Record<string, unknown>,
    );
    params.config.agent = reorderAgentsByPriority(
      params.config.agent as Record<string, unknown>,
    );
  }

  const agentResult = params.config.agent as Record<string, unknown>;
  log("[config-handler] agents loaded", { agentKeys: Object.keys(agentResult) });
  return agentResult;
}
