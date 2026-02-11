const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawnSync } = require("node:child_process");

function startMockKroki() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/plantuml/svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
      return;
    }

    if (req.method === "POST" && req.url === "/plantuml/png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(Buffer.from("89504e470d0a1a0a", "hex"));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

test("cli renders through remote fallback when server is configured", async (t) => {
  let mock;

  try {
    mock = await startMockKroki();
  } catch (error) {
    if (error && error.code === "EPERM") {
      t.skip("Sandbox denies local TCP listeners; skipping remote CLI integration test.");
      return;
    }
    throw error;
  }

  const { server, url } = mock;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plantuml-cli-"));
  const input = path.join(tmp, "diagram.puml");
  const output = path.join(tmp, "diagram.svg");

  fs.writeFileSync(input, "@startuml\nAlice -> Bob: hi\n@enduml\n");

  const cmd = spawnSync(
    process.execPath,
    ["cli.js", input, "--format", "svg", "--server", url, "--out", output],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    }
  );

  server.close();

  assert.equal(cmd.status, 0, cmd.stderr);
  assert.equal(fs.existsSync(output), true);
  assert.match(fs.readFileSync(output, "utf8"), /<svg/);
});

test("cli fails without local renderer and without remote URL", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plantuml-cli-"));
  const input = path.join(tmp, "diagram.puml");

  fs.writeFileSync(input, "@startuml\nAlice -> Bob: hi\n@enduml\n");

  const cmd = spawnSync(process.execPath, ["cli.js", input], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      PLANTUML_REMOTE_URL: "",
    },
  });

  assert.equal(cmd.status, 4);
  assert.match(cmd.stderr, /No local renderer available/);
});
