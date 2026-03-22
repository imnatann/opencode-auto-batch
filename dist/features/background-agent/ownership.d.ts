export declare class OwnershipManager {
    private claims;
    acquire(taskId: string, keys: string[]): boolean;
    release(taskId: string, keys: string[] | undefined): void;
    owner(key: string): string | undefined;
}
