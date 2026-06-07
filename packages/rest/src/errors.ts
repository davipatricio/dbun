export class DiscordAPIError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly errors?: unknown;
  readonly retryAfter?: number;
  readonly isGlobal: boolean;
  readonly scope?: string;

  constructor(status: number, body: unknown, headers?: Headers) {
    const errorBody = body as {
      message?: string;
      code?: number;
      errors?: unknown;
      retry_after?: number;
      global?: boolean;
    };
    super(errorBody?.message ?? `Discord API Error: ${status}`);
    this.name = "DiscordAPIError";
    this.status = status;
    this.code = errorBody?.code;
    this.errors = errorBody?.errors;
    this.retryAfter = errorBody?.retry_after;
    this.isGlobal = errorBody?.global ?? false;
    this.scope = headers?.get("X-RateLimit-Scope") ?? undefined;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isRetryable(): boolean {
    return this.isRateLimited || this.isServerError;
  }
}
