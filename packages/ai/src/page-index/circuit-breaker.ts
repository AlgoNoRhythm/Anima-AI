export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open — LLM provider temporarily unavailable') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private lastFailureTime = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 30_000,
    private readonly windowMs = 60_000,
  ) {}

  /**
   * Check if a request is allowed. Throws CircuitOpenError if the circuit is open.
   */
  canExecute(): boolean {
    this.pruneOldFailures();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if enough time has passed to allow a probe
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      throw new CircuitOpenError();
    }

    // HALF_OPEN — allow one probe request
    return true;
  }

  /**
   * Record a successful call. Resets the circuit to CLOSED.
   */
  recordSuccess(): void {
    this.state = 'CLOSED';
    this.failures = [];
  }

  /**
   * Record a failed call. May trip the circuit to OPEN.
   */
  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    this.pruneOldFailures();

    if (this.state === 'HALF_OPEN') {
      // Probe failed — reopen
      this.state = 'OPEN';
      return;
    }

    if (this.failures.length >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /** Visible for testing. */
  getState(): CircuitState {
    return this.state;
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.windowMs;
    this.failures = this.failures.filter((t) => t > cutoff);
  }
}

/** Per-process singleton for LLM calls. */
export const llmCircuitBreaker = new CircuitBreaker();
