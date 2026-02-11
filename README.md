# plantuml-node-skill

PlantUML CLI renderer with local-first behavior and optional remote fallback.

## Requirements

- Node.js 18+
- No Java required for this package itself.
- For remote fallback, configure a Kroki-compatible URL.

## Local renderer adapter

This project supports two local adapter paths:

- Preferred: a compatible installed `plantuml-wasm` Node module.
- Vendored fallback: pinned upstream `plantuml/plantuml-wasm` runtime in `vendor/plantuml-wasm/`.

Vendored pin details and checksums are documented in:

- `vendor/plantuml-wasm/VENDORED.md`

Important runtime note:

- Upstream vendored runtime is CheerpJ/browser-oriented.
- In pure Node CLI, it is usable only when compatible CheerpJ globals are present in-process.
- If local runtime is unavailable, configure `--server` or `PLANTUML_REMOTE_URL` for remote fallback.

## Usage

```bash
node cli.js <file.puml> [--out out.png] [--format png|svg]
```

### Flags

- `--out <path>` output file path.
- `--format <png|svg>` output format (default `png`).
- `--server <url>` remote renderer URL (used only for remote render/fallback).
- `--force-remote` bypass local renderer and use remote.
- `--allow-remote` allow remote fallback (default on).
- `--no-remote` disable remote fallback.
- `--timeout <ms>` renderer timeout in milliseconds (default `30000`).
- `--verbose` print step logs.

## Fallback behavior

- Local renderer is always attempted first.
- Remote fallback only works when a remote URL is configured via:
  - `--server <url>`, or
  - `PLANTUML_REMOTE_URL`.
- If no local renderer is available and no remote URL is set, the command exits with a non-zero code and a setup hint.

## Privacy

- Local rendering keeps diagram text on the machine.
- Remote rendering sends diagram text to the configured server. Use a self-hosted Kroki endpoint for sensitive diagrams.

## CI/automation step logs

When `CI=true` or `PLANTUML_STEP_LOG=1`, machine-parseable lines are appended to:

- `/tmp/plantuml-node-skill.log`

Each line begins with `STEP:`.

## Tests

```bash
npm test
```

## Render docs diagrams

```bash
npm run render:docs
```

If local rendering is unavailable, set `PLANTUML_REMOTE_URL` (or pass `--server` through the script invocation) before running.
