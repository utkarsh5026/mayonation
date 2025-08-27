import { AnimationValue } from "@/core";

export interface PropertyCacheEntry {
  value: AnimationValue;
  isDirty: boolean;
  lastUpdated: number;
  hasTransformChanges: boolean;
}

/**
 * Handles property state caching, invalidation, and lifecycle
 * Single responsibility: Cache management
 */
export class PropertyCache {
  private cache = new Map<string, PropertyCacheEntry>();

  get(property: string): PropertyCacheEntry | null {
    return this.cache.get(property) || null;
  }

  set(
    property: string,
    value: AnimationValue,
    hasTransformChanges = false
  ): void {
    this.cache.set(property, {
      value,
      isDirty: false,
      lastUpdated: performance.now(),
      hasTransformChanges,
    });
  }

  invalidate(property: string): void {
    const entry = this.cache.get(property);
    if (entry) {
      entry.isDirty = true;
    }
  }

  clear(): void {
    console.log("🧹 Clearing property cache");
    this.cache.clear();
  }

  getAll(): Map<string, PropertyCacheEntry> {
    return new Map(this.cache);
  }

  has(property: string): boolean {
    return this.cache.has(property);
  }

  isValid(property: string): boolean {
    const entry = this.cache.get(property);
    return entry ? !entry.isDirty : false;
  }
}
