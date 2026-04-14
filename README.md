# TesterArmy Mobile CI

A GitHub Action that uploads a mobile app to [TesterArmy](https://tester.army), runs AI-powered tests against it, and cleans up when done.

## How it works

```
Upload app binary ──► Trigger test webhook ──► Poll for results ──► Delete app
```

1. **Upload** — zips the app if it's a directory (for example, a `.app` bundle), then uploads it to TesterArmy via their API
2. **Test** — triggers a group webhook, polls each run until all complete or timeout, and fails the step if any run fails
3. **Cleanup** — deletes the uploaded app when configured, even if tests fail

The action exposes run IDs and overall status through standard GitHub Action outputs.

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

## Development

- Run `npm run check` for syntax validation.
- Run `npm test` for the built-in Node test suite.
- The repo intentionally has no runtime dependencies; it relies on Node.js built-ins and `fetch`.

## Requirements

- The action sets up Node.js 24 automatically and uses `--experimental-strip-types` to run TypeScript directly
- The upload step uses `zip`, which is pre-installed on GitHub-hosted runners

## License

MIT
