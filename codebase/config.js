const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

function getProvider(override) {
  const provider = override || process.env.AI_PROVIDER || "auto";
  if (provider === "auto") {
    if (process.env.OPENROUTER_API_KEY) return "openrouter";
    if (process.env.OPENAI_API_KEY) return "openai";
    return "local-rules";
  }
  if (!["openrouter", "openai", "local-rules"].includes(provider)) {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
  return provider;
}

module.exports = { getProvider };
