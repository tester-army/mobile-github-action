import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTriggerRequest,
  classifyRun,
  computeOverallStatus,
  extractRunIds,
  formatRunFailure,
  mapRunEntry,
} from "../src/run-tests-lib.ts";

test("classifyRun groups pending, passed, and failed states", () => {
  assert.equal(classifyRun("queued", "unknown"), "pending");
  assert.equal(classifyRun("completed", "passed"), "passed");
  assert.equal(classifyRun("completed", "failed"), "failed");
  assert.equal(classifyRun("failure", "passed"), "failed");
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

test("mapRunEntry normalizes payload fields", () => {
  assert.deepEqual(
    mapRunEntry("run-1", {
      status: "COMPLETED",
      result: "FAILED",
      output: {
        result: "PASSED",
      },
    }),
    {
      id: "run-1",
      status: "completed",
      result: "passed",
      state: "passed",
    },
  );
});

test("computeOverallStatus reflects run states", () => {
  assert.equal(computeOverallStatus([
    { id: "1", status: "completed", result: "passed", state: "passed" },
  ]), "passed");

  assert.equal(computeOverallStatus([
    { id: "1", status: "running", result: "unknown", state: "pending" },
    { id: "2", status: "completed", result: "passed", state: "passed" },
  ]), "running");

  assert.equal(computeOverallStatus([
    { id: "1", status: "failed", result: "failed", state: "failed" },
  ]), "failed");
});

test("formatRunFailure preserves current failure format", () => {
  assert.equal(
    formatRunFailure([
      { id: "run-1", status: "failed", result: "failed", state: "failed" },
      { id: "run-2", status: "completed", result: "passed", state: "passed" },
    ]),
    "One or more TesterArmy runs failed\nrun-1\tfailed\tfailed\nrun-2\tcompleted\tpassed",
  );
});
