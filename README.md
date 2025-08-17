# SSHBRIDGE

API em Node.js + TypeScript para automação via SSH, SFTP, coleta de fatos do host e execução em lote.
Foi construída usando **Fastify** como servidor HTTP e **ssh2** como cliente SSH.

---

## 🚀 Funcionalidades

* **Execução de comandos via senha** (`/v1/ssh/exec`)
* **Execução de comandos via chave privada** (`/v1/ssh/exec-key`)
* **Teste de conexão SSH** sem execução de comandos
* **SFTP** (upload/download de arquivos)
* **Coleta de fatos do host** (kernel, OS, uptime, memória, disco, rede)
* **Execução em lote** em múltiplos hosts
* **Cache em LRU** para otimizar chamadas repetidas

---

## 📂 Estrutura de Pastas

```
SSHBRIDGE/
├── src/
│   ├── routes/
│   │   └── ssh.routes.ts      # Rotas HTTP da API SSH
│   ├── services/
│   │   ├── ssh.service.ts     # Execução de comandos SSH
│   │   ├── sftp.service.ts    # Upload/download via SFTP
│   │   ├── facts.service.ts   # Coleta informações do host
│   │   └── batch.service.ts   # Execução em múltiplos hosts
│   └── utils/
│       ├── lru.ts             # Implementação de cache LRU
│       └── server.ts          # Inicialização do servidor Fastify
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sshbridge.git
cd sshbridge

# Instale as dependências
npm install
```

---

## ▶️ Executando

### Desenvolvimento

```bash
npm run dev
```

### Compilar para JavaScript

```bash
npm run build
```

### Produção

```bash
npm start
```

O servidor será iniciado em `http://localhost:3000`.

---

## 🔑 Exemplos de Uso

### Execução de comando com senha

```bash
curl -X POST http://localhost:3000/v1/ssh/exec \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.0.10",
    "username": "root",
    "password": "senha123",
    "command": "ls -la"
  }'
```

### Execução de comando com chave privada

```bash
curl -X POST http://localhost:3000/v1/ssh/exec-key \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.0.10",
    "username": "root",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
    "command": "uptime"
  }'
```

---

## 📌 Scripts no `package.json`

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js"
}
```

---

## 🛠️ Tecnologias

* [Node.js](https://nodejs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Fastify](https://fastify.dev/)
* [ssh2](https://www.npmjs.com/package/ssh2)

---

## 📌 Roadmap (melhorias futuras)

* Logs persistentes por host
* Painel de status em tempo real (WebSocket)
* Filtros avançados para batch
* Autenticação JWT na API
