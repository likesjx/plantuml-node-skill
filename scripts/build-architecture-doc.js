#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const { parseSequencePuml, modelToSvg } = require("../src/sequence-mvp");

function usage() {
  process.stderr.write(
    "Usage: node scripts/build-architecture-doc.js <doc.md> [--diagrams-dir docs/diagrams]\n"
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "doc";
}

function relPath(fromFile, toFile) {
  const rel = path.relative(path.dirname(fromFile), toFile);
  return rel.split(path.sep).join("/");
}

function parseArgs(argv) {
  if (!argv[0]) return null;
  let diagramsDir = "docs/diagrams";

  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--diagrams-dir") {
      diagramsDir = argv[i + 1] || diagramsDir;
      i += 1;
    }
  }

  return { docPath: argv[0], diagramsDir };
}

function buildMarker(id, imageRelativePath) {
  return [
    `<!-- plantuml-node-skill:rendered:${id}:start -->`,
    `![${id}](${imageRelativePath})`,
    `<!-- plantuml-node-skill:rendered:${id}:end -->`,
  ].join("\n");
}

function run() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    usage();
    process.exit(2);
  }

  const docFile = path.resolve(parsed.docPath);
  const diagramsDir = path.resolve(parsed.diagramsDir);

  if (!fs.existsSync(docFile)) {
    process.stderr.write(`Document not found: ${docFile}\n`);
    process.exit(3);
  }

  fs.mkdirSync(diagramsDir, { recursive: true });

  const source = fs.readFileSync(docFile, "utf8");
  const baseSlug = slugify(path.basename(docFile, path.extname(docFile)));
  let index = 0;

  const fencePattern = /```(?:plantuml|puml)\n([\s\S]*?)```(?:\n(?:<!-- plantuml-node-skill:rendered:[^\n]+:start -->\n!\[[^\n]*\]\([^\n]+\)\n<!-- plantuml-node-skill:rendered:[^\n]+:end -->)?)?/g;

  const updated = source.replace(fencePattern, (full, pumlBody) => {
    index += 1;
    const id = `${baseSlug}-diagram-${index}`;
    const pumlPath = path.join(diagramsDir, `${id}.puml`);
    const svgPath = path.join(diagramsDir, `${id}.svg`);

    const normalized = pumlBody.trim().startsWith("@startuml")
      ? `${pumlBody.trim()}\n`
      : `@startuml\n${pumlBody.trim()}\n@enduml\n`;

    let svg;
    try {
      const model = parseSequencePuml(normalized);
      svg = modelToSvg(model);
    } catch (error) {
      throw new Error(`Failed rendering ${id}: ${error.message}`);
    }

    fs.writeFileSync(pumlPath, normalized);
    fs.writeFileSync(svgPath, `${svg}\n`);

    const imageRelative = relPath(docFile, svgPath);
    const fence = `\
\`\`\`plantuml\n${normalized.trim()}\n\`\`\``;
    return `${fence}\n${buildMarker(id, imageRelative)}`;
  });

  if (index === 0) {
    process.stdout.write("No plantuml fences found.\n");
    return;
  }

  fs.writeFileSync(docFile, updated);
  process.stdout.write(`Processed ${index} diagram(s) in ${docFile}\n`);
}

try {
  run();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
