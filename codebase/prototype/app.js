const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const normalize = value => String(value || "").toLowerCase().replace(/đ/g,"d").normalize("NFD").replace(/\p{Diacritic}/gu,"");
const labels = { schedule:"Lịch / Workshop",deadline:"Deadline",assignment:"Phân công",decision:"Quyết định",announcement:"Thông báo",attendance:"Điểm danh / XP",support:"Ticket / Hỗ trợ",team:"Ghép đội",lab:"Lab / CVAT",other:"Trao đổi" };
const storageKey = "violet-discord-archive-v2";
const state = { data:null, guild:"", channel:"", view:"channel", pins:new Set(), importance:{}, aiImportance:{},
  pinView:"saved", limit:40, panelLimit:30, conversations:[], busy:false, analyzing:false };
const viewport = $("messagesViewport");
let toastTimer;

function toast(text){
  $("toast").textContent = text;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"),4200);
}

function persist(){
  try {
    // Store references and user-selected analysis, not a second copy of the raw archive.
    localStorage.setItem(storageKey,JSON.stringify({ fingerprint:state.data.fingerprint,pins:[...state.pins],aiImportance:state.aiImportance }));
  } catch { toast("Không lưu được ghim trên trình duyệt. Ghim mới có thể mất khi tải lại."); }
}

function restore(){
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if(!saved) return;
    const ids = new Set(state.data.messages.map(m => m.id));
    state.pins = new Set((Array.isArray(saved.pins) ? saved.pins : []).filter(id => ids.has(id)));
    if(saved.fingerprint === state.data.fingerprint && saved.aiImportance && typeof saved.aiImportance === "object") {
      for (const [id,item] of Object.entries(saved.aiImportance)) {
        if(ids.has(id) && item && typeof item.important === "boolean" && labels[item.category]) state.aiImportance[id] = item;
      }
    }
    Object.assign(state.importance,state.aiImportance);
  } catch { toast("Không đọc được ghim đã lưu."); }
}

function formatDate(date){ return date.split("-").reverse().join("/"); }
function guildData(){ return state.data.guilds.find(g => g.id === state.guild); }
function channelMessages(){ return state.data.messages.filter(m => m.guild === state.guild && m.channel === state.channel); }
function filteredMessages(){
  const query = normalize($("messageSearch").value.trim());
  return channelMessages().filter(m => (!$("dateFilter").value || m.date === $("dateFilter").value) &&
    (!$("authorFilter").value || (m.bot ? "bot" : "human") === $("authorFilter").value) &&
    (!$("topicFilter").value || state.importance[m.id]?.category === $("topicFilter").value) &&
    (!query || normalize(`${m.text} ${m.author} ${m.source_id}`).includes(query)));
}

function clearFilters(){
  for(const id of ["messageSearch","dateFilter","authorFilter","topicFilter"]) $(id).value = "";
  state.limit = 40;
}

function renderNavigation(){
  const guild = guildData();
  $("guildSelect").value = state.guild;
  $("guildStats").textContent = `${guild.count.toLocaleString("vi")} tin · ${guild.channels.length} kênh`;
  $("channelCount").textContent = guild.channels.length;
  $("reportCount").textContent = state.data.reports.filter(r => r.guild === state.guild).length;
  $("channelList").innerHTML = guild.channels.map(channel => {
    const count = state.data.messages.filter(m => m.guild === state.guild && m.channel === channel).length;
    return `<button class="nav-item channel-btn ${state.view === "channel" && channel === state.channel ? "active" : ""}" data-channel="${escapeHtml(channel)}"><span class="hash">#</span><span>${escapeHtml(channel)}</span><span class="nav-count">${count}</span></button>`;
  }).join("");
  $("assistantView").classList.toggle("active",state.view === "assistant");
  $("reportsView").classList.toggle("active",state.view === "reports");
}

function badge(message){
  const info = state.importance[message.id];
  if(!info?.important) return "";
  return `<span class="topic-badge" title="${escapeHtml(info.reason)}">${escapeHtml(labels[info.category] || "Quan trọng")}</span>${info.needs_review ? '<span class="review-badge">Cần đối chiếu</span>' : ""}`;
}

function pinButton(message){
  const pinned = state.pins.has(message.id);
  return `<button class="icon-btn message-pin" data-pin-id="${message.id}" aria-pressed="${pinned}" aria-label="${pinned ? "Bỏ ghim" : "Ghim tin nhắn"}" title="${pinned ? "Bỏ ghim" : "Ghim tin nhắn"}"><span aria-hidden="true">📌</span></button>`;
}

function messageHtml(m){
  const parent = state.data.messages.find(p => p.id === m.reply_id);
  let reply = "";
  if(parent) reply = `<button class="reply-preview" data-origin-id="${parent.id}"><span aria-hidden="true">↳</span> ${escapeHtml(parent.author)} · ${escapeHtml(parent.source_id)} <span>${escapeHtml(parent.text.slice(0,100))}</span></button>`;
  else if(m.reply_state !== "none") reply = `<div class="reply-missing">↳ ${escapeHtml(m.reply_to || "Tin gốc")} · ${m.reply_state === "ambiguous" ? "Mã nguồn trùng, chưa xác định tin gốc" : "Tin gốc không có trong pack"}</div>`;
  return `<article class="message ${m.bot ? "bot-message" : ""} ${state.pins.has(m.id) ? "is-pinned" : ""}" id="${m.id}" data-message-id="${m.id}">
    <div class="avatar ${m.bot ? "bot-avatar" : ""}" aria-hidden="true">${m.bot ? "B" : escapeHtml(m.author.slice(-2))}</div>
    <div class="message-body">${reply}<div class="message-head"><strong>${escapeHtml(m.author)}</strong>${m.bot ? '<span class="bot-tag">BOT · chưa xác minh</span>' : ""}<time datetime="${m.timestamp}">${m.time.slice(11)}</time><span class="source-id">${escapeHtml(m.source_id)}</span></div>
    <div class="message-text">${escapeHtml(m.text)}</div>
    ${m.attachments ? `<div class="attachment-note">▧ ${m.attachments} tệp đính kèm · Không có nội dung tệp trong pack</div>` : ""}
    <div class="message-labels">${badge(m)}</div></div>${pinButton(m)}</article>`;
}

function renderChannel(highlightId){
  const rows = filteredMessages();
  let shown = rows.slice(-state.limit);
  if(highlightId){
    const index = rows.findIndex(m => m.id === highlightId);
    if(index >= 0){ state.limit = Math.max(state.limit,rows.length-index); shown = rows.slice(-state.limit); }
  }
  $("resultCount").textContent = `${rows.length.toLocaleString("vi")} tin${rows.length > shown.length ? ` · hiển thị ${shown.length} tin gần nhất` : ""}`;
  const humanCount = channelMessages().filter(m => !m.bot).length;
  $("viewMeta").textContent = `${humanCount} tin người · ${channelMessages().length-humanCount} tin bot`;
  let previousDate = "";
  const content = shown.map(m => {
    const divider = previousDate !== m.date ? `<div class="day-divider"><span>${formatDate(m.date)}</span></div>` : "";
    previousDate = m.date;
    return divider + messageHtml(m);
  }).join("");
  viewport.innerHTML = (rows.length > shown.length ? '<button id="loadEarlier" class="load-more">↑ Tin trước đó</button>' : "") + (content || '<div class="empty-state"><strong>Không có tin phù hợp</strong><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>');
  if(highlightId){
    requestAnimationFrame(() => {
      const target = $(highlightId);
      if(target){ target.scrollIntoView({block:"center"});target.classList.add("highlight");setTimeout(()=>target.classList.remove("highlight"),2000); }
    });
  }
}

function renderReports(){
  const reports = state.data.reports.filter(r => r.guild === state.guild);
  $("viewMeta").textContent = `${reports.length} bản tin`;
  viewport.innerHTML = `<div class="reports-view"><div class="view-note"><strong>Bản tin do bot tạo</strong><span>Chưa được xác minh với tin gốc</span></div>${reports.map(r => `<article class="report"><header><h2>Bản tin ${formatDate(r.date)}</h2><span>${escapeHtml(r.guild)}</span></header><div class="report-content">${escapeHtml(r.text)}</div></article>`).join("") || '<p class="empty-state">Không có bản tin trong server này.</p>'}</div>`;
}

function sourceHtml(src){
  const message = state.data.messages.find(m => m.id === src.id);
  if(!message) return "";
  return `<div class="answer-source"><button class="source-link" data-origin-id="${message.id}">${escapeHtml(message.source_id)} · #${escapeHtml(message.channel)} · ${escapeHtml(message.time)} ↗</button><p>${escapeHtml(src.quote || message.text)}</p>${message.bot ? '<span class="bot-tag">Nguồn từ bot · chưa xác minh</span>' : ""}${pinButton(message)}</div>`;
}

function renderAssistant(){
  $("viewMeta").textContent = "Có dẫn nguồn";
  if(!state.conversations.length){
    viewport.innerHTML = '<div class="assistant-empty"><div class="assistant-symbol">✦</div><h2>Tra cứu cuộc thảo luận K4</h2><p>Deadline · Điểm danh & XP · Ghép đội · Lab & CVAT</p></div>';
    return;
  }
  viewport.innerHTML = `<div class="conversation">${state.conversations.map(item => {
    const decision = item.decision;
    return `<article class="question-answer"><div class="question"><span>Bạn</span><p>${escapeHtml(item.question)}</p><small>${escapeHtml(item.scopeLabel)}</small></div><div class="answer"><strong>Trợ lý tra cứu</strong>${item.pending ? '<p class="pending">Đang tìm và đối chiếu nguồn...</p>' : item.error ? `<p class="error-text">${escapeHtml(item.error)}</p>` : `<span class="answer-status">${({answer:"Có nguồn",needs_review:"Cần đối chiếu",no_evidence:"Chưa có nguồn",out_of_scope:"Ngoài phạm vi",not_authorized:"Không có thẩm quyền"})[decision.status]}</span><p>${escapeHtml(decision.answer)}</p><small>${decision.provider === "local-rules" ? "Tra cứu cục bộ · Chưa tổng hợp bằng LLM" : "Phản hồi AI"}</small>${decision.sources.map(sourceHtml).join("")}`}</div></article>`;
  }).join("")}</div>`;
}

function renderView(highlightId){
  renderNavigation();
  $("breadcrumb").textContent = `${state.guild} / ${state.view === "channel" ? "TIN NHẮN" : "TỔNG HỢP"}`;
  $("viewTitle").textContent = state.view === "channel" ? `# ${state.channel}` : state.view === "reports" ? "Bản tin của bot" : "Trợ lý tra cứu";
  $("archiveToolbar").classList.toggle("hidden",state.view !== "channel");
  $("resultBar").classList.toggle("hidden",state.view !== "channel");
  if(state.view === "channel") renderChannel(highlightId);
  else if(state.view === "reports") renderReports();
  else renderAssistant();
}

function switchChannel(channel){
  state.channel = channel;state.view = "channel";clearFilters();
  renderView();viewport.scrollTop = viewport.scrollHeight;
  $("workspace").classList.remove("navigation-open");
}

function jumpToMessage(id){
  const m = state.data.messages.find(message => message.id === id);
  if(!m) {toast("Tin gốc không có trong pack hiện tại.");return;}
  state.guild = m.guild; state.channel = m.channel;state.view="channel";clearFilters();
  if(window.matchMedia("(max-width: 1100px)").matches) setPanel(false);
  renderView(id);
}

function panelRows(){
  const query = normalize($("pinSearch").value.trim());
  const channel = $("pinChannel").value;
  const rows = state.data.messages.filter(m => (state.pinView === "saved" ? state.pins.has(m.id) : state.importance[m.id]?.important) &&
    (!channel || `${m.guild}/${m.channel}` === channel) && (!query || normalize(`${m.text} ${m.source_id} ${m.author}`).includes(query)));
  const order = [...state.pins];
  return rows.sort((a,b) => state.pinView === "saved" ? order.indexOf(b.id)-order.indexOf(a.id) : b.timestamp.localeCompare(a.timestamp));
}

function renderPins(){
  const importantCount = state.data.messages.filter(m => state.importance[m.id]?.important).length;
  $("pinCount").textContent = state.pins.size;
  $("savedCount").textContent = state.pins.size;
  $("importantCount").textContent = importantCount;
  const rows = panelRows();
  $("pinsList").innerHTML = rows.slice(0,state.panelLimit).map(m => `<article class="pinned-item"><div class="pin-meta"><span>${escapeHtml(m.guild)} / #${escapeHtml(m.channel)}</span><time>${formatDate(m.date)} · ${m.time.slice(11)}</time></div><div class="pin-author"><strong>${escapeHtml(m.author)}</strong><span>${escapeHtml(m.source_id)}</span>${m.bot ? '<span class="bot-tag">BOT</span>' : ""}</div><p>${escapeHtml(m.text)}</p><div class="message-labels">${badge(m)}</div><div class="pin-actions"><button class="text-btn" data-origin-id="${m.id}">Xem tin gốc ↗</button>${pinButton(m)}</div></article>`).join("") || `<div class="empty-state"><span class="empty-icon" aria-hidden="true">⌑</span><strong>${state.pinView === "saved" ? "Chưa có tin được ghim" : "Không có tin phù hợp"}</strong><p>${state.pinView === "saved" ? "Tin được ghim sẽ ở lại đây." : "Thử thay đổi bộ lọc."}</p></div>`;
  if(rows.length > state.panelLimit) $("pinsList").insertAdjacentHTML("beforeend",`<button id="morePins" class="load-more">Xem thêm · còn ${rows.length-state.panelLimit} tin</button>`);
}

function setPanel(open){
  $("workspace").classList.toggle("panel-open",open);
  $("openPins").setAttribute("aria-expanded",String(open));
  if(!open) $("openPins").focus();
}

async function askQuestion(event){
  event.preventDefault();
  if(!state.data || state.busy) return;
  const question = $("composerInput").value.trim();
  if(!question) return;
  const choice = $("askScope").value;
  const scope = choice === "all" ? {} : {guild:state.guild,...(choice === "channel" ? {channel:state.channel,date:$("dateFilter").value} : {})};
  const scopeLabel = choice === "all" ? "Toàn bộ pack" : `${state.guild}${choice === "channel" ? ` / #${state.channel}` : ""}${scope.date ? ` / ${formatDate(scope.date)}` : ""}`;
  const item = {question,scopeLabel,pending:true};
  state.conversations.push(item);state.busy=true;state.view="assistant";
  $("sendMessage").disabled=true;$("composerInput").value="";
  renderView();viewport.scrollTop=viewport.scrollHeight;
  try {
    const response = await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,scope})});
    const data = await response.json();
    if(!response.ok) throw new Error(data.message || "Không nhận được phản hồi.");
    item.decision=data;
  }catch(error){ item.error=error.message; }
  finally {
    item.pending=false;state.busy=false;$("sendMessage").disabled=false;
    if(state.view === "assistant"){renderAssistant();viewport.scrollTop=viewport.scrollHeight;}
  }
}

async function analyzeVisible(){
  if(state.analyzing) return;
  if(state.data.provider !== "openrouter") {toast("Chưa cấu hình OpenRouter. Hiện đang phân loại theo quy tắc cục bộ.");return;}
  if(state.view !== "channel") {toast("Chọn một kênh để phân tích các tin đang xem.");return;}
  const visibleIds = [...viewport.querySelectorAll("[data-message-id]")].map(node => node.dataset.messageId).slice(-30);
  if(!visibleIds.length){toast("Không có tin để phân tích.");return;}
  state.analyzing=true;$("refreshImportance").disabled=true;
  $("analysisStatus").textContent=`Đang phân tích ${visibleIds.length} tin...`;
  try {
    const response=await fetch("/api/importance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:visibleIds})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message);
    for(const item of data.items){state.importance[item.id]=item;state.aiImportance[item.id]=item;}
    persist();renderPins();
    if(state.view === "channel"){const top=viewport.scrollTop;renderChannel();viewport.scrollTop=top;}
    $("analysisStatus").textContent=`AI đã phân tích ${data.items.length} tin`;
  }catch { $("analysisStatus").textContent="Phân tích thất bại. Có thể thử lại."; }
  finally{state.analyzing=false;$("refreshImportance").disabled=false;}
}

document.addEventListener("click",event => {
  if(!state.data) return;
  const pin=event.target.closest("[data-pin-id]");
  if(pin){
    const id=pin.dataset.pinId;
    if(state.pins.has(id)) state.pins.delete(id);else state.pins.add(id);
    const panelTop=$("pinsList").scrollTop;
    persist();renderPins();$("pinsList").scrollTop=panelTop;
    const top=viewport.scrollTop;renderView();viewport.scrollTop=top;
  }
  const origin=event.target.closest("[data-origin-id]");
  if(origin) jumpToMessage(origin.dataset.originId);
  const channel=event.target.closest("[data-channel]");
  if(channel) switchChannel(channel.dataset.channel);
  if(event.target.closest("#loadEarlier")){
    const oldHeight=viewport.scrollHeight;state.limit+=40;renderChannel();viewport.scrollTop=viewport.scrollHeight-oldHeight;
  }
  if(event.target.closest("#morePins")){const top=$("pinsList").scrollTop;state.panelLimit+=30;renderPins();$("pinsList").scrollTop=top;}
});
$("guildSelect").onchange=()=>{
  state.guild=$("guildSelect").value;
  const channels=guildData().channels;
  const counts=channels.map(channel=>({channel,count:state.data.messages.filter(m=>m.guild===state.guild && m.channel===channel).length}));
  counts.sort((a,b)=>b.count-a.count);
  switchChannel(counts[0].channel);
};
for(const id of ["messageSearch","dateFilter","authorFilter","topicFilter"]){
  $(id).addEventListener(id === "messageSearch" ? "input" : "change",()=>{if(state.data){state.limit=40;renderChannel();viewport.scrollTop=0;}});
}
$("clearFilters").onclick=()=>{clearFilters();if(state.data)renderChannel();};
$("assistantView").onclick=()=>{if(!state.data)return;state.view="assistant";renderView();$("workspace").classList.remove("navigation-open");$("composerInput").focus();};
$("reportsView").onclick=()=>{if(!state.data)return;state.view="reports";renderView();viewport.scrollTop=0;$("workspace").classList.remove("navigation-open");};
$("questionForm").onsubmit=askQuestion;
$("openPins").onclick=()=>setPanel(!$("workspace").classList.contains("panel-open"));
$("closePins").onclick=()=>setPanel(false);
$("openNavigation").onclick=()=>$("workspace").classList.add("navigation-open");
$("closeNavigation").onclick=()=>$("workspace").classList.remove("navigation-open");
document.addEventListener("keydown",e=>{if(e.key === "Escape"){setPanel(false);$("workspace").classList.remove("navigation-open");}});
for(const [id,view] of [["savedTab","saved"],["importantTab","important"]]){
  $(id).onclick=()=>{
    state.pinView=view;state.panelLimit=30;
    for(const button of document.querySelectorAll(".pins-tabs button")){button.classList.toggle("active",button.id===id);button.setAttribute("aria-selected",String(button.id===id));}
    $("pinsList").setAttribute("aria-labelledby",id);if(state.data)renderPins();
  };
}
$("pinSearch").oninput=()=>{state.panelLimit=30;if(state.data)renderPins();};
$("pinChannel").onchange=()=>{state.panelLimit=30;if(state.data)renderPins();};
$("refreshImportance").onclick=analyzeVisible;

async function initialize(){
  try{
    const response=await fetch("/api/workspace");
    const data=await response.json();
    if(!response.ok) throw new Error(data.message || "Không tải được dữ liệu.");
    state.data=data;state.importance=data.importance;restore();
    for(const guild of data.guilds){
      $("guildSelect").add(new Option(guild.id,guild.id));
      for(const channel of guild.channels) $("pinChannel").add(new Option(`${guild.id} / #${channel}`,`${guild.id}/${channel}`));
    }
    for(const date of data.dates) $("dateFilter").add(new Option(formatDate(date),date));
    for(const [value,label] of Object.entries(labels)) $("topicFilter").add(new Option(label,value));
    $("archiveRange").textContent=`${formatDate(data.dates[0])} – ${formatDate(data.dates.at(-1))}`;
    $("providerStatus").textContent=data.provider === "local-rules" ? "Tra cứu cục bộ" : data.provider === "openrouter" ? "OpenRouter" : "OpenAI";
    $("analysisStatus").textContent=Object.keys(state.aiImportance).length ? "Có phân loại AI đã lưu" : "Phân loại cục bộ";
    $("refreshImportance").title=data.provider === "openrouter" ? "Phân tích tối đa 30 tin đang hiển thị" : "Cần API key OpenRouter";
    const guild=[...data.guilds].sort((a,b)=>b.count-a.count)[0];
    state.guild=guild.id;$("guildSelect").value=guild.id;$("guildSelect").onchange();
    renderPins();setPanel(!window.matchMedia("(max-width: 1100px)").matches);
  }catch(error){
    $("viewTitle").textContent="Chưa tải được Discord pack";
    viewport.innerHTML=`<div class="empty-state"><strong>Không có dữ liệu khả dụng</strong><p>${escapeHtml(error.message)}</p><button id="retryLoad" class="text-btn">Thử lại</button></div>`;
    $("retryLoad").onclick=()=>location.reload();
    $("sendMessage").disabled=true;
  }
}
initialize();
