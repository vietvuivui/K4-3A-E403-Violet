const http = require("http");
const fs = require("fs");
const path = require("path");
const { answerQuestion, DECISION_VERSION } = require("./decision_engine");
const { getProvider } = require("./config");
const { detectImportance, classifyLocal } = require("./importance");
const { loadArchive } = require("./archive");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const PROTOTYPE_DIR = path.join(__dirname, "prototype");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeStaticPath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const absolute = path.resolve(PROTOTYPE_DIR, `.${cleanPath}`);
  if (!absolute.startsWith(PROTOTYPE_DIR + path.sep)) return null;
  return absolute;
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/workspace") {
    try {
      const archive = loadArchive();
      sendJson(res, 200, { ...archive, provider:getProvider(),
        importance:Object.fromEntries(archive.messages.map(message => [message.id, classifyLocal(message)])) });
    } catch (error) {
      sendJson(res, 503, { message:error.message });
    }
    return;
  }
  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      provider: getProvider(),
      importance_provider: getProvider() === "openrouter" ? "openrouter" : "local-rules",
      decision_version: DECISION_VERSION
    });
    return;
  }

  if (req.method === "POST" && ["/api/ask", "/api/importance"].includes(req.url)) {
    let payload;
    try {
      const body = await readBody(req);
      payload = body ? JSON.parse(body) : {};
      if (!payload || typeof payload !== "object") throw new Error("Invalid request.");
      if (req.url === "/api/importance") {
        if (!Array.isArray(payload.ids) || !payload.ids.length || payload.ids.length > 30 || new Set(payload.ids).size !== payload.ids.length) {
          throw new Error("Select 1 to 30 unique message ids.");
        }
        const archive = loadArchive();
        payload.messages = payload.ids.map(id => {
          const message = archive.messages.find(m => m.id === id);
          if (!message) throw new Error("Unknown archive message.");
          return message;
        });
      }
      if (payload.scope !== undefined && (!payload.scope || typeof payload.scope !== "object" || Array.isArray(payload.scope))) throw new Error("Invalid scope.");
      const scope = payload.scope || {};
      for (const key of ["guild","channel","date"]) {
        if (scope[key] !== undefined && typeof scope[key] !== "string") throw new Error("Invalid scope field.");
      }
      payload.scope = {guild:scope.guild || "",channel:scope.channel || "",date:scope.date || ""};
      if (req.url === "/api/ask" && (typeof payload.question !== "string" || !payload.question.trim() || payload.question.length > 6000)) {
        throw new Error("Question must contain 1 to 6000 characters.");
      }
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return;
    }
    try {
      const decision = req.url === "/api/importance"
        ? await detectImportance(payload.messages)
        : await answerQuestion(payload.question.trim(), { scope:payload.scope });
      sendJson(res, 200, decision);
    } catch (error) {
      sendJson(res, 502, {
        status: "error",
        message: "Khong the xu ly yeu cau AI. Kiem tra cau hinh provider, API key va ket noi tren server."
      });
    }
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url.split("?")[0]);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    await handleApi(req, res);
    return;
  }
  try { serveStatic(req, res); } catch {
    sendJson(res, 400, { error: "Invalid URL." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Violet Daily Digest prototype: http://${HOST}:${PORT}`);
  console.log(`AI provider: ${getProvider()}`);
});
