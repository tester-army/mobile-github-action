import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUploadConfirmPayload,
  buildUploadInitPayload,
  parseConfirmedAppId,
  parseUploadInitResponse,
} from "../src/upload-mobile-lib.ts";

test("buildUploadInitPayload includes removeAfter when enabled", () => {
  assert.deepEqual(buildUploadInitPayload("app.zip", 123, "3600"), {
    filename: "app.zip",
    fileSize: 123,
    removeAfter: 3600,
  });
});

test("buildUploadInitPayload omits removeAfter when disabled", () => {
  assert.deepEqual(buildUploadInitPayload("app.zip", 123, "0"), {
    filename: "app.zip",
    fileSize: 123,
  });
});

test("buildUploadConfirmPayload mirrors upload confirmation payload shape", () => {
  assert.deepEqual(buildUploadConfirmPayload("storage-key", "app.zip", 123, "120"), {
    storageKey: "storage-key",
    filename: "app.zip",
    fileSize: 123,
    removeAfter: 120,
  });
});

test("parseUploadInitResponse returns required storage details", () => {
  assert.deepEqual(parseUploadInitResponse({
    uploadUrl: "https://upload.example.com",
    storageKey: "key-123",
  }), {
    uploadUrl: "https://upload.example.com",
    storageKey: "key-123",
  });
});

test("parseUploadInitResponse throws on incomplete responses", () => {
  assert.throws(() => parseUploadInitResponse({ uploadUrl: "https://upload.example.com" }), {
    message: /missing uploadUrl or storageKey/i,
  });
});

test("parseConfirmedAppId returns uploaded app id", () => {
  assert.equal(parseConfirmedAppId({ app: { id: "app-42" } }), "app-42");
});

test("parseConfirmedAppId throws when app id is absent", () => {
  assert.throws(() => parseConfirmedAppId({ app: {} }), {
    message: /did not include app.id/i,
  });
});
