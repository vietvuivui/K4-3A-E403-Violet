require("./config");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const PACK_DIR = path.resolve(__dirname, process.env.DISCORD_PACK_DIR || "../discord-pack");
const CACHE_FILE = path.join(__dirname, "data", "discord_archive.json");
const SCHEMA_VERSION = 1;

function parseCsvFile(filename) {
  const output = execFileSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-Command",
    '$ErrorActionPreference="Stop"; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $rows=@(Import-Csv -LiteralPath $env:VIOLET_CSV_INPUT -Encoding UTF8); ConvertTo-Json -InputObject $rows -Depth 8 -Compress'
  ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, windowsHide: true,
    env:{...process.env,VIOLET_CSV_INPUT:filename} });
  return JSON.parse(output.replace(/^\uFEFF/, ""));
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) throw new Error("CSV did not contain message rows.");
  const seen = new Map();
  const messages = rows.map((row, index) => {
    if (!row.msg_id || !row.guild || !row.channel || !row.author || !row.content ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row.created_at_vn)) {
      throw new Error(`Invalid Discord CSV record ${index + 1}.`);
    }
    const base = crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 20);
    const occurrence = (seen.get(base) || 0) + 1;
    seen.set(base, occurrence);
    return {
      id: `msg-${base}-${occurrence}`, source_id: row.msg_id,
      guild: row.guild, channel: row.channel, author: row.author,
      bot: String(row.is_bot).toLowerCase() === "true",
      type: row.msg_type, time: row.created_at_vn,
      date: row.created_at_vn.slice(0,10), timestamp: `${row.created_at_vn.replace(" ","T")}:00+07:00`,
      reply_to: row.reply_to || null, mentions_bot: String(row.mentions_bot).toLowerCase() === "true",
      attachments: Number(row.n_attachments) || 0, text: row.content, row: index + 1
    };
  });
  const bySource = new Map();
  for (const m of messages) {
    const key = `${m.guild}/${m.channel}/${m.source_id}`;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(m);
  }
  for (const m of messages) {
    const candidates = m.reply_to ? bySource.get(`${m.guild}/${m.channel}/${m.reply_to}`) || [] : [];
    // A repeated anonymized source id cannot identify one original reply target reliably.
    m.reply_id = candidates.length === 1 ? candidates[0].id : null;
    m.reply_state = !m.reply_to ? (m.type === "reply" ? "missing" : "none")
      : candidates.length === 1 ? "resolved" : candidates.length ? "ambiguous" : "missing";
  }
  return messages.sort((a,b) => a.timestamp.localeCompare(b.timestamp) || a.row - b.row);
}

function parseReports(markdown) {
  const sections = [...markdown.matchAll(/^## (K4-[\w-]+)\s*.*?bản tin gửi (\d{4}-\d{2}-\d{2})\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
  return sections.map((match, index) => ({ id: `report-${index+1}`, guild: match[1], date: match[2], text: match[3].trim().replace(/\s*---\s*$/, "") }));
}

function buildArchive(rows, reports = [], fingerprint = "test") {
  const messages = normalizeRows(rows);
  const guilds = [...new Set(messages.map(m => m.guild))].sort().map(id => ({
    id, count: messages.filter(m => m.guild === id).length,
    channels: [...new Set(messages.filter(m => m.guild === id).map(m => m.channel))].sort()
  }));
  const dates = [...new Set(messages.map(m => m.date))].sort();
  return {
    version: SCHEMA_VERSION, fingerprint, messages, reports, guilds, dates,
    stats: { messages: messages.length, human: messages.filter(m => !m.bot).length,
      bot: messages.filter(m => m.bot).length, authors: new Set(messages.map(m => m.author)).size,
      channels: new Set(messages.map(m => `${m.guild}/${m.channel}`)).size,
      replies: messages.filter(m => m.type === "reply").length, reports: reports.length }
  };
}

let cached;
function loadArchive() {
  if (cached) return cached;
  const csvPath = path.join(PACK_DIR, "k4_messages.csv");
  if (!fs.existsSync(csvPath)) throw new Error("Discord pack missing: place k4_messages.csv in discord-pack/ or configure DISCORD_PACK_DIR.");
  const reportsPath = path.join(PACK_DIR, "k4_daily_reports.md");
  const reportText = fs.existsSync(reportsPath) ? fs.readFileSync(reportsPath,"utf8") : "";
  const fingerprint = crypto.createHash("sha256").update(fs.readFileSync(csvPath)).update(reportText).digest("hex");
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      if (existing.version === SCHEMA_VERSION && existing.fingerprint === fingerprint) return (cached = existing);
    } catch { /* Rebuild an incomplete cache from the original pack. */ }
  }
  cached = buildArchive(parseCsvFile(csvPath), parseReports(reportText), fingerprint);
  fs.mkdirSync(path.dirname(CACHE_FILE), {recursive:true});
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cached), "utf8");
  return cached;
}

module.exports = { parseCsvFile, normalizeRows, parseReports, buildArchive, loadArchive };
