import { DiscordAPIError } from "./errors.js";
import { RateLimiter, type RateLimiterOptions } from "./rate-limiter.js";

export interface RESTClientOptions {
  token: string;
  version?: number;
  userAgent?: string;
  retries?: number;
  retryDelay?: number;
  rateLimiter?: RateLimiterOptions;
}

const DEFAULT_API_VERSION = 10;
const DEFAULT_USER_AGENT = "DiscordBot (https://dbun.dev, 0.1.0)";
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export class RESTClient {
  readonly token: string;
  private version: number;
  private userAgent: string;
  private maxRetries: number;
  private baseRetryDelay: number;
  private rateLimiter: RateLimiter;
  private baseUrl: string;

  constructor(options: RESTClientOptions) {
    this.token = options.token;
    this.version = options.version ?? DEFAULT_API_VERSION;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.maxRetries = options.retries ?? DEFAULT_RETRIES;
    this.baseRetryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
    this.rateLimiter = new RateLimiter(options.rateLimiter);
    this.baseUrl = `https://discord.com/api/v${this.version}`;

    this.validateToken();
  }

  private validateToken(): void {
    if (!this.token || this.token.trim().length === 0) {
      throw new Error("Token cannot be empty");
    }
    if (this.token.includes(" ")) {
      throw new Error(
        "Token contains whitespace — did you include the 'Bot ' prefix? Pass only the raw token.",
      );
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  async postFile<T>(
    path: string,
    file: { name: string; data: Buffer | Uint8Array },
    body?: Record<string, unknown>,
  ): Promise<T> {
    const formData = new FormData();
    formData.append(
      "files[0]",
      new Blob([file.data], { type: "application/octet-stream" }),
      file.name,
    );
    if (body) {
      formData.append("payload_json", JSON.stringify(body));
    }
    return this.request<T>("POST", path, formData);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: DiscordAPIError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = this.baseRetryDelay * 2 ** (attempt - 1);
        const jitter = Math.random() * backoff * 0.1;
        await Bun.sleep(backoff + jitter);
      }

      await this.rateLimiter.acquire(path);

      const url = `${this.baseUrl}${path}`;
      const headers: Record<string, string> = {
        Authorization: `Bot ${this.token}`,
        "User-Agent": this.userAgent,
      };

      const isFormData = body instanceof FormData;
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        lastError = new DiscordAPIError(0, {
          message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        });
        if (attempt < this.maxRetries) continue;
        throw lastError;
      }

      this.updateRateLimits(path, response);

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        return response.json() as Promise<T>;
      }

      const errorBody = await response.json().catch(() => ({}));
      lastError = new DiscordAPIError(response.status, errorBody, response.headers);

      if (lastError.isRateLimited) {
        this.rateLimiter.handle429(errorBody as { retry_after?: number; global?: boolean });
        const retryAfterMs = (lastError.retryAfter ?? 1) * 1000;

        if (lastError.scope !== "shared" && attempt < this.maxRetries) {
          await Bun.sleep(retryAfterMs);
          continue;
        }
      }

      if (lastError.status === 401) {
        throw lastError;
      }

      if (lastError.isClientError) {
        throw lastError;
      }

      if (lastError.isServerError && attempt < this.maxRetries) {
        continue;
      }
    }

    throw lastError!;
  }

  private updateRateLimits(path: string, response: Response): void {
    this.rateLimiter.update(path, {
      limit: response.headers.get("X-RateLimit-Limit"),
      remaining: response.headers.get("X-RateLimit-Remaining"),
      reset: response.headers.get("X-RateLimit-Reset"),
      resetAfter: response.headers.get("X-RateLimit-Reset-After"),
      bucket: response.headers.get("X-RateLimit-Bucket"),
      global: response.headers.get("X-RateLimit-Global"),
      scope: response.headers.get("X-RateLimit-Scope"),
    });
  }
}
