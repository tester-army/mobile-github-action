import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  getEnv,
  parseApiBase,
  requestJson,
  requireEnv,
  setOutput,
} from "../src/github-actions-utils.ts";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.REQUIRED_VALUE;
  delete process.env.OPTIONAL_VALUE;
  delete process.env.GITHUB_OUTPUT;
});

test("requireEnv and getEnv read environment values consistently", () => {
  process.env.REQUIRED_VALUE = "hello";

  assert.equal(requireEnv("REQUIRED_VALUE"), "hello");
  assert.equal(getEnv("OPTIONAL_VALUE", "fallback"), "fallback");
  assert.throws(() => requireEnv("OPTIONAL_VALUE"), {
    message: /missing required environment variable/i,
  });
});

test("setOutput appends key value pairs to the GitHub output file", () => {
  const outputPath = path.join(os.tmpdir(), `gha-output-${Date.now()}.txt`);
  process.env.GITHUB_OUTPUT = outputPath;

  setOutput("app_id", "123");
  setOutput("overall_status", "passed");

  assert.equal(fs.readFileSync(outputPath, "utf8"), "app_id=123\noverall_status=passed\n");
  fs.rmSync(outputPath, { force: true });
});

test("requestJson returns parsed JSON payloads", async () => {
  global.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

  const response = await requestJson<{ ok: boolean }>("https://example.com", { method: "GET" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { ok: true });
});

test("requestJson throws on non-JSON responses", async () => {
  global.fetch = async () => new Response("not-json", { status: 200 });

  await assert.rejects(
    requestJson("https://example.com", { method: "GET" }),
    /failed to parse json response/i,
  );
});

test("requestJson throws on non-ok responses", async () => {
  global.fetch = async () => new Response("bad request", { status: 400 });

  await assert.rejects(
    requestJson("https://example.com", { method: "POST" }),
    /failed with status 400/i,
  );
});

test("parseApiBase strips webhook paths down to the origin", () => {
  assert.equal(
    parseApiBase("https://tester.army/api/v1/groups/demo/webhook"),
    "https://tester.army",
  );
});
