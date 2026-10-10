import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import next from "next";

const port = 3000;
const databasePath = join(tmpdir(), `learnloop-integration-${process.pid}.sqlite`);
process.env.DEMO_MODE = "true";
process.env.DEMO_DB_PATH = databasePath;
process.env.NODE_ENV = "development";

const app = next({ dev: true, dir: process.cwd(), hostname: "127.0.0.1", port });
let server;
try {
  await app.prepare();
  const handle = app.getRequestHandler();
  server = createServer((request, response) => { void handle(request, response); });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const child = spawn(process.execPath, ["scripts/verify-learning-flow.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, LEARNLOOP_BASE_URL: `http://127.0.0.1:${port}` },
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exitCode = exitCode;
} catch (error) {
  console.error("Could not run the local integration verifier:", error);
  process.exitCode = 1;
} finally {
  if (server?.listening) {
    const serverClosed = new Promise((resolve) => server.close(resolve));
    server.closeAllConnections();
    await Promise.race([
      serverClosed,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  }
  await Promise.race([
    app.close(),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  for (const path of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
    if (existsSync(path)) rmSync(path, { force: true });
  }
}
process.exit(process.exitCode ?? 0);
