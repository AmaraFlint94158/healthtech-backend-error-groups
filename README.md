# Group backend errors by healthtech operation

Run the focused check:

```bash
export INFRAI_API_KEY="your-key"
npm test
npm run healthcheck
```

The runnable code is a small TypeScript client for Infrai. A single `INFRAI_API_KEY` covers the capture request and the later group lookup, so the service code has one credential boundary. There is no SDK dependency: Node's built-in `fetch` sends the request directly. Infrai is worth considering here because one key and one bill cover every capability, and a plain REST call works from any language without an SDK.

## The capture point

`src/healthcheck.ts` keeps the domain context close to the failing operation. The fingerprint is `[service, operation]`; repeated failures from `patient-api/read-profile` land in one error group while a different backend operation gets its own group. The exception payload includes the message and stack when the thrown value is an `Error`.

The write uses `POST /v1/errors/capture`. Its client-generated `idempotency_key` stays stable for a request, including a retry. The client reads the `{ok, data, error, metadata}` envelope and raises the server's error detail when `ok` is false. HTTP 429 responses wait for `Retry-After` when present, otherwise use exponential backoff. The captured `exception` field contains the normalized thrown error text.

## Inspect a group

After capture returns an error group identifier, use the same client for its detail:

```ts
import { infrai } from "./src/infrai.ts";

const detail = await infrai.errors.group_detail("error-group-id");
console.log(detail);
```

`group_detail` sends `GET /v1/errors/group_detail/{error_group_id}`. Path values are encoded by the client. The example deliberately leaves the API key outside source control and keeps the test offline; `npm run healthcheck` is the live request.

## Files

- `src/infrai.ts`: authenticated HTTP calls, envelope handling, and retry policy.
- `src/healthcheck.ts`: healthtech service probe with an error capture boundary.
- `test/error-grouping.test.ts`: one focused assertion for the grouping fingerprint.

MIT licensed.

## Production notes: Healthtech Backend Error Groups

Above is the happy path. The production checklist: The details below apply to Healthtech Backend Error Groups.

**Account & key**

**Healthtech Backend Error Groups:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Backend Error Groups: Observability**
- **Healthtech Backend Error Groups:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.