/** @file Rotas HTTP para SSH. */
import { FastifyInstance } from "fastify";
import { execCommandDetailed, execWithKeyDetailed } from "../services/ssh.service";
import { collectFacts } from "../services/facts.service";
import { Client } from "ssh2";

/** Registra rotas da API SSH. */
export async function sshRoutes(app: FastifyInstance) {
  /** Execução com usuário/senha */
  app.post("/v1/ssh/exec", async (req, reply) => {
    const { host, username, password, command, port, timeoutMs, cwd, maxBytes } = req.body as any;

    if (!host || !username || !password || !command) {
      return reply.code(400).send({ error: "Parâmetros inválidos" });
    }

    try {
      const r = await execCommandDetailed(
        host,
        username,
        password,
        command,
        port ?? 22,
        timeoutMs ?? 30_000,
        cwd,
        maxBytes ?? 1_000_000
      );
      return r; // { stdout, stderr, code, durationMs, truncated }
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? "SSH error" });
    }
  });

  /** Execução com chave privada */
  app.post("/v1/ssh/exec-key", async (req, reply) => {
    const { host, username, privateKey, passphrase, command, port, timeoutMs, cwd, maxBytes } = req.body as any;

    if (!host || !username || !privateKey || !command) {
      return reply.code(400).send({ error: "Parâmetros inválidos" });
    }

    try {
      const r = await execWithKeyDetailed(
        host,
        username,
        privateKey,
        command,
        passphrase,
        port ?? 22,
        timeoutMs ?? 30_000,
        cwd,
        maxBytes ?? 1_000_000
      );
      return r; // { stdout, stderr, code, durationMs, truncated }
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? "SSH error" });
    }
  });

  /** Teste de conexão */
  app.post("/v1/ssh/test", async (req, reply) => {
    const { host, username, password, privateKey, passphrase, port, timeoutMs } = req.body as any;
    if (!host || !username) return reply.code(400).send({ error: "Parâmetros inválidos" });

    try {
      const r = await testConnection(host, username, {
        password,
        privateKeyPem: privateKey,
        passphrase,
        port,
        timeoutMs: timeoutMs ?? 8000
      });
      return r; // { ok, error?, durationMs }
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? "test error" });
    }
  });

  /** Coleta de informações básicas (facts) */
  app.post("/v1/ssh/facts", async (req, reply) => {
    const { host, username, password, privateKey, passphrase, timeoutMs } = req.body as any;
    if (!host || !username) return reply.code(400).send({ error: "Parâmetros inválidos" });

    try {
      const facts = await collectFacts(
        { host, username, password, privateKey },
        timeoutMs ?? 8000
      );
      return facts;
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? "facts error" });
    }
  });
}

/** Testa handshake SSH sem executar comandos. */
export async function testConnection(
  host: string,
  username: string,
  opts: { password?: string; privateKeyPem?: string; passphrase?: string; port?: number; timeoutMs?: number } = {}
): Promise<{ ok: boolean; error?: string; durationMs: number }> {
  const { password, privateKeyPem, passphrase, port = 22, timeoutMs = 10_000 } = opts;
  return new Promise((resolve) => {
    const conn = new Client();
    const started = Date.now();
    let to: NodeJS.Timeout | undefined;

    conn
      .on("ready", () => {
        if (to) clearTimeout(to);
        conn.end();
        resolve({ ok: true, durationMs: Date.now() - started });
      })
      .on("error", (err) => {
        if (to) clearTimeout(to);
        resolve({ ok: false, error: err.message, durationMs: Date.now() - started });
      })
      .connect({
        host,
        port,
        username,
        ...(password ? { password } : {}),
        ...(privateKeyPem ? { privateKey: privateKeyPem } : {}),
        ...(passphrase ? { passphrase } : {})
      });

    to = setTimeout(() => {
      try {
        conn.end();
      } catch {}
      resolve({ ok: false, error: "timeout", durationMs: Date.now() - started });
    }, timeoutMs);
  });
}
