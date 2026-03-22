export class OwnershipManager {
  private claims = new Map<string, string>()

  acquire(taskId: string, keys: string[]): boolean {
    for (const key of keys) {
      const owner = this.claims.get(key)
      if (owner && owner !== taskId) return false
    }
    for (const key of keys) {
      this.claims.set(key, taskId)
    }
    return true
  }

  release(taskId: string, keys: string[] | undefined): void {
    for (const key of keys ?? []) {
      if (this.claims.get(key) === taskId) {
        this.claims.delete(key)
      }
    }
  }

  owner(key: string): string | undefined {
    return this.claims.get(key)
  }
}
