/** @file SFTP utilities. */
import { Client } from "ssh2";

export async function uploadFile(target:{host:string;username:string;password:string;port?:number}, localPath:string, remotePath:string) {
  const conn = new Client();
  const port = target.port ?? 22;
  return new Promise<void>((resolve, reject) => {
    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(localPath, remotePath, (err2) => {
          conn.end();
          if (err2) return reject(err2);
          resolve();
        });
      });
    }).on("error", reject)
      .connect({ host: target.host, port, username: target.username, password: target.password });
  });
}

export async function downloadFile(target:{host:string;username:string;password:string;port?:number}, remotePath:string, localPath:string) {
  const conn = new Client();
  const port = target.port ?? 22;
  return new Promise<void>((resolve, reject) => {
    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastGet(remotePath, localPath, (err2) => {
          conn.end();
          if (err2) return reject(err2);
          resolve();
        });
      });
    }).on("error", reject)
      .connect({ host: target.host, port, username: target.username, password: target.password });
  });
}
