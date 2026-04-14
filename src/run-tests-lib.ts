export type RunState = "passed" | "failed" | "pending";
export type OverallStatus = "running" | "passed" | "failed";

export interface RunEntry {
  id: string;
  name: string;
  status: string;
  result: string;
  state: RunState;
  duration: string;
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

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDuration(durationMs: unknown): string {
  const value = Number(durationMs);
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const totalSeconds = Math.floor(value / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

function stateLabel(state: RunState): string {
  switch (state) {
    case "passed":
      return "PASS";
    case "failed":
      return "FAIL";
    case "pending":
      return "RUNS";
  }
}

function truncateId(id: string): string {
  return id.slice(0, 8);
}

function divider(title: string): string {
  return `${"─".repeat(12)} ${title} ${"─".repeat(12)}`;
}

function summaryCounts(runs: RunEntry[]): Record<RunState, number> {
  return runs.reduce(
    (summary, run) => {
      summary[run.state] += 1;
      return summary;
    },
    { passed: 0, failed: 0, pending: 0 } as Record<RunState, number>,
  );
}

function formatSummaryCounts(runs: RunEntry[]): string {
  const counts = summaryCounts(runs);
  return `${counts.failed} failed | ${counts.passed} passed | ${counts.pending} pending | ${runs.length} total`;
}

function formatRunLine(run: RunEntry): string {
  const durationSuffix = run.duration === "-" ? "" : ` (${run.duration})`;
  return `${stateLabel(run.state)}  testerarmy  ${run.name} > ${truncateId(run.id)}${durationSuffix}`;
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

  if (status === "unknown" && result === "unknown") {
    return "pending";
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
  const fallbackName = `Run ${truncateId(runId)}`;

  return {
    id: runId,
    name: readString(output.featureName ?? payload.name ?? payload.id, fallbackName),
    status,
    result,
    state: classifyRun(status, result),
    duration: formatDuration(payload.durationMs),
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

export function summarizeRuns(runs: RunEntry[]): string {
  return formatSummaryCounts(runs);
}

export function formatRunProgress(runs: RunEntry[]): string {
  return `RUNS  testerarmy  ${summarizeRuns(runs)}`;
}

export function formatRunReport(runs: RunEntry[]): string {
  const lines = [divider("TesterArmy"), "", ...runs.map(formatRunLine), "", `Runs  ${summarizeRuns(runs)}`];
  return lines.join("\n");
}

export function formatRunFailure(runs: RunEntry[]): string {
  return `FAIL  TesterArmy\n\n${formatRunReport(runs)}`;
}

export function formatRunSuccess(runs: RunEntry[]): string {
  return `PASS  TesterArmy\n\n${formatRunReport(runs)}`;
}
