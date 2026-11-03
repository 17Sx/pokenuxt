/**
 * A small in-memory cache: entries expire after `ttl` milliseconds, and the
 * oldest entry goes once there are more than `max`. Each server instance has
 * its own; the CDN cache in front of the API is what most requests hit.
 */
export function createCache<T>({ ttl, max }: { ttl: number; max: number }) {
  const entries = new Map<string, { value: T; expires: number }>()

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expires < Date.now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T) {
      entries.delete(key)
      entries.set(key, { value, expires: Date.now() + ttl })
      if (entries.size > max) entries.delete(entries.keys().next().value!)
    },
  }
}
