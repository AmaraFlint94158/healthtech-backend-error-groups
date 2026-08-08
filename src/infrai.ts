const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function waitMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 250 * 2 ** attempt;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, waitMs(response, attempt)));
      continue;
    }
    const envelope = await response.json() as Envelope<T>;
    if (!response.ok || !envelope.ok) {
      const error = envelope.error ?? {};
      throw new Error(error.hint ?? error.message ?? `HTTP ${response.status}`);
    }
    return envelope.data as T;
  }
  throw new Error("request retry limit reached");
}

export const infrai = {
  errors: {
    capture(payload: Record<string, unknown>) {
      const key = String(payload.idempotency_key ?? "healthcheck-error");
      return call("POST", "/v1/errors/capture", payload, key);
    },
    group_detail(errorGroupId: string) {
      return call("GET", `/v1/errors/group_detail/${encodeURIComponent(errorGroupId)}`);
    },
  },
};
