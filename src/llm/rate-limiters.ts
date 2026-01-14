import { logRateLimit } from "../logger/enhanced-logger";

export class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute: number;
  private readonly windowMs: number = 60000; // 1 minute

  constructor(maxRequestsPerMinute: number = 5) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    logRateLimit("CHECK", {
      initialized: true,
      maxRPM: maxRequestsPerMinute,
      windowMs: this.windowMs,
    });
  }

  async acquireSlot(): Promise<void> {
    const now = Date.now();
    
    logRateLimit("CHECK", {
      currentTime: now,
      activeRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequestsPerMinute,
    });

    // Remove timestamps older than the window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    logRateLimit("CHECK", {
      afterCleanup: true,
      activeRequestsAfterCleanup: this.requestTimestamps.length,
    });

    // If we're at the limit, wait
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp) + 100; // +100ms buffer

      logRateLimit("WAIT", {
        reason: "Rate limit reached",
        activeRequests: this.requestTimestamps.length,
        maxRequests: this.maxRequestsPerMinute,
        oldestRequestAt: oldestTimestamp,
        waitTimeMs: waitTime,
        willResumeAt: now + waitTime,
      });

      await this.sleep(waitTime);

      // Recursive call to check again after waiting
      return this.acquireSlot();
    }

    // Add current timestamp and proceed
    this.requestTimestamps.push(now);
    
    logRateLimit("PROCEED", {
      slotAcquired: true,
      activeRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequestsPerMinute,
      timestamp: now,
      remainingSlots: this.maxRequestsPerMinute - this.requestTimestamps.length,
    });
  }

  private sleep(ms: number): Promise<void> {
    logRateLimit("WAIT", {
      sleeping: true,
      durationMs: ms,
      willWakeAt: Date.now() + ms,
    });
    
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    const now = Date.now();
    const activeRequests = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    return {
      activeRequests: activeRequests.length,
      maxRequests: this.maxRequestsPerMinute,
      remainingSlots: this.maxRequestsPerMinute - activeRequests.length,
      windowMs: this.windowMs,
    };
  }
}