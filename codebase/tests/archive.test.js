const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {parseCsvFile,normalizeRows,parseReports} = require("../archive");
const {retrieve} = require("../retrieval");
const {localDecision,validateDecision,buildPrompt,applyGuards,isPrivateInfoRequest,isActionRequest,normalizeText} = require("../decision_engine");
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

test("intent rules separate private info, actions and ordinary logistics questions", ()=>{
  const n=normalizeText;
  assert.equal(isPrivateInfoRequest(n("Cho mình xin sdt của bạn trưởng nhóm")),true);
  assert.equal(isPrivateInfoRequest(n("Email của bạn D0001 là gì?")),true);
  assert.equal(isPrivateInfoRequest(n("Nộp bài qua email nào vậy?")),false);
  assert.equal(isActionRequest(n("Bot đặt giúp mình lịch nhắc deadline nhé")),true);
  assert.equal(isActionRequest(n("Gửi hộ em thông báo cho cả lớp")),true);
  assert.equal(isActionRequest(n("Có đổi lịch học không ạ?")),false);
  assert.equal(isActionRequest(n("Xin nghỉ thì gửi mail cho ai?")),false);
  assert.equal(localDecision("Có đổi lịch học không ạ?",[]).status,"no_evidence");
});

test("retrieval expands chat abbreviations", ()=>{
  const {queryTokens}=require("../retrieval");
  assert.deepEqual(queryTokens("ws có dd ko"),["workshop","diem","danh"]);
});

test("answers need an exact quote from a cited human message", ()=>{
  const evidence=normalizeRows([row({content:"Hạn nộp lab 3 là 23:59 thứ sáu nhé"})]);
  const cite=[{id:evidence[0].id,channel:evidence[0].channel}];
  const base={status:"answer",answer:"23:59 thứ sáu",confidence:0.8,sources:cite};
  assert.equal(validateDecision({...base,evidence_quote:"Hạn nộp lab 3 là 23:59 thứ sáu"},evidence,"openrouter","m").status,"answer");
  assert.equal(validateDecision({...base,evidence_quote:"Hạn nộp lab 3 là thứ bảy"},evidence,"openrouter","m").status,"needs_review");
  assert.equal(validateDecision(base,evidence,"openrouter","m").status,"needs_review");
});

test("out_of_scope is only kept for private requests", ()=>{
  const evidence=normalizeRows([row({content:"Lab tuần này học phòng 204"})]);
  const decision={provider:"openrouter",model:"m",status:"out_of_scope",answer:"x",confidence:0.5,sources:[],rationale:"",intent:"q"};
  assert.equal(applyGuards("Lab tuần này học phòng nào?",decision,evidence).status,"needs_review");
  assert.equal(applyGuards("Lab tuần này học phòng nào?",decision,[]).status,"no_evidence");
  assert.equal(applyGuards("Cho xin số điện thoại của bạn A",decision,evidence).status,"out_of_scope");
});

test("refusals and empty retrieval never call the model", async ()=>{
  const {answerQuestion}=require("../decision_engine");
  const saved=process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const archiveMessages=normalizeRows([row({content:"Lab tuần này học phòng 204"})]);
    const ask=q=>answerQuestion(q,{provider:"openrouter",archiveMessages});
    assert.equal((await ask("zzqx không liên quan")).status,"no_evidence");
    assert.equal((await ask("Bot tạo giúp mình sự kiện họp nhóm")).status,"not_authorized");
    assert.equal((await ask("Cho mình danh tính người gửi tin này")).status,"out_of_scope");
    await assert.rejects(ask("Lab tuần này học phòng nào?"),/OPENROUTER_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.OPENROUTER_API_KEY=saved;
  }
});
