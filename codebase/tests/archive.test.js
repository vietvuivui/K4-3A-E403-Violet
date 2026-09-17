const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {parseCsvFile,normalizeRows,parseReports} = require("../archive");
const {retrieve} = require("../retrieval");
const {localDecision,validateDecision,buildPrompt} = require("../decision_engine");
const {classifyLocal} = require("../importance");

function row(overrides={}) {
  return {msg_id:"TEST001",guild:"Test-A",channel:"channel_01",author:"D0001",is_bot:"False",msg_type:"message",
    created_at_vn:"2026-09-12 08:00",reply_to:"",mentions_bot:"False",n_attachments:"0",content:"synthetic deadline lab",...overrides};
}

test("CSV native parser preserves multiline, commas, escaped quotes and Unicode", t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"violet-csv-"));
  const file=path.join(dir,"quoted data.csv");
  const content='msg_id,content\r\nTEST001,"D\u00f2ng 1, \"\"quoted\"\"\r\nD\u00f2ng 2"\r\n';
  fs.writeFileSync(file,content,"utf8");
  t.after(()=>{fs.unlinkSync(file);fs.rmdirSync(dir);});
  const parsed=parseCsvFile(file);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].content,'D\u00f2ng 1, "quoted"\r\nD\u00f2ng 2');
});

test("keep duplicate source IDs and do not invent ambiguous reply links", ()=>{
  const messages=normalizeRows([
    row(),row({created_at_vn:"2026-09-12 09:00",content:"second occurrence"}),
    row({msg_id:"TEST002",reply_to:"TEST001",msg_type:"reply"}),
    row({guild:"Test-B"}),row({guild:"Test-B",msg_id:"TEST003",reply_to:"TEST001",msg_type:"reply"}),
    row({msg_id:"TEST004",reply_to:"NOT_IN_PACK",msg_type:"reply"})
  ]);
  assert.equal(new Set(messages.map(m=>m.id)).size,6);
  assert.equal(messages.find(m=>m.source_id==="TEST002").reply_state,"ambiguous");
  assert.equal(messages.find(m=>m.source_id==="TEST003").reply_state,"resolved");
  assert.equal(messages.find(m=>m.source_id==="TEST004").reply_state,"missing");
  assert.ok(messages.every(m=>m.timestamp.endsWith("+07:00")));
  assert.equal(messages[0].author,"D0001");
  assert.equal(normalizeRows([row()])[0].id,normalizeRows([row()])[0].id);
});

test("report sections preserve raw bot text without treating it as policy", ()=>{
  const markdown="# Title\n\n## K4-L2-3 \u00b7 b\u1ea3n tin g\u1eedi 2026-09-13\n\nRaw baseline text\n\n---\n\n## K4-L3-4 \u00b7 b\u1ea3n tin g\u1eedi 2026-09-14\n\nOther baseline text\n";
  const reports=parseReports(markdown);
  assert.equal(reports.length,2);
  assert.equal(reports[0].text,"Raw baseline text");
  assert.equal(reports[1].guild,"K4-L3-4");
});

test("retrieval respects guild, channel and date while retaining reply context", ()=>{
  const messages=normalizeRows([
    row(),row({msg_id:"TEST002",content:"synthetic response",is_bot:"True",reply_to:"TEST001",msg_type:"reply"}),
    row({guild:"Test-B",content:"deadline lab"}),
    row({msg_id:"TEST004",created_at_vn:"2026-09-13 08:00"}),
    row({msg_id:"TEST005",channel:"channel_02"})
  ]);
  const found=retrieve("deadline lab",messages,{guild:"Test-A",channel:"channel_01",date:"2026-09-12"});
  assert.equal(found.length,2);
  assert.ok(found.some(m=>m.source_id==="TEST002"));
  assert.equal(retrieve("nonsensewithoutmatch",messages).length,0);
  assert.equal(localDecision("deadline lab",found).status,"needs_review");
  assert.equal(localDecision("unmatched",[]).status,"no_evidence");
  const prompt=buildPrompt("deadline lab",found);
  assert.ok(prompt.includes("UTC+7"));
  assert.equal(prompt.includes("Test-B"),false);
});

test("AI cannot cite unknown IDs or fabricate source quotes", ()=>{
  const evidence=normalizeRows([row({is_bot:"True"})]);
  const base={status:"answer",answer:"Test answer",confidence:0.9,sources:[{id:evidence[0].id,channel:evidence[0].channel,quote:"invented quote"}]};
  const result=validateDecision(base,evidence,"openrouter","test-model");
  assert.equal(result.sources[0].quote,evidence[0].text);
  assert.equal(result.status,"needs_review");
  assert.throws(()=>validateDecision({...base,sources:[]},evidence,"openrouter","test"));
  assert.throws(()=>validateDecision({...base,sources:[{id:"invented",channel:"channel_01"}]},evidence,"openrouter","test"));
});

test("onboarding categories and bot uncertainty", ()=>{
  for(const [text,category] of [["diem danh XP","attendance"],["mo ticket ho tro","support"],["ghep doi phoenix","team"],["cai dat CVAT","lab"]]) {
    assert.equal(classifyLocal({id:"test",text,channel:"channel_01"}).category,category);
  }
  assert.equal(classifyLocal({id:"test",text:"Deadline lab",bot:true}).needs_review,true);
});
