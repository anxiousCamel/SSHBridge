# SSHBridge

Um microserviço em **Node.js + TypeScript** que expõe uma API REST para executar comandos **SSH**, transferir arquivos via **SFTP** e coletar informações de hosts remotos de forma segura.

---

<!-- Badges do stack -->
<p align="left">
  <a href="https://nodejs.org/">
    <img alt="Node.js >= 20" src="https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=nodedotjs&logoColor=white">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img alt="TypeScript 5.x" src="https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript&logoColor=white">
  </a>
  <a href="https://fastify.dev/">
    <img alt="Fastify 5.x" src="https://img.shields.io/badge/fastify-5.x-000000?logo=fastify&logoColor=white">
  </a>
  <a href="https://www.npmjs.com/package/ssh2">
    <img alt="ssh2 1.x" src="https://img.shields.io/badge/ssh2-1.x-4B275F">
  </a>
  <a href="https://www.npmjs.com/package/zod">
    <img alt="Zod 3.x" src="https://img.shields.io/badge/zod-3.x-3E67B1">
  </a>
  <a href="https://www.npmjs.com/package/p-limit">
    <img alt="p-limit 6.x" src="https://img.shields.io/badge/p--limit-6.x-8A2BE2?logo=npm&logoColor=white">
  </a>
  <img alt="SFTP" src="https://img.shields.io/badge/SFTP-supported-00B4D8">
  <img alt="API JSON" src="https://img.shields.io/badge/API-JSON-333333">
</p>

<!-- Gráfico Mermaid (compatível com GitHub) -->
```mermaid
  %%{init: {'flowchart': {'htmlLabels': false}} }%%
flowchart LR
  A[Cliente REST: curl / Postman / UI] -->|JSON| B[Fastify server - src/server.ts]

  subgraph R0[Rotas]
    direction TB

    subgraph R1[src/routes/ssh.routes.ts]
      RT1[/POST /v1/ssh/test/]
      RT2[/POST /v1/ssh/exec/]
      RT3[/POST /v1/ssh/exec-key/]
      RT4[/POST /v1/ssh/facts/]
    end

    subgraph R2[src/routes/sftp.routes.ts]
      RS1[/POST /v1/sftp/upload/]
      RS2[/POST /v1/sftp/download/]
    end

    subgraph R3[src/routes/batch.routes.ts]
      RB1[/POST /v1/batch/exec/]
    end
  end

  B --> R1
  B --> R2
  B --> R3

  subgraph S[Services]
    direction TB
    S1[ssh.service.ts]
    S2[sftp.service.ts]
    S3[batch.service.ts]
    S4[facts.service.ts]
  end

  %% mapeamento rotas -> serviços
  RT1 --> S1
  RT2 --> S1
  RT3 --> S1
  RT4 --> S4
  RS1 --> S2
  RS2 --> S2
  RB1 --> S3

  %% dependências entre serviços
  S4 --> S1
  S3 --> S1
  S4 --> C[(utils/lru.ts)]

  %% alvos finais
  S1 --> H[(Hosts via SSH)]
  S2 --> H


```

## 🚀 Funcionalidades

* **Execução de comandos via SSH**

  * Suporte a autenticação por **senha** ou **chave privada**.
  * Timeout e limite de saída configuráveis.

* **Transferência de arquivos via SFTP**

  * Upload e download de arquivos remotos.
  * Controle de diretórios e permissões.

* **Coleta de informações do sistema (Facts)**

  * Kernel e versão do SO.
  * Tempo de atividade (uptime).
  * Informações de disco, memória e IPs.

* **Batch**

  * Execução de múltiplos comandos em paralelo sobre diversos hosts.

* **Cache com LRU**

  * Armazenamento temporário de informações coletadas para evitar sobrecarga.

---

## 📂 Estrutura do Projeto

```
SSHBRIDGE/
├── src/
│   ├── routes/
│   │   └── ssh.routes.ts      # Definição das rotas da API
│   ├── services/
│   │   ├── batch.service.ts   # Execução em lote
│   │   ├── facts.service.ts   # Coleta de informações de sistema
│   │   ├── sftp.service.ts    # Upload/download via SFTP
│   │   └── ssh.service.ts     # Conexões e execuções SSH
│   └── utils/
│       ├── lru.ts             # Implementação de cache LRU
│       └── server.ts          # Inicialização do servidor Fastify
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sshbridge.git
cd sshbridge

# Instale as dependências
npm install

# Compile o TypeScript
npm run build

# Execute em modo desenvolvimento
npm run dev
```

---

## 📡 Endpoints

### Executar comando via senha

```http
POST /v1/ssh/exec
```

**Body:**

```json
{
  "host": "192.168.1.10",
  "username": "user",
  "password": "senha123",
  "command": "ls -la"
}
```

### Executar comando via chave privada

```http
POST /v1/ssh/exec-key
```

**Body:**

```json
{
  "host": "192.168.1.10",
  "username": "user",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
  "command": "uptime"
}
```

### Coletar informações do host (facts)

```http
POST /v1/ssh/facts
```

**Body:**

```json
{
  "host": "192.168.1.10",
  "username": "user",
  "password": "senha123"
}
```

**Resposta:**

```json
{
  "kernel": "Linux 5.15.0-84-generic x86_64",
  "os": "Ubuntu 22.04 LTS",
  "uptime": "up 5 days, 2 hours",
  "disks": "...",
  "memory": "...",
  "ip4": "eth0 192.168.1.10/24",
  "collectedAt": "2025-08-17T15:30:00.000Z"
}
```

### Transferência de arquivos (SFTP)

* **Upload:** `POST /v1/sftp/upload`
* **Download:** `POST /v1/sftp/download`

### Execução em lote

```http
POST /v1/batch/exec
```

**Body:**

```json
{
  "targets": [
    {"host": "192.168.1.10", "username": "user", "password": "123"},
    {"host": "192.168.1.11", "username": "user", "password": "456"}
  ],
  "command": "df -h"
}
```

---

## 🛠 Tecnologias Utilizadas

* **Node.js** + **TypeScript**
* **Fastify** (servidor HTTP)
* **ssh2** (conexão SSH e SFTP)
* **LRU Cache** (otimização de consultas repetidas)

---

## 📜 Licença

Este projeto é distribuído sob a licença **MIT**. Sinta-se livre para usar e modificar.
