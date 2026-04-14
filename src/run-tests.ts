import {
  getEnv,
  handleMainError,
  parseApiBase,
  requestJson,
  requireEnv,
  setOutput,
} from "./github-actions-utils.ts";
import {
  buildTriggerRequest,
  computeOverallStatus,
  extractRunIds,
  formatRunFailure,
  formatRunProgress,
  formatRunSuccess,
  mapRunEntry,
  type RunEntry,
} from "./run-tests-lib.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRunEntry(
  apiBase: string,
  apiKey: string,
  runId: string,
): Promise<RunEntry> {
  const runResponse = await requestJson(`${apiBase}/api/v1/runs/${runId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return mapRunEntry(runId, runResponse.data);
}

export async function main(): Promise<void> {
  const apiKey = requireEnv("TESTERARMY_API_KEY");
  const webhookUrl = requireEnv("TESTERARMY_WEBHOOK_URL");
  const websiteUrl = getEnv("TESTERARMY_WEBSITE_URL").trim();
  const appId = getEnv("TESTERARMY_APP_ID").trim();
  const commitSha = getEnv("TESTERARMY_COMMIT_SHA").trim();
  const pollIntervalSeconds = Number(getEnv("POLL_INTERVAL_SECONDS", "10"));
  const timeoutSeconds = Number(getEnv("TIMEOUT_SECONDS", "1800"));

  const triggerResponse = await requestJson(webhookUrl, {
    method: "POST",
    ...buildTriggerRequest({ commitSha, websiteUrl, appId }),
  });

  const runIds = extractRunIds(triggerResponse.data);
  if (runIds.length === 0) {
    throw new Error(
      `Webhook response did not include any run IDs\n${JSON.stringify(triggerResponse.data, null, 2)}`,
    );
  }

  console.log(`Triggered ${runIds.length} TesterArmy run(s): ${runIds.join(", ")}`);

  const apiBase = parseApiBase(webhookUrl);
  setOutput("run_ids", JSON.stringify(runIds));

  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastProgressMessage = "";

  while (true) {
    const runs = await Promise.all(
      runIds.map((runId: string) => fetchRunEntry(apiBase, apiKey, runId)),
    );

    const progressMessage = formatRunProgress(runs);
    if (progressMessage !== lastProgressMessage) {
      console.log(progressMessage);
      lastProgressMessage = progressMessage;
    }

    const overallStatus = computeOverallStatus(runs);

    if (overallStatus === "failed") {
      setOutput("overall_status", overallStatus);
      throw new Error(formatRunFailure(runs));
    }

    if (overallStatus === "passed") {
      console.log(formatRunSuccess(runs));
      setOutput("overall_status", overallStatus);
      return;
    }

    if (Date.now() >= deadline) {
      setOutput("overall_status", "timed_out");
      throw new Error(`Timed out waiting for TesterArmy runs to finish\n\n${formatRunProgress(runs)}`);
    }

    await sleep(pollIntervalSeconds * 1000);
  }
}

if (import.meta.main) {
  main().catch(handleMainError);
}
