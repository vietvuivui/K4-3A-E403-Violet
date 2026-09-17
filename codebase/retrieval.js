const { normalizeText } = require("./text");
const STOP = new Set("toi minh em anh chi ban cac co la va cua cho voi thi duoc khong nhu the nao gi bao nhieu hoi ve xin mot nhung nay do a oi nhe nhe bot hv".split(" "));

function retrieve(question, messages, scope = {}) {
  const pool = messages.filter(m => (!scope.guild || m.guild === scope.guild) &&
    (!scope.channel || m.channel === scope.channel) && (!scope.date || m.date === scope.date));
  const tokens = [...new Set(normalizeText(question).split(" ").filter(t => t.length > 1 && !STOP.has(t)))];
  if (!tokens.length) return [];
  const documents = pool.map(m => ({m, text:normalizeText(m.text)}));
  const weights = new Map(tokens.map(t => [t, Math.log(1 + pool.length / (1 + documents.filter(d => d.text.split(" ").includes(t)).length))]));
  const ranked = documents.map(({m,text}) => {
    const words = new Set(text.split(" "));
    const matched = tokens.filter(t => words.has(t));
    const score = matched.reduce((sum,t) => sum + weights.get(t), 0) * (matched.length / tokens.length);
    return {m,score,matched:matched.length};
  }).filter(x => x.score > 0 && x.matched >= Math.min(2,tokens.length))
    .sort((a,b) => b.score - a.score || b.m.timestamp.localeCompare(a.m.timestamp)).slice(0,6);
  const selected = new Map();
  for (const {m} of ranked) {
    selected.set(m.id,m);
    const parent = pool.find(p => p.id === m.reply_id);
    if (parent) selected.set(parent.id,parent);
    for (const reply of pool.filter(r => r.reply_id === m.id).slice(0,2)) selected.set(reply.id,reply);
  }
  return [...selected.values()].slice(0,12);
}

module.exports = { retrieve };
