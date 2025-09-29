#!/usr/bin/env node
const os = require("os");
const path = require("path");
const pty = require("node-pty");
const fs = require("fs").promises;
const fastify = require("fastify")({ logger: false });
const { writeClipboardImages } = require("clipboard-image");

fastify.register(require("@fastify/cors"), {
  origin: true,
});

const requestQueue = [];
let isProcessingQueue = false;
let claudePty = null;

let onImagePasted = null;

function startClaudeProcess() {
  if (claudePty) {
    return claudePty;
  }

  claudePty = pty.spawn("claude", [], {
    name: "xterm-256color",
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    cwd: process.cwd(),
    env: process.env,
  });

  claudePty.onData((data) => {
    process.stdout.write(data);

    if (data.includes("[Image #1]") && onImagePasted) {
      onImagePasted();
    }
  });

  claudePty.onExit(({ exitCode }) => {
    claudePty = null;
    process.exit(exitCode);
  });

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key) => {
    if (claudePty) {
      claudePty.write(key);
    }
  });

  process.stdout.on("resize", () => {
    claudePty.resize(process.stdout.columns || 80, process.stdout.rows || 30);
  });

  return claudePty;
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    const claude = startClaudeProcess();

    if (claude) {
      try {
        if (request.image) {
          const base64Data = request.image.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          );
          const buffer = Buffer.from(base64Data, "base64");

          const tempFilePath = path.join(
            os.tmpdir(),
            `claude-devtools-${Date.now()}.png`
          );
          await fs.writeFile(tempFilePath, buffer);

          await writeClipboardImages([tempFilePath]);

          claude.write("\u0016");

          await fs.unlink(tempFilePath);

          await new Promise((r) => {
            onImagePasted = r;
          });

          claude.write(" ");
        }

        await typeSlowly(claude, request.prompt);
      } catch (error) {
        claude.kill();
        console.clear();
        console.error(error);
        process.exit(1);
      }
    }
  }

  isProcessingQueue = false;
}

async function typeSlowly(pty, text) {
  for (const char of text) {
    pty.write(char);
    await new Promise((r) => setTimeout(r, 1 + Math.random() * 2));
  }

  await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  pty.write("\r");
}

fastify.post("/prompt", async (request, reply) => {
  try {
    const { prompt = "", image = null } = request.body;

    requestQueue.push({ prompt, image });
    processQueue();

    return {
      status: "queued",
      message: "Prompt queued for processing",
      queueLength: requestQueue.length,
    };
  } catch (error) {
    reply.code(500).send({ error: "Internal server error" });
  }
});

fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
    claude: claudeProcess ? "running" : "stopped",
    queueLength: requestQueue.length,
  };
});

const start = async () => {
  try {
    const port = process.env.PORT || 47923;
    await fastify.listen({ port, host: "127.0.0.1" });
    startClaudeProcess();
  } catch (err) {
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  if (claudePty) {
    claudePty.kill();
  }
  fastify.close();
});

start();
