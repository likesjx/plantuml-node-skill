# Local PlantUML renderer spec

Goal

Implement an offline-capable PlantUML renderer that runs locally in Node (no Java), exposes the existing CLI (same UX), and falls back to a remote renderer (Kroki) when a local renderer is unavailable or fails.

Constraints

- No Java dependency on developer machine, CI runner, or VPS.
- Support PNG and SVG outputs.
- Keep CLI arguments backward-compatible (current: cli.js <file.puml> [--out out.png] [--server ...]).
- Safe defaults: local renderer preferred; fallback to Kroki only if explicitly allowed (flag or env).
- Must be cross-platform (macOS/Linux) and work in GitHub Actions (no special system install required).

Design overview

1) Renderer abstraction
- Create a renderer module with interface:
  - async renderPumlToPng(pumlText) -> Buffer
  - async renderPumlToSvg(pumlText) -> Buffer
  - async isAvailable() -> boolean
- Implement two backends:
  - localRenderer (WASM/JS) — uses the selected JS/WASM library.
  - remoteRenderer (HTTP to Kroki) — existing POST logic.

2) CLI behavior
- CLI attempts localRenderer.isAvailable(); if true, uses it.
- If local render fails or isAvailable false:
  - If env/flag --allow-remote (or default configuration) permits, fall back to remoteRenderer.
  - Otherwise, exit with an error instructing how to enable remote fallback or install local renderer.
- CLI flags:
  - --out <path>
  - --format <png|svg> (default png)
  - --server <url> (for remote fallback; default https://kroki.io)
  - --force-remote (bypass local)
  - --allow-remote / --no-remote (configurable)
  - --verbose

3) Packaging & deps
- Add wasm package as dependency; if it requires initialization (download wasm), add init code and document caching.
- Keep node-fetch (or built-in fetch for Node 18+), or use cross-fetch.

4) Error handling & logging
- All renderer errors are caught and logged with human-friendly messages.
- Return non-zero exit codes for failures; include suggestions ("install X", or "use --server to enable remote rendering").
- Log brief machine-parseable STEP: lines to /tmp/plantuml-node-skill.log when run in CI/automation.

5) Testing
- Unit tests for renderer abstraction (mock local renderer and remote renderer).
- Integration tests:
  - Render a simple sequence diagram to PNG and SVG locally (verify file exists and has non-zero size).
  - Simulate local renderer failure, verify remote fallback works.
- CI: run tests on Node 18+ in GitHub Actions.

6) CI / GitHub Action
- Add a workflow that:
  - Runs unit tests on push/PR.
  - Optionally renders docs/diagrams/*.puml (using the local renderer in the Action) and commits outputs to a branch or artifacts (if you want auto-render on push).
- Use Node 18+ runner to avoid bringing in extra runtimes.

7) Security & privacy
- The local renderer processes files offline — no network.
- Remote fallback (Kroki) must be opt-in or require env var (e.g., PLANTUML_REMOTE_URL) and should be disabled by default. Document privacy implications.
- If self-hosting Kroki, store URL in GH secrets for CI.

8) Performance & resource notes
- WASM renderers can be CPU/memory heavy for large diagrams; document limits and timeouts.
- Add CLI flags for timeout (--timeout) and output size warnings.

Files & code changes to implement
- src/renderer/index.js (abstraction + factory)
- src/renderer/local.js (WASM/JS implementation)
- src/renderer/remote.js (existing Kroki HTTP)
- cli.js (update to use renderer factory and new flags)
- README.md (usage + privacy notes)
- tests/* (unit + integration)
- package.json scripts: test, render (example)
- .github/workflows/node.yml (test matrix + optional render action)

Implementation steps (detailed)

1) Pick a JS/WASM package and vendor it by installing via npm. Example: npm i plantuml-wasm (or chosen package). If the package requires initialization (download wasm), add init code and document caching.
2) Implement local renderer:
   - Initialize WASM runtime on first use (async).
   - Provide renderPumlToPng and renderPumlToSvg methods returning Buffer.
3) Implement remote renderer (reuse current Kroki code in cli.js).
4) Implement renderer factory (tries local, falling back conditionally).
5) Update CLI to accept new flags (--format, --force-remote).
6) Add tests:
   - unit mocks to simulate local failure and remote success.
   - integration smoke test rendering the example codex-hooks diagram.
7) Update README (usage, examples, offline vs remote).
8) CI: run tests and publish artifacts (optional).
9) Release / Tag: bump package version and push.

Rollout plan

- Implement feature in branch feature/local-renderer.
- Open PR and run CI (tests + sample render).
- Review integration results (rendered PNG).
- Merge to main and bump version.

Fallback / troubleshooting checklist

- If local renderer fails to initialize: verify Node version, wasm download, and required libraries. Provide diagnostics: NODE_INFO, wasm init logs.
- If rendered output is incorrect: test with simple PlantUML examples and compare to the remote renderer.
- If some PlantUML features are unsupported: document exact feature gaps and recommend remote Kroki as fallback for those diagrams.

