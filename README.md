# TesterArmy Mobile CI

A GitHub Action that uploads a mobile app to [TesterArmy](https://tester.army), runs AI-powered tests against it, and cleans up when done.

## How it works

```
Upload app binary ──► Trigger test webhook ──► Poll for results ──► Delete app
                                                     │
                                              GitHub Step Summary
                                           (pass/fail, screenshots)
```

1. **Upload** — zips the app if it's a directory (e.g. `.app` bundle), uploads to TesterArmy via their API
2. **Test** — triggers a group webhook, polls each run until all complete or timeout
3. **Cleanup** — deletes the uploaded app (runs even if tests fail)

Results are written to [GitHub Step Summary](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/) with per-test status, duration, issues, and screenshots.

## Usage

```yaml
- uses: tester-army/mobile-github-action@v1
  with:
    app_path: path/to/your.app
    api_key: ${{ secrets.TESTERARMY_API_KEY }}
    project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
    webhook_url: ${{ secrets.TESTERARMY_WEBHOOK_URL }}
```

### Full example workflow

```yaml
name: Mobile Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Download or build your app first
      - uses: actions/download-artifact@v4
        with:
          name: my-app
          path: .build/

      - uses: tester-army/mobile-github-action@v1
        id: tests
        with:
          app_path: .build/my-app.app
          api_key: ${{ secrets.TESTERARMY_API_KEY }}
          project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
          webhook_url: ${{ secrets.TESTERARMY_WEBHOOK_URL }}
          timeout_seconds: "900"

      - run: echo "Tests finished with status ${{ steps.tests.outputs.overall_status }}"
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `app_path` | Yes | — | Path to the app build file or directory |
| `api_key` | Yes | — | TesterArmy API key |
| `project_id` | Yes | — | TesterArmy project ID |
| `webhook_url` | Yes | — | TesterArmy group webhook URL |
| `delete_app_after_run` | No | `true` | Delete the uploaded app after tests finish |
| `remove_after` | No | `3600` | Seconds before TesterArmy auto-removes the upload. `0` to disable |
| `poll_interval_seconds` | No | `10` | How often to poll for results |
| `timeout_seconds` | No | `1800` | Max wait time before timing out (30 min) |

## Outputs

| Output | Description |
| --- | --- |
| `app_id` | Uploaded TesterArmy app ID |
| `run_ids` | JSON array of TesterArmy run IDs |
| `overall_status` | `passed`, `failed`, or `timed_out` |

## Requirements

- The action sets up Node.js 24 automatically (uses `--experimental-strip-types` to run TypeScript directly)
- No external dependencies — only Node.js built-ins and the `fetch` API
- The upload step uses `zip` which is pre-installed on all GitHub-hosted runners

## License

MIT
