#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const { createRenderer, DEFAULT_TIMEOUT_MS } = require("./src/renderer");

function printUsage() {
  console.error(
    "Usage: plantuml-node-skill <input.puml> [--out out.png] [--format png|svg] [--server https://kroki.example] [--force-remote] [--allow-remote|--no-remote] [--timeout ms] [--verbose]"
  );
}

function parseArgs(argv) {
  if (argv.length < 1) {
    return { error: "Missing input file" };
  }

  const input = argv[0];
  const options = {
    out: null,
    format: "png",
    remoteUrl: process.env.PLANTUML_REMOTE_URL || null,
    forceRemote: false,
    allowRemote: true,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    verbose: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--out") {
      options.out = argv[++i];
      continue;
    }
    if (arg === "--server") {
      options.remoteUrl = argv[++i] || null;
      continue;
    }
    if (arg === "--format") {
      options.format = (argv[++i] || "png").toLowerCase();
      continue;
    }
    if (arg === "--force-remote") {
      options.forceRemote = true;
      continue;
    }
    if (arg === "--allow-remote") {
      options.allowRemote = true;
      continue;
    }
    if (arg === "--no-remote") {
      options.allowRemote = false;
      continue;
    }
    if (arg === "--timeout") {
      const timeout = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(timeout) || timeout <= 0) {
        return { error: "--timeout must be a positive integer (milliseconds)" };
      }
      options.timeoutMs = timeout;
      continue;
    }
    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    return { error: `Unknown argument: ${arg}` };
  }

  if (!["png", "svg"].includes(options.format)) {
    return { error: `Unsupported format: ${options.format}` };
  }

  return { input, options };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.error) {
    printUsage();
    console.error(parsed.error);
    process.exit(2);
  }

  const { input, options } = parsed;

  if (!fs.existsSync(input)) {
    console.error("Input not found:", input);
    process.exit(3);
  }

  const pumlText = fs.readFileSync(input, "utf8");
  const renderer = createRenderer();

  try {
    const result = await renderer.render(pumlText, {
      format: options.format,
      forceRemote: options.forceRemote,
      allowRemote: options.allowRemote,
      remoteUrl: options.remoteUrl,
      timeoutMs: options.timeoutMs,
      verbose: options.verbose,
    });

    const defaultOut =
      path.basename(input, path.extname(input)) +
      (options.format === "svg" ? ".svg" : ".png");

    const outPath = options.out || defaultOut;
    fs.writeFileSync(outPath, result.buffer);
    console.log(`Wrote ${outPath} (${result.mode})`);
  } catch (error) {
    console.error("Render failed:", error.message);

    if (!options.remoteUrl) {
      console.error("Hint: set --server <url> or PLANTUML_REMOTE_URL to enable remote fallback.");
    }

    process.exit(4);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
