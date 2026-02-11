const fs = require("fs");
const path = require("path");
const vm = require("vm");

const VENDORED_SHA = "d57e157467339b726607fe001b4227425674907c";
const VENDORED_DIR = path.resolve(
  __dirname,
  "../../vendor/plantuml-wasm",
  VENDORED_SHA
);

const VENDORED_FILES = [
  "plantuml.js",
  "plantuml-core.jar",
  "plantuml-core.jar.js",
];

let cachedAdapterPromise = null;

function normalizePlantumlWasmApi(mod) {
  if (!mod) return null;

  const candidate = mod.default || mod;

  if (typeof candidate.render === "function") {
    return {
      source: "module:plantuml-wasm",
      async renderPng(text) {
        const out = await candidate.render(text, { format: "png" });
        return Buffer.isBuffer(out) ? out : Buffer.from(out);
      },
      async renderSvg(text) {
        const out = await candidate.render(text, { format: "svg" });
        return Buffer.isBuffer(out) ? out : Buffer.from(out);
      },
    };
  }

  if (
    typeof candidate.renderPumlToPng === "function" &&
    typeof candidate.renderPumlToSvg === "function"
  ) {
    return {
      source: "module:plantuml-wasm",
      async renderPng(text) {
        return Buffer.from(await candidate.renderPumlToPng(text));
      },
      async renderSvg(text) {
        return Buffer.from(await candidate.renderPumlToSvg(text));
      },
    };
  }

  return null;
}

function hasVendoredRuntime() {
  return VENDORED_FILES.every((file) => fs.existsSync(path.join(VENDORED_DIR, file)));
}

function hasCheerpjRuntimeGlobals() {
  return (
    typeof globalThis.cheerpjInit === "function" &&
    typeof globalThis.cheerpjRunMain === "function" &&
    typeof globalThis.cjCall === "function" &&
    typeof globalThis.cjFileBlob === "function"
  );
}

async function buildVendoredAdapter() {
  if (!hasVendoredRuntime() || !hasCheerpjRuntimeGlobals()) {
    return null;
  }

  const source = fs.readFileSync(path.join(VENDORED_DIR, "plantuml.js"), "utf8");

  const context = {
    module: { exports: {} },
    exports: {},
    fetch: globalThis.fetch,
    cheerpjInit: globalThis.cheerpjInit,
    cheerpjRunMain: globalThis.cheerpjRunMain,
    cjCall: globalThis.cjCall,
    cjFileBlob: globalThis.cjFileBlob,
    cheerpjGetFSMountForPath: globalThis.cheerpjGetFSMountForPath,
    console,
  };

  vm.runInNewContext(`${source}\nmodule.exports = plantuml;`, context, {
    filename: path.join(VENDORED_DIR, "plantuml.js"),
  });

  const plantuml = context.module.exports;
  if (!plantuml || typeof plantuml.initialize !== "function" || typeof plantuml.renderPng !== "function") {
    return null;
  }

  await plantuml.initialize(`/app/vendor/plantuml-wasm/${VENDORED_SHA}`);

  return {
    source: `vendor:plantuml-wasm@${VENDORED_SHA}`,
    async renderPng(text) {
      const blob = await plantuml.renderPng(text);
      const arr = await blob.arrayBuffer();
      return Buffer.from(arr);
    },
    async renderSvg() {
      throw new Error("Vendored plantuml-wasm does not expose SVG rendering in this runtime.");
    },
  };
}

async function buildAdapter() {
  try {
    const moduleRef = require("plantuml-wasm");
    const adapter = normalizePlantumlWasmApi(moduleRef);
    if (adapter) {
      return adapter;
    }
  } catch (_error) {
    // ignore and try vendored adapter
  }

  return buildVendoredAdapter();
}

async function getAdapter() {
  if (!cachedAdapterPromise) {
    cachedAdapterPromise = buildAdapter().catch((error) => {
      cachedAdapterPromise = null;
      throw error;
    });
  }

  return cachedAdapterPromise;
}

module.exports = {
  VENDORED_SHA,

  async isAvailable() {
    return Boolean(await getAdapter());
  },

  async renderPumlToPng({ pumlText }) {
    const adapter = await getAdapter();
    if (!adapter) {
      throw new Error(
        `Local renderer unavailable: install a compatible plantuml-wasm module, or provide CheerpJ globals for vendored runtime ${VENDORED_SHA}.`
      );
    }
    return adapter.renderPng(pumlText);
  },

  async renderPumlToSvg({ pumlText }) {
    const adapter = await getAdapter();
    if (!adapter) {
      throw new Error(
        `Local renderer unavailable: install a compatible plantuml-wasm module, or provide CheerpJ globals for vendored runtime ${VENDORED_SHA}.`
      );
    }
    return adapter.renderSvg(pumlText);
  },
};
