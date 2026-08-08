import assert from "node:assert/strict";
import test from "node:test";

function groupKey(service: string, operation: string): string[] {
  return [service, operation];
}

test("the same backend operation produces the same grouping fingerprint", () => {
  assert.deepEqual(groupKey("patient-api", "read-profile"), ["patient-api", "read-profile"]);
  assert.deepEqual(groupKey("patient-api", "read-profile"), groupKey("patient-api", "read-profile"));
  assert.notDeepEqual(groupKey("patient-api", "read-profile"), groupKey("billing-api", "charge"));
});
