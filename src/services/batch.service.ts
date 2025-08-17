/** @file Execução em lote com concorrência limitada. */
import pLimit from "p-limit";
import { execCommandDetailed } from "./ssh.service";

export interface BatchTarget { host:string; username:string; password?:string; privateKey?:string; }
export interface BatchRequest {
  targets: BatchTarget[];
  command: string;
  concurrency?: number;
  timeoutMs?: number;
  cwd?: string;
  maxBytes?: number;
}

export async function execOnMany(req: BatchRequest) {
  const limit = pLimit(req.concurrency ?? 5);
  const jobs = req.targets.map(t => limit(async () => {
    try {
      const r = await execCommandDetailed(
        t.host, t.username, t.password ?? "", req.command,
        22, req.timeoutMs ?? 30000, req.cwd, req.maxBytes ?? 1_000_000
      );
      return { host: t.host, ok: true, ...r };
    } catch (e:any) {
      return { host: t.host, ok: false, error: e.message ?? String(e) };
    }
  }));
  return Promise.all(jobs);
}
