const { test } = require("node:test");
const assert = require("node:assert/strict");
const { detectImportance, classifyLocal, validateMessages } = require("../importance");
const { answerQuestion } = require("../decision_engine");
const { getProvider } = require("../config");

const message = text => ({ id: "test-1", channel: "project", text });

test("local categories identify logistics, not acknowledgements", () => {
  for (const [text, category] of [
    ["Cap nhat lich hoc 08:30 phong A305", "schedule"],
    ["Hoan thanh truoc 18/09", "deadline"],
    ["Minh nhan API Login", "assignment"],
    ["Chot FastAPI cho backend", "decision"],
    ["Thong bao bat buoc tham gia", "announcement"]
  ]) {
    const result = classifyLocal(message(text));
    assert.equal(result.important, true);
    assert.equal(result.category, category);
  }
  assert.equal(classifyLocal(message("Ok cam on moi nguoi")).important, false);
});

test("Vietnamese accents and uncertain logistics are handled", () => {
  assert.equal(classifyLocal(message("H\u1ea1n n\u1ed9p b\u00e0i 18/09")).category, "deadline");
  for (const text of ["Chua co deadline moi", "Mai hop nhom", "Lich cu: 08:00 A203", "Deadline la ngay nao?"]) {
    assert.equal(classifyLocal(message(text)).needs_review, true, text);
  }
});

test("reject invalid, duplicate, oversized message inputs", () => {
  assert.throws(() => validateMessages(null));
  assert.throws(() => validateMessages([message(" ")]));
  assert.throws(() => validateMessages([message("x".repeat(6001))]));
  assert.throws(() => validateMessages([message("a"), message("b")]));
  assert.throws(() => validateMessages(Array(101).fill(message("hi"))));
  assert.throws(() => validateMessages([{ ...message("hi"), id:'" onclick="bad' }]));
});

test("OpenRouter transport, classification, Q&A and explicit failure", async (t) => {
  t.mock.method(globalThis, "fetch");
  const previous = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "unit-test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previous;
  });
  const item = { id:"test-1", channel:"project", important:true, category:"deadline", needs_review:false, reason:"Confirmed due date" };
  let output = { items:[item] };
  globalThis.fetch.mock.mockImplementation(async (url, options) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer unit-test-key");
    const body = JSON.parse(options.body);
    assert.ok(body.model);
    assert.equal(body.response_format.type, "json_object");
    assert.equal(body.messages[0].role, "system");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify({ choices:[{message:{content:JSON.stringify(output)}}] }));
  });
  assert.equal(getProvider("auto"), "openrouter");
  const result = await detectImportance([message("Deadline 18/09")], { provider:"openrouter" });
  assert.equal(result.provider, "openrouter");
  assert.deepEqual(result.items, [item]);
  output = { items:[] };
  await assert.rejects(detectImportance([message("Deadline")], { provider:"openrouter" }), /Incomplete/);
  output = { items:[{...item,id:"invented"}] };
  await assert.rejects(detectImportance([message("Deadline")], { provider:"openrouter" }), /Invalid/);
  const archiveMessages = [{...message("Deadline 18/09"),source_id:"TEST01",guild:"test-guild",timestamp:"2026-09-10T08:00:00+07:00",time:"2026-09-10 08:00",bot:false}];
  output = { status:"answer", answer:"18/09", confidence:0.9, sources:[{id:"test-1",channel:"project"}], rationale:"Source provided", intent:"deadline" };
  assert.equal((await answerQuestion("Deadline?", { provider:"openrouter", archiveMessages })).answer, "18/09");
  globalThis.fetch.mock.mockImplementation(async () => new Response(JSON.stringify({error:{message:"Unauthorized"}}), {status:401}));
  await assert.rejects(answerQuestion("Lich hoc?", {provider:"openrouter",archiveMessages}), /Unauthorized/);
  await assert.rejects(detectImportance([message("Deadline")], {provider:"openrouter"}), /Unauthorized/);
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(answerQuestion("Lich hoc?", {provider:"openrouter",archiveMessages}), /not set/);
});
