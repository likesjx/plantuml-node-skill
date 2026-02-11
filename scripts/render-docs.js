#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const diagramsDir = path.resolve(process.cwd(), "docs/diagrams");

if (!fs.existsSync(diagramsDir)) {
  console.log("No docs/diagrams directory; skipping render.");
  process.exit(0);
}

const diagrams = fs
  .readdirSync(diagramsDir)
  .filter((name) => name.endsWith(".puml"))
  .map((name) => path.join(diagramsDir, name));

if (diagrams.length === 0) {
  console.log("No .puml files found; skipping render.");
  process.exit(0);
}

for (const input of diagrams) {
  const base = input.replace(/\.puml$/, "");
  const pngOut = `${base}.png`;
  const svgOut = `${base}.svg`;

  for (const [format, out] of [["png", pngOut], ["svg", svgOut]]) {
    const args = ["cli.js", input, "--format", format, "--out", out];

    const hasServerArg = process.argv.includes("--server");
    if (hasServerArg) {
      const idx = process.argv.indexOf("--server");
      args.push("--server", process.argv[idx + 1]);
    }

    const run = spawnSync(process.execPath, args, { stdio: "inherit" });

    if (run.status !== 0) {
      process.exit(run.status || 1);
    }
  }
}

console.log(`Rendered ${diagrams.length} diagrams.`);
