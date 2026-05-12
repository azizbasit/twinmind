import { cache } from "@/lib/cache";

export async function rateLimit(key: string, limit: number, windowInSeconds: number): Promise<{ success: boolean; remaining: number }> {
  try {
    const count = cache.get<number>(key) || 0;

    if (count >= limit) {
      return { success: false, remaining: 0 };
    }

    const newCount = cache.incr(key, windowInSeconds * 1000);

    return { success: true, remaining: Math.max(0, limit - newCount) };
  } catch (error) {
    console.error("[RATE_LIMIT_ERROR]", error);
    return { success: true, remaining: limit };
  }
}
