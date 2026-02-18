# plantuml-node-skill

PlantUML tooling workspace with a CLI renderer and a greenfield web-component WYSIWYG editor.

## Architecture Doc Pipeline (Write -> Save -> Render -> Inject)

This repo now includes an architecture-doc builder that:

- reads `plantuml`/`puml` fenced blocks from a Markdown file,
- saves each block as a `.puml` file,
- renders each diagram to `.svg` locally (pure JavaScript, sequence MVP subset),
- injects/updates image links in the Markdown directly under each fence.

Run:

```bash
npm run architecture:build -- <path-to-doc.md>
```

Optional diagrams directory:

```bash
npm run architecture:build -- <path-to-doc.md> --diagrams-dir docs/diagrams
```

Generated artifacts:

- `docs/diagrams/<doc-slug>-diagram-<n>.puml`
- `docs/diagrams/<doc-slug>-diagram-<n>.svg`

Markdown injection format:

- keeps the original PlantUML fence,
- adds managed markers and image reference below it.

## 80/20 MVP Editor (100% JavaScript)

Supported PlantUML subset:

- `@startuml` / `@enduml`
- `participant <name>`
- `<A> -> <B>: <message>`
- `<A> --> <B>: <message>`

Editor components:

- `/Users/jaredlikes/code/plantuml-node-skill/web/editor/components/puml-editor-app.js`
- `/Users/jaredlikes/code/plantuml-node-skill/web/editor/components/puml-canvas.js`
- `/Users/jaredlikes/code/plantuml-node-skill/web/editor/components/puml-source.js`
- `/Users/jaredlikes/code/plantuml-node-skill/web/editor/components/puml-preview.js`
- `/Users/jaredlikes/code/plantuml-node-skill/web/editor/components/puml-export.js`

Start editor:

```bash
npm run editor
```

Open `http://localhost:4173`.

## CLI Renderer

```bash
node cli.js <file.puml> [--out out.png] [--format png|svg] --server <url>
```

## Tests

```bash
npm test
```
