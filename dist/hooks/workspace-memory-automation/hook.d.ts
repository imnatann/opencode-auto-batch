import type { PluginInput } from "@opencode-ai/plugin";
import type { SkillMcpManager } from "../../features/skill-mcp-manager";
type HookInput = {
    tool: string;
    sessionID: string;
    callID: string;
    args?: Record<string, unknown>;
};
type HookOutput = {
    args: Record<string, unknown>;
};
type ToolOutput = {
    title: string;
    output: string;
    metadata: Record<string, unknown>;
};
export declare function createWorkspaceMemoryAutomationHook(ctx: PluginInput, manager: SkillMcpManager): {
    "chat.message": (input: {
        sessionID: string;
    }, output: {
        parts: Array<{
            type?: string;
            text?: string;
        }>;
    }) => Promise<void>;
    "tool.execute.before": (input: HookInput, output: HookOutput) => Promise<void>;
    "tool.execute.after": (input: HookInput, output: ToolOutput) => Promise<void>;
    event: (input: {
        event: {
            type: string;
            properties?: Record<string, unknown>;
        };
    }) => Promise<void>;
};
export {};
