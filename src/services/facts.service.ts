/** @file Coleta de informações básicas do host. */
import { execCommandDetailed, execWithKeyDetailed } from "./ssh.service";
import { LRU } from "../utils/lru";

type Target = { host: string; username: string; password?: string; privateKey?: string; passphrase?: string };

interface Facts {
  kernel: string;
  os: string;
  uptime: string;
  disks: string;
  memory: string;
  ip4: string;
  collectedAt: string; // ISO
}

const factsCache = new LRU<string, { value: Facts; ts: number }>(200);
const FACTS_TTL_MS = 5 * 60_000; // 5 minutos

/** Coleta "facts" do host com cache TTL. */
export async function collectFacts(target: Target, timeoutMs = 8000): Promise<Facts> {
  const key = `${target.host}|facts`;
  const hit = factsCache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < FACTS_TTL_MS) return hit.value;

  // Comandos curtos e seguros
  const cmds = [
    "uname -a || true",
    "lsb_release -a 2>/dev/null || cat /etc/os-release 2>/dev/null || true",
    "uptime -p || true",
    "df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs | tail -n +2 || true",
    "free -m || true",
    "ip -o -4 addr show | awk '{print $2,$4}' || true"
  ];
  const joined = cmds.join(" && echo '---' && ");

  // Autenticação: usa chave se vier, senão senha.
  const execRes = target.privateKey
    ? await execWithKeyDetailed(
        target.host, target.username, target.privateKey, joined, target.passphrase, 22, timeoutMs, "/", 200_000
      )
    : await execCommandDetailed(
        target.host, target.username, target.password ?? "", joined, 22, timeoutMs, "/", 200_000
      );

  const blocks = execRes.stdout.split('---');
  const facts: Facts = {
    kernel: (blocks[0] ?? "").trim(),
    os:     (blocks[1] ?? "").trim(),
    uptime: (blocks[2] ?? "").trim(),
    disks:  (blocks[3] ?? "").trim(),
    memory: (blocks[4] ?? "").trim(),
    ip4:    (blocks[5] ?? "").trim(),
    collectedAt: new Date().toISOString()
  };

  factsCache.set(key, { value: facts, ts: now });
  return facts;
}
