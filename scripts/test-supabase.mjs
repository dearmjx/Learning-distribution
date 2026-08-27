import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "supabase.cmd" : "supabase";
const probe = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], { stdio: "ignore", shell: false });
if (probe.status !== 0) {
  console.log("SKIPPED: Supabase CLI is not installed; live migration/RLS tests were not run.");
  process.exit(0);
}

const result = spawnSync(command, ["test", "db"], { stdio: "inherit", shell: false });

if (result.error) {
  console.log("SKIPPED: Supabase CLI is not installed; live migration/RLS tests were not run.");
  process.exit(0);
}

process.exit(result.status ?? 1);
