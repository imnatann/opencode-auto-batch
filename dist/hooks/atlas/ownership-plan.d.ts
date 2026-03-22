export type OwnershipPlanStatus = {
    exists: boolean;
    hasSection: boolean;
    hasBundles: boolean;
    hasCollisionBoundaries: boolean;
    hasSerialWaves: boolean;
    hasDraftStarts: boolean;
    bundleCount: number;
};
export declare function inspectOwnershipPlan(planPath: string): OwnershipPlanStatus;
export declare function hasUsableOwnershipPlan(status: OwnershipPlanStatus): boolean;
export declare function buildOwnershipPlanReminder(planName: string, status: OwnershipPlanStatus): string;
