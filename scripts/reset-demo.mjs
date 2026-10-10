import { existsSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const projectRoot = process.cwd();
const dataRoot = resolve(projectRoot, "data");
const configuredPath = process.env.DEMO_DB_PATH || "./data/learnloop-demo.sqlite";
const databasePath = resolve(projectRoot, configuredPath);
if (configuredPath === ":memory:" || !databasePath.startsWith(`${dataRoot}${sep}`)) {
  console.error("Refusing to reset a database outside the project data/ directory.");
  process.exit(1);
}
let removed = false;
for (const path of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
  if (existsSync(path)) {
    rmSync(path, { force: true });
    removed = true;
  }
}
console.log(removed ? `Removed local demo database: ${databasePath}` : `No local demo database found at ${databasePath}`);
console.log("Restart the app process before using the reset database.");
