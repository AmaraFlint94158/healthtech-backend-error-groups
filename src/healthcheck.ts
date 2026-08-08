import { infrai } from "./infrai.ts";

type ServiceProbe = { service: string; operation: string; requestId: string };

export async function runHealthcheck(probe: ServiceProbe): Promise<unknown> {
  try {
    throw new Error(`Unable to ${probe.operation} for ${probe.service}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return infrai.errors.capture({
      title: `${probe.service} health check failed`,
      message,
      exception: message,
      level: "error",
      fingerprint: [probe.service, probe.operation],
      context: { request_id: probe.requestId },
      environment: process.env.NODE_ENV ?? "development",
      idempotency_key: `healthcheck:${probe.requestId}`,
    });
  }
}

if (process.argv[1]?.endsWith("healthcheck.ts")) {
  runHealthcheck({ service: "patient-api", operation: "read-profile", requestId: "local-check" })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
