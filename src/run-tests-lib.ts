export type RunState = "passed" | "failed" | "pending";
export type OverallStatus = "running" | "passed" | "failed";

export interface RunEntry {
  id: string;
  status: string;
  result: string;
  state: RunState;
}

export interface TriggerRequestOptions {
  commitSha: string;
  websiteUrl: string;
  appId: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readLowercaseString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value ? value.toLowerCase() : fallback;
}

export function classifyRun(status: string, result: string): RunState {
  const pendingStatuses = ["queued", "pending", "running", "in_progress"];
  const failedStatuses = ["failed", "failure", "cancelled", "canceled", "error"];
  const completedStatuses = ["completed", "succeeded", "success", "passed"];
  const passResults = ["pass", "passed", "success", "succeeded"];

  if (pendingStatuses.includes(status)) {
    return "pending";
  }

  if (failedStatuses.includes(status)) {
    return "failed";
  }

  if (completedStatuses.includes(status)) {
    return passResults.includes(result) ? "passed" : "failed";
  }

  console.warn(`Unrecognized run status "${status}" (result: "${result}"), treating as pending`);
  return "pending";
}

export function buildTriggerRequest(
  options: TriggerRequestOptions,
): Pick<RequestInit, "body" | "headers"> {
  const payload: Record<string, unknown> = {};

  if (options.commitSha) {
    payload.commitSha = options.commitSha;
  }
  if (options.websiteUrl) {
    payload.targetUrl = options.websiteUrl;
  }
  if (options.appId) {
    payload.mobile = { appId: options.appId };
  }

  if (Object.keys(payload).length === 0) {
    return { headers: {} };
  }

  return {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

export function extractRunIds(data: unknown): string[] {
  const payload = asRecord(data);
  return Array.isArray(payload.runIds)
    ? payload.runIds.map((value: unknown) => String(value))
    : [];
}

export function mapRunEntry(runId: string, data: unknown): RunEntry {
  const payload = asRecord(data);
  const output = asRecord(payload.output);
  const status = readLowercaseString(payload.status);
  const result = readLowercaseString(output.result ?? payload.result);

  return {
    id: runId,
    status,
    result,
    state: classifyRun(status, result),
  };
}

export function computeOverallStatus(runs: RunEntry[]): OverallStatus {
  if (runs.some((run) => run.state === "failed")) {
    return "failed";
  }

  if (runs.every((run) => run.state === "passed")) {
    return "passed";
  }

  return "running";
}

export function formatRunFailure(runs: RunEntry[]): string {
  const details = runs.map((run) => `${run.id}\t${run.status}\t${run.result}`).join("\n");
  return `One or more TesterArmy runs failed\n${details}`;
}
