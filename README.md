# TesterArmy Mobile CI

A GitHub Action that uploads an iOS Simulator app or Android APK to [TesterArmy](https://tester.army), runs AI-powered tests against it, and optionally cleans up the uploaded app.

## How it works

```
Upload app binary ──► Run TesterArmy CI group ──► Report result ──► Optional cleanup
```

1. **Upload** — calls `npx --yes testerarmy@latest upload-app` with the app path and project ID
2. **Test** — calls `npx --yes testerarmy@latest ci` with the group ID, platform, uploaded app ID, and commit SHA
3. **Cleanup** — delegates uploaded app cleanup to `testerarmy ci --delete-app-after-run` when enabled

The action exposes the uploaded app ID and overall status through standard GitHub Action outputs.

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
| `app_path` | Yes | — | Path to the iOS Simulator `.app`/archive or Android `.apk` |
| `api_key` | Yes | — | TesterArmy API key |
| `project_id` | Yes | — | TesterArmy project ID |
| `group_id` | Yes | — | TesterArmy group ID |
| `platform` | No | `ios` | Mobile runtime platform: `ios` or `android` |
| `delete_app_after_run` | No | `true` | Ask the CLI to delete the uploaded app after terminal test runs |
| `remove_after` | No | `3600` | Seconds before TesterArmy auto-removes the upload. `0` to disable |

Android support is APK-only. `.aab`, `.apks`, and `.xapk` are not supported by this action path.

## Outputs

| Output | Description |
| --- | --- |
| `app_id` | Uploaded TesterArmy app ID |
| `overall_status` | `passed`, `failed`, or `timed_out` |

`run_ids` is not exposed by the CLI-backed action.

## Requirements

- The action sets up Node.js 24 automatically for `npx testerarmy@latest` and JSON output parsing.
- The action uses `testerarmy@latest` by default, matching the TesterArmy EAS workflow pattern.

## License

MIT
