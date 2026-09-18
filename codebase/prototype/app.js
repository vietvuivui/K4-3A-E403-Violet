const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const normalize = value => String(value || "").toLowerCase().replace(/đ/g,"d").normalize("NFD").replace(/\p{Diacritic}/gu,"");
const labels = { schedule:"Lịch / Workshop",deadline:"Deadline",assignment:"Phân công",decision:"Quyết định",announcement:"Thông báo",attendance:"Điểm danh / XP",support:"Ticket / Hỗ trợ",team:"Ghép đội",lab:"Lab / CVAT",other:"Trao đổi" };
const storageKey = "violet-discord-archive-v2";
const icon = name => lucide.createElement(lucide.icons[name],{"aria-hidden":"true","stroke-width":1.8,class:"lucide"}).outerHTML;
const avatarTone = author => [...author].reduce((sum,char)=>sum+char.charCodeAt(0),0)%6;
const avatarHtml = (author,bot=false) => `<div class="avatar tone-${avatarTone(author)} ${bot ? "bot-avatar" : ""}" aria-hidden="true">${bot ? icon("Bot") : escapeHtml(author.slice(-2))}</div>`;
lucide.createIcons({attrs:{"aria-hidden":"true","stroke-width":1.8}});
marked.use({gfm:true,breaks:true,renderer:{
  html({text}){return escapeHtml(text);},
  image({text}){return `<span class="attachment-placeholder">${escapeHtml(text || "Hình đính kèm")}</span>`;},
  link({href,tokens}){
    const label=this.parser.parseInline(tokens);
    try{
      const url=new URL(href);
      if(!["http:","https:"].includes(url.protocol))return label;
      return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }catch{return label;}
  }
}});

function renderRichText(text){
  const fragment=document.createElement("div");
  fragment.innerHTML=marked.parse(String(text || ""));
  const walker=document.createTreeWalker(fragment,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(node.parentElement.closest("pre,code,a"))continue;
    const parts=node.textContent.split(/(\[@(?:D\d+|BOT|user|role)\])/g);
    if(parts.length===1)continue;
    const replacement=document.createDocumentFragment();
    parts.forEach((part,index)=>{if(index%2){const span=document.createElement("span");span.className="mention";span.textContent=part;replacement.append(span);}else replacement.append(document.createTextNode(part));});
    node.replaceWith(replacement);
  }
  return fragment.innerHTML;
}
const state = { data:null, guild:"", channel:"", view:"channel", pins:new Set(), importance:{}, aiImportance:{},
  pinView:"saved", limit:40, panelLimit:30, conversations:[], busy:false, analyzing:false, filtersOpen:false };
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
    return `<button class="nav-item channel-btn ${state.view === "channel" && channel === state.channel ? "active" : ""}" data-channel="${escapeHtml(channel)}">${icon("Hash")}<span>${escapeHtml(channel)}</span><span class="nav-count">${count}</span></button>`;
  }).join("");
  $("assistantView").classList.toggle("active",state.view === "assistant");
  $("reportsView").classList.toggle("active",state.view === "reports");
  $("guildRail").innerHTML=state.data.guilds.map(g=>`<button class="server-icon guild-icon ${state.guild===g.id ? "active" : ""}" data-guild="${escapeHtml(g.id)}" title="${escapeHtml(g.id)}" aria-label="Server ${escapeHtml(g.id)}" aria-pressed="${state.guild===g.id}"><span>${escapeHtml(g.id.replace("K4-",""))}</span></button>`).join("");
  renderMembers();
}

function renderMembers(){
  const counts=new Map();
  for(const m of state.data.messages.filter(m=>m.guild===state.guild)){
    const entry=counts.get(m.author)||{author:m.author,bot:m.bot,count:0};entry.count++;counts.set(m.author,entry);
  }
  const people=[...counts.values()].sort((a,b)=>b.count-a.count);
  const group=(bot,title)=>{
    const rows=people.filter(m=>m.bot===bot);
    return rows.length ? `<h3 class="member-group">${title} — ${rows.length}</h3>${rows.map(m=>`<button class="member-row" data-author="${escapeHtml(m.author)}" title="Xem tin của ${escapeHtml(m.author)}">${avatarHtml(m.author,m.bot)}<span class="member-name">${escapeHtml(m.author)}${m.bot ? '<span class="app-label">APP</span>' : ""}<small>${m.count} tin nhắn</small></span></button>`).join("")}` : "";
  };
  $("memberList").innerHTML=group(true,"ỨNG DỤNG")+group(false,"TÁC GIẢ ĐÃ ẨN DANH");
}

function updateFilters(){
  const count=["dateFilter","authorFilter","topicFilter"].filter(id=>$(id).value).length;
  $("filterCount").textContent=count;
  $("filterCount").classList.toggle("hidden",!count);
  $("archiveToolbar").classList.toggle("hidden",state.view!=="channel" || !state.filtersOpen);
  $("toggleFilters").setAttribute("aria-expanded",String(state.filtersOpen));
  $("resultBar").classList.toggle("hidden",state.view!=="channel" || !(count || $("messageSearch").value));
}

function badge(message){
  const info = state.importance[message.id];
  if(!info?.important) return "";
  return `<span class="topic-badge" title="${escapeHtml(info.reason)}">${escapeHtml(labels[info.category] || "Quan trọng")}</span>${info.needs_review ? '<span class="review-badge">Cần đối chiếu</span>' : ""}`;
}

function pinButton(message){
  const pinned = state.pins.has(message.id);
  return `<button class="icon-btn message-pin" data-pin-id="${message.id}" aria-pressed="${pinned}" aria-label="${pinned ? "Bỏ ghim" : "Ghim tin nhắn"}" title="${pinned ? "Bỏ ghim" : "Ghim tin nhắn"}">${icon(pinned ? "PinOff" : "Pin")}</button>`;
}

function messageHtml(m,compact=false){
  const parent = state.data.messages.find(p => p.id === m.reply_id);
  let reply = "";
  if(parent) reply = `<button class="reply-preview" data-origin-id="${parent.id}"><span aria-hidden="true">↳</span> ${escapeHtml(parent.author)} · ${escapeHtml(parent.source_id)} <span>${escapeHtml(parent.text.slice(0,100))}</span></button>`;
  else if(m.reply_state !== "none") reply = `<div class="reply-missing">↳ ${escapeHtml(m.reply_to || "Tin gốc")} · ${m.reply_state === "ambiguous" ? "Mã nguồn trùng, chưa xác định tin gốc" : "Tin gốc không có trong pack"}</div>`;
  const text=renderRichText(m.text);
  return `<article class="message ${compact ? "compact" : ""} ${m.bot ? "bot-message" : ""} ${state.pins.has(m.id) ? "is-pinned" : ""}" id="${m.id}" data-message-id="${m.id}">
    ${avatarHtml(m.author,m.bot)}${compact ? `<time class="compact-time">${m.time.slice(11)}</time>` : ""}
    <div class="message-body">${reply}<div class="message-head"><strong class="author-tone-${avatarTone(m.author)}">${escapeHtml(m.author)}</strong>${m.bot ? '<span class="bot-tag" title="Phản hồi của bot, chưa xác minh">APP</span>' : ""}<time datetime="${m.timestamp}" title="${escapeHtml(m.time)} UTC+7">${formatDate(m.date)} ${m.time.slice(11)}</time><span class="source-id">${escapeHtml(m.source_id)}</span></div>
    <div class="message-text">${text}</div>
    ${m.attachments ? `<div class="attachment-note">${icon("File")}<div><strong>${m.attachments} tệp đính kèm</strong><small>Nội dung tệp không có trong pack</small></div></div>` : ""}
    <div class="message-labels">${badge(m)}</div></div><div class="message-tools">${pinButton(m)}<button class="icon-btn" data-quote-id="${m.id}" title="Hỏi trợ lý về tin này" aria-label="Hỏi trợ lý về tin này">${icon("MessageSquare")}</button><button class="icon-btn" data-copy-id="${m.id}" title="Sao chép mã nguồn" aria-label="Sao chép mã nguồn">${icon("Copy")}</button></div></article>`;
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
  $("viewMeta").textContent = `${channelMessages().length} tin nhắn · ${humanCount} từ người viết`;
  updateFilters();
  let previousDate = "";
  let previousMessage=null;
  const content = shown.map(m => {
    const divider = previousDate !== m.date ? `<div class="day-divider"><span>${formatDate(m.date)}</span></div>` : "";
    const compact=previousMessage && previousMessage.author===m.author && previousDate===m.date && !m.reply_to && m.type!=="reply" && (new Date(m.timestamp)-new Date(previousMessage.timestamp))<420000;
    previousDate = m.date;
    previousMessage=m;
    return divider + messageHtml(m,compact);
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

// Relative dates cannot be resolved against a historical archive, so remind the reader to check timestamps.
const RELATIVE_TIME = /(hôm nay|hôm qua|ngày mai|tuần này|tuần sau|tuần trước|\bmai\b|\bnay\b)/i;
function timeNote(question){
  if(!RELATIVE_TIME.test(question) || !state.data?.dates?.length) return "";
  return `<p class="time-note">Lưu ý: dữ liệu là bản lưu ${formatDate(state.data.dates[0])} – ${formatDate(state.data.dates.at(-1))}. "Hôm nay/ngày mai" không được quy đổi theo ngày thực tế, hãy xem ngày giờ trên thẻ nguồn.</p>`;
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
    return `<article class="question-answer"><div class="question"><span>Bạn</span><p>${escapeHtml(item.question)}</p><small>${escapeHtml(item.scopeLabel)}</small></div><div class="answer"><strong>Trợ lý tra cứu</strong>${item.pending ? '<p class="pending">Đang tìm và đối chiếu nguồn...</p>' : item.error ? `<p class="error-text">${escapeHtml(item.error)}</p>` : `<span class="answer-status">${({answer:"Có nguồn",needs_review:"Cần đối chiếu",no_evidence:"Chưa có nguồn",out_of_scope:"Ngoài phạm vi",not_authorized:"Không có thẩm quyền"})[decision.status]}</span><p>${escapeHtml(decision.answer)}</p><small>${decision.provider === "local-rules" ? "Tra cứu cục bộ · Chưa tổng hợp bằng LLM" : "Phản hồi AI"}</small>${timeNote(item.question)}${decision.sources.map(sourceHtml).join("")}`}</div></article>`;
  }).join("")}</div>`;
}

function renderView(highlightId){
  renderNavigation();
  $("breadcrumb").textContent = `${state.guild} / ${state.view === "channel" ? "TIN NHẮN" : "TỔNG HỢP"}`;
  $("viewTitle").textContent = state.view === "channel" ? state.channel : state.view === "reports" ? "bản-tin-hằng-ngày" : "trợ-lý-tra-cứu";
  $("headingIcon").innerHTML=icon(state.view === "channel" ? "Hash" : state.view === "reports" ? "Newspaper" : "Bot");
  $("composerInput").placeholder=`Hỏi Trợ lý K4 về #${state.channel}`;
  $("messageSearch").disabled=state.view!=="channel";
  $("toggleFilters").disabled=state.view!=="channel";
  updateFilters();
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
  $("pinCount").classList.toggle("is-zero",state.pins.size===0);
  $("savedCount").textContent = state.pins.size;
  $("importantCount").textContent = importantCount;
  const rows = panelRows();
  $("pinsList").innerHTML = rows.slice(0,state.panelLimit).map(m => `<article class="pinned-item"><div class="pin-meta"><span>${escapeHtml(m.guild)} / #${escapeHtml(m.channel)}</span><time>${formatDate(m.date)} · ${m.time.slice(11)}</time></div><div class="pin-author"><strong>${escapeHtml(m.author)}</strong><span>${escapeHtml(m.source_id)}</span>${m.bot ? '<span class="bot-tag">BOT</span>' : ""}</div><p>${escapeHtml(m.text)}</p><div class="message-labels">${badge(m)}</div><div class="pin-actions"><button class="text-btn" data-origin-id="${m.id}">Xem tin gốc ↗</button>${pinButton(m)}</div></article>`).join("") || `<div class="empty-state"><span class="empty-icon" aria-hidden="true">⌑</span><strong>${state.pinView === "saved" ? "Chưa có tin được ghim" : "Không có tin phù hợp"}</strong><p>${state.pinView === "saved" ? "Tin được ghim sẽ ở lại đây." : "Thử thay đổi bộ lọc."}</p></div>`;
  if(rows.length > state.panelLimit) $("pinsList").insertAdjacentHTML("beforeend",`<button id="morePins" class="load-more">Xem thêm · còn ${rows.length-state.panelLimit} tin</button>`);
}

function setPanel(open){
  const wasOpen=$("workspace").classList.contains("panel-open");
  $("workspace").classList.toggle("panel-open",open);
  $("openPins").setAttribute("aria-expanded",String(open));
  if(open){setMembers(false);if(state.data)renderPins();}
  if(!open && wasOpen) $("openPins").focus();
}

function setMembers(open){
  $("workspace").classList.toggle("members-open",open);
  $("toggleMembers").setAttribute("aria-expanded",String(open));
  if(open){$("workspace").classList.remove("panel-open");$("openPins").setAttribute("aria-expanded","false");}
}

function showArchiveInfo(){
  if(!state.data)return;
  const stats=state.data.stats;
  $("archiveInfoBody").innerHTML=`<p class="info-guild">${escapeHtml(state.guild)}</p><dl><div><dt>Tin nhắn</dt><dd>${stats.messages.toLocaleString("vi")}</dd></div><div><dt>Server / kênh</dt><dd>${state.data.guilds.length} / ${stats.channels}</dd></div><div><dt>Tác giả</dt><dd>${stats.authors}</dd></div><div><dt>Bản tin bot</dt><dd>${stats.reports}</dd></div></dl><p>${formatDate(state.data.dates[0])} – ${formatDate(state.data.dates.at(-1))} · UTC+7</p><p>Tên người và kênh đã được ẩn danh. Vai trò và trạng thái trực tuyến không có trong dữ liệu. Phản hồi của bot cần được đối chiếu với nguồn gốc.</p>`;
  $("archiveInfo").showModal();
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
  const guild=event.target.closest("[data-guild]");
  if(guild){$("guildSelect").value=guild.dataset.guild;$("guildSelect").onchange();}
  const author=event.target.closest("[data-author]");
  if(author){
    const messages=state.data.messages.filter(m=>m.guild===state.guild && m.author===author.dataset.author);
    if(!messages.some(m=>m.channel===state.channel))state.channel=messages[0].channel;
    clearFilters();$("messageSearch").value=author.dataset.author;state.view="channel";renderView();viewport.scrollTop=0;
    if(matchMedia("(max-width:1100px)").matches)setMembers(false);
  }
  const quote=event.target.closest("[data-quote-id]");
  if(quote){const message=state.data.messages.find(m=>m.id===quote.dataset.quoteId);$("composerInput").value=`Giải thích thông tin trong tin ${message.source_id}: ${message.text.slice(0,500)}`;$("composerInput").focus();}
  const copy=event.target.closest("[data-copy-id]");
  if(copy){const message=state.data.messages.find(m=>m.id===copy.dataset.copyId);navigator.clipboard.writeText(`${message.guild}/${message.channel}/${message.source_id} (${message.time} UTC+7)`).then(()=>toast("Đã sao chép mã nguồn."),()=>toast("Trình duyệt không cho phép sao chép."));}
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
$("toggleFilters").onclick=()=>{state.filtersOpen=!state.filtersOpen;updateFilters();};
$("toggleMembers").onclick=()=>setMembers(!$("workspace").classList.contains("members-open"));
$("closeMembers").onclick=()=>setMembers(false);
$("openPins").onclick=()=>setPanel(!$("workspace").classList.contains("panel-open"));
$("closePins").onclick=()=>setPanel(false);
$("openNavigation").onclick=()=>$("workspace").classList.add("navigation-open");
$("closeNavigation").onclick=()=>$("workspace").classList.remove("navigation-open");
document.addEventListener("keydown",e=>{if(e.key === "Escape"){setPanel(false);if(matchMedia("(max-width:1100px)").matches)setMembers(false);$("workspace").classList.remove("navigation-open");}});
$("railHome").onclick=()=>$("assistantView").click();
$("railReports").onclick=()=>$("reportsView").click();
$("railInfo").onclick=showArchiveInfo;
$("openArchiveInfo").onclick=showArchiveInfo;
$("closeArchiveInfo").onclick=()=>$("archiveInfo").close();
$("archiveInfo").onclick=e=>{if(e.target===$("archiveInfo"))$("archiveInfo").close();};
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
    renderPins();setPanel(false);setMembers(!window.matchMedia("(max-width: 1100px)").matches);
  }catch(error){
    $("viewTitle").textContent="Chưa tải được Discord pack";
    viewport.innerHTML=`<div class="empty-state"><strong>Không có dữ liệu khả dụng</strong><p>${escapeHtml(error.message)}</p><button id="retryLoad" class="text-btn">Thử lại</button></div>`;
    $("retryLoad").onclick=()=>location.reload();
    $("sendMessage").disabled=true;
  }
}
initialize();
