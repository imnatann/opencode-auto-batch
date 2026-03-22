interface ModelMetadata {
    id: string;
    provider?: string;
    context?: number;
    output?: number;
    name?: string;
}
interface ProviderModelsCache {
    models: Record<string, string[] | ModelMetadata[]>;
    connected: string[];
    updatedAt: string;
}
export declare function createConnectedProvidersCacheStore(getCacheDir?: () => string): {
    readConnectedProvidersCache: () => string[] | null;
    hasConnectedProvidersCache: () => boolean;
    readProviderModelsCache: () => ProviderModelsCache | null;
    hasProviderModelsCache: () => boolean;
    writeProviderModelsCache: (data: {
        models: Record<string, string[]>;
        connected: string[];
    }) => void;
    updateConnectedProvidersCache: (client: {
        provider?: {
            list?: () => Promise<{
                data?: {
                    connected?: string[];
                    all?: Array<{
                        id: string;
                        models?: Record<string, unknown>;
                    }>;
                };
            }>;
        };
    }) => Promise<void>;
};
export declare const readConnectedProvidersCache: () => string[] | null, hasConnectedProvidersCache: () => boolean, readProviderModelsCache: () => ProviderModelsCache | null, hasProviderModelsCache: () => boolean, writeProviderModelsCache: (data: {
    models: Record<string, string[]>;
    connected: string[];
}) => void, updateConnectedProvidersCache: (client: {
    provider?: {
        list?: () => Promise<{
            data?: {
                connected?: string[];
                all?: Array<{
                    id: string;
                    models?: Record<string, unknown>;
                }>;
            };
        }>;
    };
}) => Promise<void>;
export {};
