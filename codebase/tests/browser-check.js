// Optional: requires Chrome and Playwright. No archive content is embedded in this file.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

async function main(){
  const browser=await chromium.launch({channel:"chrome",headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:960}});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    const base=process.env.TEST_URL || "http://127.0.0.1:5173";
    const response=await page.request.get(`${base}/api/workspace`);
    assert.equal(response.status(),200);
    const archive=await response.json();
    assert.ok(archive.messages.length > 0);
    assert.equal(new Set(archive.messages.map(m=>m.id)).size,archive.messages.length);
    assert.equal(archive.stats.messages,archive.messages.length);
    for(const resource of ["/.env","/data/discord_archive.json","/discord-pack/k4_messages.csv"]){
      assert.equal((await page.request.get(`${base}${resource}`)).ok(),false);
    }
    assert.equal((await page.request.post(`${base}/api/importance`,{data:{ids:["unknown"]}})).status(),400);
    await page.goto(base);
    await page.locator(".message").first().waitFor();
    assert.equal(await page.locator("#guildRail .guild-icon").count(),archive.guilds.length);
    assert.ok(await page.locator("#membersPanel").isVisible());
    fs.mkdirSync(path.join(__dirname,"../logs"),{recursive:true});
    await page.screenshot({path:path.join(__dirname,"../logs/discord-default.png")});
    const formatting=await page.evaluate(()=>{
      const box=document.createElement("div");
      box.innerHTML=renderRichText('**bold** and `code` [@BOT]\n\n[unsafe](javascript:alert(1)) <img src=x onerror=alert(1)> ![remote](https://example.com/a.png) [safe](https://example.com)');
      return {bold:box.querySelector("strong")?.textContent,code:box.querySelector("code")?.textContent,mention:box.querySelector(".mention")?.textContent,unsafe:box.querySelectorAll('script,img,[onerror],a[href^="javascript:"]').length,link:box.querySelector("a")?.href};
    });
    assert.deepEqual(formatting,{bold:"bold",code:"code",mention:"[@BOT]",unsafe:0,link:"https://example.com/"});
    await page.locator("#railInfo").click();
    assert.ok(await page.locator("#archiveInfo").isVisible());
    await page.locator("#closeArchiveInfo").click();
    const author=await page.locator(".member-row").nth(1).getAttribute("data-author");
    await page.locator(".member-row").nth(1).click();
    assert.equal(await page.locator("#messageSearch").inputValue(),author);
    const selectedGuild=await page.locator("#guildSelect").inputValue();
    await page.locator(`#guildRail [data-guild='${selectedGuild}']`).click();
    assert.equal(await page.locator(".channel-btn").count(),archive.guilds.find(g=>g.id===archive.guilds.slice().sort((a,b)=>b.count-a.count)[0].id).channels.length);
    const firstId=await page.locator(".message").first().getAttribute("data-message-id");
    const first=archive.messages.find(m=>m.id===firstId);
    await page.locator(`#${firstId}`).hover();
    await page.locator(`#${firstId} [data-quote-id]`).click();
    assert.ok((await page.locator("#composerInput").inputValue()).includes(first.source_id));
    await page.locator("#composerInput").fill("");
    await page.locator(`#${firstId} [data-pin-id]`).click();
    assert.equal(await page.locator("#pinCount").textContent(),"1");
    await page.reload();
    await page.locator(".message").first().waitFor();
    assert.equal(await page.locator("#pinCount").textContent(),"1");
    await page.locator("#openPins").click();
    assert.equal(await page.locator("#pinsList .pinned-item").count(),1);
    await page.locator("#pinSearch").fill("zzzz-no-match-zzzz");
    assert.equal(await page.locator("#pinsList .pinned-item").count(),0);
    await page.locator("#pinSearch").fill(first.source_id);
    assert.equal(await page.locator("#pinsList .pinned-item").count(),1);
    await page.locator(`#pinsList [data-origin-id='${firstId}']`).click();
    assert.ok((await page.locator("#viewTitle").textContent()).includes(first.channel));
    await page.locator("#toggleFilters").click();
    await page.locator("#dateFilter").selectOption(first.date);
    await page.locator("#authorFilter").selectOption(first.bot ? "bot" : "human");
    for(const id of await page.locator(".message").evaluateAll(nodes=>nodes.map(n=>n.dataset.messageId))){
      const message=archive.messages.find(m=>m.id===id);
      assert.equal(message.date,first.date);assert.equal(message.bot,first.bot);
    }
    await page.locator("#clearFilters").click();
    await page.locator("#messageSearch").fill(first.source_id);
    assert.ok((await page.locator(".message").count()) >= 1);
    await page.locator("#clearFilters").click();
    const reply=archive.messages.find(m=>m.reply_id && m.guild===first.guild && m.channel===first.channel);
    assert.ok(reply);
    await page.locator("#messageSearch").fill(reply.source_id);
    await page.locator(`#${reply.id} .reply-preview`).click();
    await page.locator(`#${reply.reply_id}`).waitFor();
    assert.equal(await page.locator("#messageSearch").inputValue(),"");
    await page.locator("#reportsView").click();
    assert.equal(await page.locator(".report").count(),archive.reports.filter(r=>r.guild===first.guild).length);
    await page.locator("#guildSelect").selectOption(archive.guilds.find(g=>g.id!==first.guild).id);
    assert.ok((await page.locator(".channel-btn").count()) > 0);
    await page.locator("#importantTab").click();
    await page.locator("#pinSearch").fill("");
    assert.ok((await page.locator("#pinsList .pinned-item").count()) > 0);
    await page.locator("#pinChannel").selectOption(`${first.guild}/${first.channel}`);
    for(const id of await page.locator("#pinsList [data-pin-id]").evaluateAll(nodes=>nodes.map(n=>n.dataset.pinId))){
      assert.equal(archive.messages.find(m=>m.id===id).channel,first.channel);
    }
    await page.locator("#pinChannel").selectOption("");
    fs.mkdirSync(path.join(__dirname,"../logs"),{recursive:true});
    await page.screenshot({path:path.join(__dirname,"../logs/archive-desktop.png")});
    await page.setViewportSize({width:390,height:844});
    await page.locator("#closePins").click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
    await page.screenshot({path:path.join(__dirname,"../logs/archive-mobile.png")});
    await page.locator("#openNavigation").click();
    await page.locator("#guildSelect").selectOption(first.guild);
    await page.locator("#openPins").click();
    await page.locator("#savedTab").click();
    await page.locator(`#pinsList [data-pin-id='${firstId}']`).click();
    assert.equal(await page.locator("#pinCount").textContent(),"0");
    await page.locator("#closePins").click();
    if(archive.provider === "local-rules"){
      await page.locator("#askScope").selectOption("all");
      await page.locator("#composerInput").fill("deadline lab");
      await page.locator("#sendMessage").click();
      await page.locator(".answer-source").first().waitFor();
      assert.ok((await page.locator(".answer").textContent()).includes("cục bộ"));
      await page.locator(".answer-source .source-link").first().click();
      assert.ok((await page.locator(".message.highlight").count()) > 0);
    }
    assert.deepEqual(errors,[]);
    const mobile=await browser.newPage({viewport:{width:320,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    mobile.on("pageerror",error=>errors.push(error.message));
    await mobile.goto(base);
    await mobile.locator(".message").first().waitFor();
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok(await mobile.locator(".message-tools").last().isVisible());
    await mobile.screenshot({path:path.join(__dirname,"../logs/discord-mobile-touch.png")});
    await mobile.locator("#openPins").click();
    const mobilePanel=await mobile.locator("#pinsPanel").boundingBox();
    assert.ok(mobilePanel.x>=0 && mobilePanel.x+mobilePanel.width<=320);
    await mobile.locator("#closePins").click();
    await mobile.close();
    assert.deepEqual(errors,[]);
    console.log(`Archive UI passed (${archive.messages.length} rows): guilds, dates, authors, source search, replies, reports, pins, reload, mobile, scoped retrieval.`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
