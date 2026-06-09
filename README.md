# TesterArmy Mobile CI

A GitHub Action that uploads an iOS Simulator app or Android APK to [TesterArmy](https://tester.army), runs AI-powered tests against it, and optionally cleans up the uploaded app.

## How it works

```
Upload app binary ──► Run TesterArmy CI group ──► Report result ──► Optional cleanup
                  └─► Optional dynamic PR agent ─┘
```

1. **Upload** — calls `npx --yes testerarmy@latest upload-app` with the app path and project ID
2. **Test** — calls `npx --yes testerarmy@latest ci` with the group ID, platform, uploaded app ID, and commit SHA
3. **Dynamic PR agent** — in `dynamic_agent` mode on pull request events, calls `npx --yes testerarmy@latest pr run-dynamic`
4. **Cleanup** — delegates uploaded app cleanup to `testerarmy ci --delete-app-after-run` only when the same action invocation owns the upload and deletion is enabled

By default, `mode: all` uploads the app and runs the defined CI group in a single job. To run defined tests and the dynamic agent in parallel, use the action from separate workflow jobs: one `upload` job followed by parallel `test` and `dynamic_agent` jobs.

## Usage

```yaml
- uses: tester-army/mobile-github-action@v1
  with:
    app_path: path/to/your.app
    platform: ios
    api_key: ${{ secrets.TESTERARMY_API_KEY }}
    project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
    group_id: ${{ secrets.TESTERARMY_GROUP_ID }}
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
          group_id: ${{ secrets.TESTERARMY_GROUP_ID }}

      - run: echo "Tests finished with status ${{ steps.tests.outputs.overall_status }}"
```

### Separate jobs with dynamic PR agent

Composite actions cannot create GitHub Actions jobs. Use `mode` to split the work in the caller workflow: upload once, then run the defined test job and optional dynamic agent job in parallel against the uploaded app ID.

This example covers one platform. To test both iOS and Android, duplicate the `upload`, `defined_tests`, and `dynamic_agent` jobs for the second platform, use the Android artifact path in that upload job, and set `platform: android` in its defined test and dynamic agent jobs.

```yaml
name: Mobile Tests
on: [push, pull_request]

jobs:
  upload:
    runs-on: ubuntu-latest
    outputs:
      app_id: ${{ steps.upload.outputs.app_id }}
    steps:
      - uses: actions/checkout@v4

      # Download or build your app first
      - uses: actions/download-artifact@v4
        with:
          name: my-app
          path: .build/

      - uses: tester-army/mobile-github-action@v1
        id: upload
        with:
          mode: upload
          app_path: .build/my-app.app
          api_key: ${{ secrets.TESTERARMY_API_KEY }}
          project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}

  defined_tests:
    runs-on: ubuntu-latest
    needs: upload
    steps:
      - uses: tester-army/mobile-github-action@v1
        id: defined
        with:
          mode: test
          app_id: ${{ needs.upload.outputs.app_id }}
          platform: ios
          api_key: ${{ secrets.TESTERARMY_API_KEY }}
          project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
          group_id: ${{ secrets.TESTERARMY_GROUP_ID }}

      - run: echo "Defined tests finished with status ${{ steps.defined.outputs.overall_status }}"

  dynamic_agent:
    runs-on: ubuntu-latest
    needs: upload
    if: ${{ github.event_name == 'pull_request' && vars.TESTERARMY_DYNAMIC_AGENT_ENABLED == 'true' }}
    steps:
      - uses: tester-army/mobile-github-action@v1
        id: dynamic
        with:
          mode: dynamic_agent
          app_id: ${{ needs.upload.outputs.app_id }}
          platform: ios
          api_key: ${{ secrets.TESTERARMY_API_KEY }}
          project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}

      - run: echo "Dynamic agent finished with status ${{ steps.dynamic.outputs.dynamic_agent_status }}"
```

In split-job workflows, `mode: test` never deletes the supplied `app_id` by default because that job did not create the upload. Use `remove_after` on the upload job to control uploaded app cleanup for this pattern.

### iOS example

```yaml
- uses: tester-army/mobile-github-action@v1
  with:
    app_path: .build/my-app.app
    platform: ios
    api_key: ${{ secrets.TESTERARMY_API_KEY }}
    project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
    group_id: ${{ secrets.TESTERARMY_GROUP_ID }}
```

### Android example

```yaml
- uses: tester-army/mobile-github-action@v1
  with:
    app_path: app/build/outputs/apk/debug/app-debug.apk
    platform: android
    api_key: ${{ secrets.TESTERARMY_API_KEY }}
    project_id: ${{ secrets.TESTERARMY_PROJECT_ID }}
    group_id: ${{ secrets.TESTERARMY_GROUP_ID }}
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `app_path` | For `all`, `upload` | — | Path to the iOS Simulator `.app`/archive or Android `.apk` |
| `api_key` | Yes | — | TesterArmy API key |
| `project_id` | Yes | — | TesterArmy project ID |
| `group_id` | For `all`, `test` | — | TesterArmy group ID |
| `app_id` | For `test`, `dynamic_agent` | — | Existing TesterArmy uploaded app ID |
| `mode` | No | `all` | Action mode: `all`, `upload`, `test`, or `dynamic_agent` |
| `platform` | No | `ios` | Mobile runtime platform: `ios` or `android` |
| `delete_app_after_run` | No | `true` | Ask the CLI to delete the uploaded app after terminal test runs when the same action invocation owns the upload |
| `remove_after` | No | `3600` | Seconds before TesterArmy auto-removes the upload. `0` to disable |

Android support is APK-only. `.aab`, `.apks`, and `.xapk` are not supported by this action path.

## Outputs

| Output | Description |
| --- | --- |
| `app_id` | Uploaded or supplied TesterArmy app ID |
| `overall_status` | `passed`, `failed`, or `timed_out` |
| `dynamic_agent_status` | `passed`, `failed`, `timed_out`, or `skipped` |

`run_ids` is not exposed by the CLI-backed action.

## Requirements

- The action sets up Node.js 24 automatically for `npx testerarmy@latest` and JSON output parsing.
- The action uses `testerarmy@latest` by default.

## License

MIT
