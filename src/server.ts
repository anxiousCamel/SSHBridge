import Fastify from "fastify";
import { sshRoutes } from "./routes/ssh.routes";

const app = Fastify();
app.register(sshRoutes);

app.get("/", async () => ({ status: "ok" }));

app.listen({ port: 8080, host: "0.0.0.0" })
  .then(() => console.log("SSH API on :8080"));
