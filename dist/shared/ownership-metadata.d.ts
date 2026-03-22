export interface OwnershipMetadata {
    ownershipBundle?: string;
    ownershipResources?: string[];
    writeCapable?: boolean;
    serialWave?: number;
    draftStart?: boolean;
}
export declare function extractOwnershipMetadata(prompt: string): OwnershipMetadata;
export declare function resolveOwnershipKeys(input: OwnershipMetadata & {
    parentSessionID: string;
}): string[];
