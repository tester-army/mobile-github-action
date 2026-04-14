function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function withRemoveAfter(payload: Record<string, unknown>, removeAfter: string): Record<string, unknown> {
  if (removeAfter === "0") {
    return payload;
  }

  return {
    ...payload,
    removeAfter: Number(removeAfter),
  };
}

export function buildUploadInitPayload(
  filename: string,
  fileSize: number,
  removeAfter: string,
): Record<string, unknown> {
  return withRemoveAfter({ filename, fileSize }, removeAfter);
}

export function buildUploadConfirmPayload(
  storageKey: string,
  filename: string,
  fileSize: number,
  removeAfter: string,
): Record<string, unknown> {
  return withRemoveAfter({ storageKey, filename, fileSize }, removeAfter);
}

export function parseUploadInitResponse(data: unknown): { uploadUrl: string; storageKey: string } {
  const payload = asRecord(data);
  const uploadUrl = typeof payload.uploadUrl === "string" ? payload.uploadUrl : "";
  const storageKey = typeof payload.storageKey === "string" ? payload.storageKey : "";

  if (!uploadUrl || !storageKey) {
    throw new Error(
      `Upload initiation response is missing uploadUrl or storageKey\n${JSON.stringify(data, null, 2)}`,
    );
  }

  return { uploadUrl, storageKey };
}

export function parseConfirmedAppId(data: unknown): string {
  const payload = asRecord(data);
  const app = asRecord(payload.app);
  const appId = typeof app.id === "string" ? app.id : "";

  if (!appId) {
    throw new Error(
      `Upload confirmation response did not include app.id\n${JSON.stringify(data, null, 2)}`,
    );
  }

  return appId;
}
