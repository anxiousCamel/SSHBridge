/** @file Serviço SSH: execução de comandos via senha ou chave. */
import { Client } from "ssh2";

/**
 * Execução simples via senha.
 * Retorna stdout+stderr concatenados como string.
 */
export async function execCommand(
  host: string,
  username: string,
  password: string,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = "";

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) return reject(err);

          stream.on("data", (data: Buffer) => { output += data.toString(); });
          stream.stderr.on("data", (data: Buffer) => { output += data.toString(); });
          stream.on("close", () => {
            conn.end();
            resolve(output);
          });
        });
      })
      .on("error", (e) => reject(e))
      .connect({ host, port: 22, username, password });
  });
}

/**
 * Execução detalhada via senha com cwd/timeout/truncamento.
 */
export async function execCommandDetailed(
  host: string,
  username: string,
  password: string,
  command: string,
  port = 22,
  timeoutMs = 30_000,
  cwd?: string,
  maxBytes = 1_000_000 // 1 MB padrão por stream
): Promise<{ stdout: string; stderr: string; code: number | null; durationMs: number; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdoutBuf = Buffer.alloc(0);
    let stderrBuf = Buffer.alloc(0);
    let truncated = false;

    const started = Date.now();
    let to: NodeJS.Timeout | undefined;

    const onError = (e: Error) => { if (to) clearTimeout(to); reject(e); };

    const safeCwd = cwd ? cwd.replace(/'/g, "'\\''") : undefined;
    const finalCmd = safeCwd ? `cd '${safeCwd}' && ${command}` : command;

    conn.on("ready", () => {
      to = setTimeout(() => {
        try { conn.end(); } catch {}
        onError(new Error("exec timeout"));
      }, timeoutMs);

      conn.exec(finalCmd, (err, stream) => {
        if (err) return onError(err);

        const push = (dest: "out" | "err", chunk: Buffer) => {
          const cur = dest === "out" ? stdoutBuf : stderrBuf;
          let next = Buffer.concat([cur, chunk]);
          if (next.length > maxBytes) { next = next.subarray(0, maxBytes); truncated = true; }
          if (dest === "out") stdoutBuf = next; else stderrBuf = next;
        };

        stream.on("data", (d: Buffer) => push("out", d));
        stream.stderr.on("data", (d: Buffer) => push("err", d));

        stream.on("close", (code: number | null) => {
          if (to) clearTimeout(to);
          conn.end();
          resolve({
            stdout: stdoutBuf.toString("utf8"),
            stderr: stderrBuf.toString("utf8"),
            code,
            durationMs: Date.now() - started,
            truncated
          });
        });
      });
    })
    .on("error", onError)
    .connect({ host, port, username, password });
  });
}

/**
 * Execução via chave PEM (passphrase opcional), com timeout/truncamento.
 */
export async function execWithKey(
  host: string,
  username: string,
  privateKeyPem: string,
  command: string,
  passphrase?: string,
  port = 22,
  timeoutMs = 30_000,
  maxBytes = 1_000_000
): Promise<{ stdout: string; stderr: string; code: number | null; durationMs: number; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdoutBuf = Buffer.alloc(0);
    let stderrBuf = Buffer.alloc(0);
    let truncated = false;

    const started = Date.now();
    let to: NodeJS.Timeout | undefined;

    const onError = (e: Error) => { if (to) clearTimeout(to); reject(e); };

    conn.on("ready", () => {
      to = setTimeout(() => {
        try { conn.end(); } catch {}
        onError(new Error("exec timeout"));
      }, timeoutMs);

      conn.exec(command, (err, stream) => {
        if (err) return onError(err);

        const push = (dest: "out" | "err", chunk: Buffer) => {
          const cur = dest === "out" ? stdoutBuf : stderrBuf;
          let next = Buffer.concat([cur, chunk]);
          if (next.length > maxBytes) { next = next.subarray(0, maxBytes); truncated = true; }
          if (dest === "out") stdoutBuf = next; else stderrBuf = next;
        };

        stream.on("data", (d: Buffer) => push("out", d));
        stream.stderr.on("data", (d: Buffer) => push("err", d));

        stream.on("close", (code: number | null) => {
          if (to) clearTimeout(to);
          conn.end();
          resolve({
            stdout: stdoutBuf.toString("utf8"),
            stderr: stderrBuf.toString("utf8"),
            code,
            durationMs: Date.now() - started,
            truncated
          });
        });
      });
    })
    .on("error", onError)
    .connect({
      host,
      port,
      username,
      privateKey: privateKeyPem,
      ...(passphrase ? { passphrase } : {}) // não envia undefined
    });
  });
}

/**
 * Execução via chave PEM com cwd/timeout/truncamento.
 */
export async function execWithKeyDetailed(
  host: string,
  username: string,
  privateKeyPem: string,
  command: string,
  passphrase?: string,
  port = 22,
  timeoutMs = 30_000,
  cwd?: string,
  maxBytes = 1_000_000
): Promise<{ stdout: string; stderr: string; code: number | null; durationMs: number; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdoutBuf = Buffer.alloc(0);
    let stderrBuf = Buffer.alloc(0);
    let truncated = false;

    const started = Date.now();
    let to: NodeJS.Timeout | undefined;

    const bail = (e: Error) => { if (to) clearTimeout(to); reject(e); };

    const safeCwd = cwd ? cwd.replace(/'/g, "'\\''") : undefined;
    const finalCmd = safeCwd ? `cd '${safeCwd}' && ${command}` : command;

    conn.on("ready", () => {
      to = setTimeout(() => {
        try { conn.end(); } catch {}
        bail(new Error("exec timeout"));
      }, timeoutMs);

      conn.exec(finalCmd, (err, stream) => {
        if (err) return bail(err);

        const push = (dest: "out" | "err", chunk: Buffer) => {
          const cur = dest === "out" ? stdoutBuf : stderrBuf;
          let next = Buffer.concat([cur, chunk]);
          if (next.length > maxBytes) { next = next.subarray(0, maxBytes); truncated = true; }
          if (dest === "out") stdoutBuf = next; else stderrBuf = next;
        };

        stream.on("data", (d: Buffer) => push("out", d));
        stream.stderr.on("data", (d: Buffer) => push("err", d));

        stream.on("close", (code: number | null) => {
          if (to) clearTimeout(to);
          conn.end();
          resolve({
            stdout: stdoutBuf.toString("utf8"),
            stderr: stderrBuf.toString("utf8"),
            code,
            durationMs: Date.now() - started,
            truncated
          });
        });
      });
    })
    .on("error", bail)
    .connect({
      host,
      port,
      username,
      privateKey: privateKeyPem,
      ...(passphrase ? { passphrase } : {}) // não envia undefined (exactOptionalPropertyTypes)
    });
  });
}
