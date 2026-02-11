const test = require("node:test");
const assert = require("node:assert/strict");

const { createRenderer } = require("../src/renderer");

test("uses local renderer when available", async () => {
  const local = {
    async isAvailable() {
      return true;
    },
    async renderPumlToPng() {
      return Buffer.from("local-png");
    },
    async renderPumlToSvg() {
      return Buffer.from("<svg>local</svg>");
    },
  };

  const remote = {
    async renderPumlToPng() {
      return Buffer.from("remote-png");
    },
    async renderPumlToSvg() {
      return Buffer.from("<svg>remote</svg>");
    },
  };

  const renderer = createRenderer({ localRenderer: local, remoteRenderer: remote });
  const result = await renderer.render("@startuml\nA->B:hi\n@enduml", { format: "png" });

  assert.equal(result.mode, "local");
  assert.equal(result.buffer.toString("utf8"), "local-png");
});

test("falls back to remote when local unavailable and remote URL configured", async () => {
  const local = {
    async isAvailable() {
      return false;
    },
    async renderPumlToPng() {
      throw new Error("should not be called");
    },
    async renderPumlToSvg() {
      throw new Error("should not be called");
    },
  };

  const remote = {
    async renderPumlToPng() {
      return Buffer.from("remote-png");
    },
    async renderPumlToSvg() {
      return Buffer.from("<svg>remote</svg>");
    },
  };

  const renderer = createRenderer({ localRenderer: local, remoteRenderer: remote });
  const result = await renderer.render("@startuml\nA->B:hi\n@enduml", {
    format: "png",
    remoteUrl: "https://kroki.example",
    allowRemote: true,
  });

  assert.equal(result.mode, "remote");
  assert.equal(result.buffer.toString("utf8"), "remote-png");
});

test("fails when local unavailable and no remote URL", async () => {
  const local = {
    async isAvailable() {
      return false;
    },
  };

  const renderer = createRenderer({
    localRenderer: local,
    remoteRenderer: {
      async renderPumlToPng() {
        return Buffer.from("unused");
      },
      async renderPumlToSvg() {
        return Buffer.from("unused");
      },
    },
  });

  await assert.rejects(
    renderer.render("@startuml\nA->B:hi\n@enduml", { format: "png" }),
    /No local renderer available/
  );
});

test("force remote requires remote URL", async () => {
  const renderer = createRenderer({
    localRenderer: {
      async isAvailable() {
        return true;
      },
      async renderPumlToPng() {
        return Buffer.from("unused");
      },
      async renderPumlToSvg() {
        return Buffer.from("unused");
      },
    },
    remoteRenderer: {
      async renderPumlToPng() {
        return Buffer.from("remote");
      },
      async renderPumlToSvg() {
        return Buffer.from("remote");
      },
    },
  });

  await assert.rejects(
    renderer.render("@startuml\nA->B:hi\n@enduml", { forceRemote: true }),
    /requires --server/
  );
});
