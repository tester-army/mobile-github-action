import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTriggerRequest,
  classifyRun,
  computeOverallStatus,
  extractRunIds,
  formatRunFailure,
  formatRunProgress,
  formatRunSuccess,
  mapRunEntry,
  summarizeRuns,
} from "../src/run-tests-lib.ts";

test("classifyRun groups pending, passed, and failed states", () => {
  assert.equal(classifyRun("queued", "unknown"), "pending");
  assert.equal(classifyRun("completed", "passed"), "passed");
  assert.equal(classifyRun("completed", "failed"), "failed");
  assert.equal(classifyRun("failure", "passed"), "failed");
  assert.equal(classifyRun("unknown", "unknown"), "pending");
});

test("buildTriggerRequest omits body when no optional fields are present", () => {
  assert.deepEqual(buildTriggerRequest({ commitSha: "", websiteUrl: "", appId: "" }), {
    headers: {},
  });
});

test("buildTriggerRequest includes all supported fields", () => {
  const request = buildTriggerRequest({
    commitSha: "abc123",
    websiteUrl: "https://example.com",
    appId: "app-42",
  });

  assert.deepEqual(request.headers, { "Content-Type": "application/json" });
  assert.equal(request.body, JSON.stringify({
    commitSha: "abc123",
    targetUrl: "https://example.com",
    mobile: { appId: "app-42" },
  }));
});

test("extractRunIds stringifies webhook run ids", () => {
  assert.deepEqual(extractRunIds({ runIds: ["run-1", 7] }), ["run-1", "7"]);
  assert.deepEqual(extractRunIds({}), []);
});

test("mapRunEntry normalizes payload fields for readable output", () => {
  assert.deepEqual(
    mapRunEntry("f0f0ee80-940d-48ef-a0de-856abea7d0bc", {
      status: "COMPLETED",
      result: "FAILED",
      durationMs: 73000,
      output: {
        featureName: "Checkout flow",
        result: "PASSED",
      },
    }),
    {
      id: "f0f0ee80-940d-48ef-a0de-856abea7d0bc",
      name: "Checkout flow",
      status: "completed",
      result: "passed",
      state: "passed",
      duration: "1m 13s",
    },
  );
});

test("mapRunEntry falls back to a short run label when no name is present", () => {
  assert.deepEqual(
    mapRunEntry("494f1639-0386-4342-ad95-9a2c83a7f061", {}),
    {
      id: "494f1639-0386-4342-ad95-9a2c83a7f061",
      name: "Run 494f1639",
      status: "unknown",
      result: "unknown",
      state: "pending",
      duration: "-",
    },
  );
});

test("computeOverallStatus reflects run states", () => {
  assert.equal(computeOverallStatus([
    {
      id: "1",
      name: "Smoke",
      status: "completed",
      result: "passed",
      state: "passed",
      duration: "4s",
    },
  ]), "passed");

  assert.equal(computeOverallStatus([
    {
      id: "1",
      name: "Smoke",
      status: "running",
      result: "unknown",
      state: "pending",
      duration: "-",
    },
    {
      id: "2",
      name: "Login",
      status: "completed",
      result: "passed",
      state: "passed",
      duration: "10s",
    },
  ]), "running");

  assert.equal(computeOverallStatus([
    {
      id: "1",
      name: "Smoke",
      status: "failed",
      result: "failed",
      state: "failed",
      duration: "9s",
    },
  ]), "failed");
});

test("run summaries and reports use a vitest-like layout", () => {
  const runs = [
    {
      id: "2314d626-3707-4a6b-a6ea-817f58facb77",
      name: "Checkout flow",
      status: "completed",
      result: "failed",
      state: "failed" as const,
      duration: "42s",
    },
    {
      id: "f0f0ee80-940d-48ef-a0de-856abea7d0bc",
      name: "Login flow",
      status: "completed",
      result: "pass",
      state: "passed" as const,
      duration: "15s",
    },
    {
      id: "494f1639-0386-4342-ad95-9a2c83a7f061",
      name: "Deep link flow",
      status: "running",
      result: "unknown",
      state: "pending" as const,
      duration: "-",
    },
  ];

  assert.equal(summarizeRuns(runs), "1 failed | 1 passed | 1 pending | 3 total");
  assert.equal(formatRunProgress(runs), "RUNS  testerarmy  1 failed | 1 passed | 1 pending | 3 total");

  const failureOutput = formatRunFailure(runs);
  assert.match(failureOutput, /^FAIL  TesterArmy/);
  assert.match(failureOutput, /FAIL  testerarmy  Checkout flow > 2314d626 \(42s\)/);
  assert.match(failureOutput, /PASS  testerarmy  Login flow > f0f0ee80 \(15s\)/);
  assert.match(failureOutput, /RUNS  testerarmy  Deep link flow > 494f1639/);
  assert.match(failureOutput, /Runs  1 failed \| 1 passed \| 1 pending \| 3 total/);

  const successOutput = formatRunSuccess(runs);
  assert.match(successOutput, /^PASS  TesterArmy/);
  assert.match(successOutput, /──────────── TesterArmy ────────────/);
});
