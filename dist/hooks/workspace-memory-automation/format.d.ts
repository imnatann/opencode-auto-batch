type Resume = {
    latestSession?: {
        summary?: string | null;
        goal?: string | null;
        nextStep?: string | null;
    } | null;
    activeConstraints?: Array<{
        kind?: string;
        content?: string;
    }>;
    recentDecisions?: Array<{
        title?: string;
        status?: string;
    }>;
    recentPatchFailures?: Array<{
        path?: string;
        failureType?: string;
    }>;
    recentExecutionFailures?: Array<{
        command?: string;
        status?: string;
    }>;
};
type Handoff = {
    summary?: string | null;
};
type Msg = {
    info?: {
        id?: string;
        role?: string;
    };
    parts?: Array<{
        type?: string;
        text?: string;
        tool?: string;
        state?: Record<string, unknown>;
    }>;
};
export declare function formatResumeContext(resume: Resume | null, handoff: Handoff | null): string;
export declare function buildIdleSummary(msgs: Msg[]): {
    key: string | null;
    summary: string;
    next: string;
};
export {};
