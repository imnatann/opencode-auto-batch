# OpenCode Problem Findings Draft

Last updated: 2026-03-22

This is a research draft of real user pain around OpenCode and adjacent plugin ecosystems.

Scope:
- OpenCode core issues
- OpenCode plugin/auth/config friction
- adjacent ecosystem pain that maps to OpenCode-like workflows

Important:
- this document is intentionally problem-only
- it does not propose solutions yet

## Highest-Signal Problem Areas

### 1. Auth and provider flows fail in non-obvious ways

Recurring pattern:
- users think a provider is configured correctly, but OAuth, callback, token exchange, provider headers, or model routing still fail
- failure modes are inconsistent across providers and plugins

Representative evidence:
- Anthropic OAuth callback invalid code failures: `https://github.com/anomalyco/opencode/issues/18362`
- OpenCode Zen auth via GitHub failure: `https://github.com/anomalyco/opencode/issues/2400`
- OpenCode-compatible provider/plugin auth mismatch and silent ignore behavior: `https://github.com/anomalyco/opencode/issues/16225`
- Background `explore`/`librarian` auth/model failure while `oracle` succeeds: `https://github.com/code-yeongyu/oh-my-openagent/issues/2731`
- Continue gateway/header auth mismatch: `https://github.com/continuedev/continue/issues/9527`
- Azure-hosted Anthropic header mismatch in Continue: `https://github.com/continuedev/continue/issues/11513`

Observed user impact:
- onboarding breaks
- provider trust drops fast
- advanced setups become brittle

Signal strength: very high

### 2. Background tasks and subagents are unreliable under real use

Recurring pattern:
- subagents launch, but do not inherit the right tools, state, or permissions
- tasks can finish too early, hang forever, or return empty output
- orchestration becomes fragile once workflows get parallel or multi-step

Representative evidence:
- Subagent identity swaps after first tool call: `https://github.com/anomalyco/opencode/issues/18404`
- Subagents cannot execute MCP tools despite seeing them: `https://github.com/anomalyco/opencode/issues/16491`
- `opencode run` exits before background work is collected: `https://github.com/anomalyco/opencode/issues/16380`
- Background tasks finish immediately with no output in OMO: `https://github.com/code-yeongyu/oh-my-opencode/issues/480`
- Background tasks stuck eternally running in OMO: `https://github.com/code-yeongyu/oh-my-openagent/issues/1769`
- High-concurrency subagent hangs: `https://github.com/anomalyco/opencode/issues/18378`
- Cline MCP reconnect leaves stale tool session state: `https://github.com/cline/cline/issues/9822`
- LangGraph parallel routing/checkpoint edge failures: `https://github.com/langchain-ai/langgraph/issues/6789`

Observed user impact:
- users cannot trust delegated work
- multi-agent workflows need babysitting
- background execution looks powerful but feels unsafe

Signal strength: very high

### 3. Stability, performance, and memory behavior are a repeated complaint cluster

Recurring pattern:
- TUI freezes
- web/desktop becomes unresponsive in long sessions
- memory use grows abnormally
- responsiveness degrades after updates or under medium-sized repos

Representative evidence:
- Random TUI freeze/hang: `https://github.com/anomalyco/opencode/issues/12834`
- `opencode web` unresponsive with 7GB+ memory growth: `https://github.com/anomalyco/opencode/issues/17628`
- Very large OOM after desktop/client lifecycle: `https://github.com/anomalyco/opencode/issues/17908`
- Linux desktop startup takes minutes: `https://github.com/anomalyco/opencode/issues/18117`
- Reddit memory leak thread: `https://www.reddit.com/r/opencodeCLI/comments/1qgnad6/fix_memory_leak_please/`
- Reddit RAM blow-up thread: `https://www.reddit.com/r/opencodeCLI/comments/1r7015z/anyone_else_struggling_with_opencode_gobbling_up/`
- Reddit slowness complaint: `https://www.reddit.com/r/opencodeCLI/comments/1r1vcgr/opencode_is_sooooooooooooooooo_slow/`

Observed user impact:
- long sessions feel risky
- desktop/web trust degrades
- heavy users become the most frustrated users

Signal strength: very high

### 4. Config, permissions, and plugin lifecycle are confusing and sometimes unsafe

Recurring pattern:
- invalid config can break launch without a helpful explanation
- plugin/config files can be deleted or ignored
- permissions appear to apply inconsistently
- plugin-specific config and core config are hard to reason about together

Representative evidence:
- Invalid permission format causes launch failure: `https://github.com/anomalyco/opencode/issues/7810`
- Plugin config files deleted when multiple instances run concurrently: `https://github.com/anomalyco/opencode/issues/16450`
- Permissions ignored: `https://github.com/anomalyco/opencode/issues/16331`
- Auto-migration deletes model overrides in OMO: `https://github.com/code-yeongyu/oh-my-openagent/issues/632`
- Agent tools/permissions override mismatch in OMO: `https://github.com/code-yeongyu/oh-my-openagent/issues/723`
- Conductor + OMO config collision: `https://github.com/derekbar90/opencode-conductor/issues/3`

Observed user impact:
- users do not know which config is source of truth
- trust in permission model drops
- multi-plugin setups become fragile

Signal strength: high

### 5. Agent discovery, registration, and routing visibility are still weak

Recurring pattern:
- agents exist but do not appear where users expect
- selected/routed agent can change unexpectedly
- users often cannot tell which path the system is taking

Representative evidence:
- Plugin agents not appearing in `opencode agent list`: `https://github.com/code-yeongyu/oh-my-openagent/issues/1320`
- Plan-mode / response visibility issue: `https://github.com/anomalyco/opencode/issues/17107`
- Default plan mode request because users fear accidental writes: `https://github.com/anomalyco/opencode/issues/9296`

Observed user impact:
- discoverability pain
- lower confidence in agent orchestration
- harder debugging when behavior changes mid-run

Signal strength: medium-high

### 6. Tool-calling interoperability is still a major breakage zone

Recurring pattern:
- OpenAI-compatible endpoints do not always behave like OpenAI-native tool APIs
- tool execution failure often degrades into loops, hallucinated completion, or broken XML/raw tool output

Representative evidence:
- Continue discussion on tool-calling mismatch with OpenAI-compatible endpoints: `https://github.com/continuedev/continue/discussions/8557`
- Cline raw tool-call / looping / hallucinated completion: `https://github.com/cline/cline/issues/9848`
- Continue release notes repeatedly patch tool/stream handling: `https://github.com/continuedev/continue/releases`
- Cline release notes repeatedly patch MCP reconnect and parallel tool calling: `https://github.com/cline/cline/releases`

Observed user impact:
- model/provider compatibility looks broader than it really is
- advanced users discover failure only after investing setup time

Signal strength: high

### 7. Install, update, and release trust is weaker than it should be

Recurring pattern:
- updates say they worked when they did not
- install paths differ by environment
- users are not sure which binary/plugin version is actually active

Representative evidence:
- install/update/release failures and misleading success states across OpenCode issues: `https://github.com/anomalyco/opencode/issues/6640`, `https://github.com/anomalyco/opencode/issues/8422`, `https://github.com/anomalyco/opencode/issues/5618`, `https://github.com/anomalyco/opencode/issues/9630`

Observed user impact:
- users stop trusting automation around upgrades
- repro quality gets worse because runtime state is ambiguous

Signal strength: medium-high

### 8. Trust, privacy, and “local means local” expectations are not always met

Recurring pattern:
- users expect local workflows, local privacy, and strict permission boundaries
- when behavior differs from that expectation, frustration is sharp

Representative evidence:
- Reddit concern that Web UI is not truly local: `https://www.reddit.com/r/LocalLLaMA/comments/1s5i0m9/opencode_concerns_not_truely_local/`
- Reddit privacy policy concern: `https://www.reddit.com/r/opencodeCLI/comments/1qv6x8p/opencode_privacy_policy_is_concerning/`
- Reddit security concern around arbitrary code execution expectations: `https://www.reddit.com/r/LocalLLaMA/comments/1iv4n3l/opencode_arbitrary_code_execution_major_security/`

Observed user impact:
- trust damage is disproportionate when expectations are violated
- privacy/security messaging matters as much as mechanics

Signal strength: medium

## Strong Cross-Cutting Themes

Across sources, the same meta-problems keep appearing:

- interoperability drift between providers, plugins, and tool protocols
- orchestration is impressive in demos but brittle at the edges
- config and permission systems are too hard to debug
- async/background work lacks trustworthy observability
- advanced users hit the worst pain because they combine more features

## Source Mix Used

Primary sources:
- OpenCode GitHub issues
- plugin ecosystem GitHub issues
- adjacent agent-tool issues and release notes

Secondary sources:
- Reddit
- Stack Overflow
- AnswerOverflow / Discord mirrors

## Notes For Next Pass

Possible next research slices:
- auth/provider failures only
- background task / subagent reliability only
- config and permission UX only
- opportunities solvable by plugin vs OpenCode core
