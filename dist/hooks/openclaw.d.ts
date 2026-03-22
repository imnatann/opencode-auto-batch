import type { PluginContext } from "../plugin/types";
import type { OhMyOpenCodeConfig } from "../config";
export declare function createOpenClawHook(ctx: PluginContext, pluginConfig: OhMyOpenCodeConfig): {
    event: (input: any) => Promise<void>;
    "tool.execute.before": (input: {
        tool: string;
        sessionID: string;
    }, output: {
        args: Record<string, unknown>;
    }) => Promise<void>;
} | null;
