const channels = {
  "daily-digest": {
    topic: "Hỏi AI bằng /bot + prompt",
    welcome: "Đây là nơi dùng slash command để hỏi Daily Digest Bot.",
    messages: []
  },
  "class-announcement": {
    topic: "Thông báo lịch học và thay đổi phòng",
    welcome: "Kênh thông báo lớp học.",
    messages: [
      {
        id:"class-old",
        author:"Trần Thị Hải Yến",
        avatar:"Y",
        color:"pink",
        time:"Hôm nay lúc 17:10",
        text:"Lịch cũ: ngày mai học lúc 08:00 tại phòng A203, cơ sở chính."
      },
      {
        id:"class-update",
        author:"Nguyễn Phát Thịnh",
        avatar:"T",
        color:"orange",
        time:"Hôm nay lúc 18:02",
        text:"Cập nhật lịch học: ngày mai chuyển sang 08:30, phòng A305, cơ sở chính nhé."
      }
    ]
  },
  "project": {
    topic: "Trao đổi dự án và lịch họp",
    welcome: "Kênh làm việc của nhóm dự án.",
    messages: [
      {
        id:"meeting-1",
        author:"Nguyễn Văn Quốc Việt",
        avatar:"V",
        color:"teal",
        time:"Hôm nay lúc 18:20",
        text:"Mai họp nhóm nhé mọi người."
      },
      {
        id:"meeting-2",
        author:"Nguyễn Phát Thịnh",
        avatar:"T",
        color:"orange",
        time:"Hôm nay lúc 18:24",
        text:"Ok, mọi người nhớ tham gia đầy đủ."
      },
      {
        id:"deadline-none",
        author:"Trần Thị Hải Yến",
        avatar:"Y",
        color:"pink",
        time:"Hôm nay lúc 18:40",
        text:"Mọi người nhớ kiểm tra phần việc của mình nhé, hiện chưa thấy thông báo deadline mới."
      }
    ]
  },
  "backend": {
    topic: "Backend API và phân công",
    welcome: "Kênh trao đổi kỹ thuật backend.",
    messages: [
      {
        id:"backend-decision",
        author:"Nguyễn Phát Thịnh",
        avatar:"T",
        color:"orange",
        time:"Hôm nay lúc 16:05",
        text:"Chốt FastAPI cho backend nhé."
      },
      {
        id:"backend-action",
        author:"Lê Nguyễn Thái Dương",
        avatar:"D",
        color:"blue",
        time:"Hôm nay lúc 16:10",
        text:"Ok, mình nhận API Login và hoàn thành trước 18/09."
      }
    ]
  },
  "general": {
    topic: "Trao đổi chung",
    welcome: "Kênh trao đổi chung của Violet Team.",
    messages: [
      {
        id:"general-1",
        author:"Nguyễn Duy Phong",
        avatar:"P",
        color:"purple",
        time:"Hôm nay lúc 12:20",
        text:"Mọi người chiều nay nhớ check Discord nhé."
      }
    ]
  }
};

let currentChannel = "daily-digest";
const viewport = document.getElementById("messagesViewport");
const channelTitle = document.getElementById("currentChannelTitle");
const channelTopic = document.getElementById("channelTopic");
const composer = document.getElementById("composerInput");
const slashMenu = document.getElementById("slashMenu");

function msgHTML(m, extraClass=""){
  return `
    <div class="message ${extraClass}" id="${m.id || ""}">
      <div class="avatar ${m.color || "blue"}">${m.avatar || "?"}</div>
      <div>
        <div class="message-head">
          <strong>${m.author}</strong>
          ${m.bot ? '<span class="bot-tag">APP</span>' : ''}
          <span class="time">${m.time || "vừa xong"}</span>
        </div>
        <div class="message-text">${m.text}</div>
        ${m.embed || ""}
      </div>
    </div>`;
}

function renderChannel(channelId, highlightId=null){
  currentChannel = channelId;
  const ch = channels[channelId];
  channelTitle.textContent = channelId;
  channelTopic.textContent = ch.topic;
  composer.placeholder = `Message #${channelId}`;

  document.querySelectorAll(".channel-btn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.channel === channelId);
  });

  let html = `
    <div class="channel-welcome">
      <div class="big-hash">#</div>
      <h1>Chào mừng đến #${channelId}!</h1>
      <p>${ch.welcome}</p>
    </div>
    <div class="day-divider"><span>Hôm nay</span></div>
  `;

  html += ch.messages.map(m => msgHTML(m)).join("");
  viewport.innerHTML = html;

  if(highlightId){
    requestAnimationFrame(()=>{
      const target = document.getElementById(highlightId);
      if(target){
        target.scrollIntoView({behavior:"smooth", block:"center"});
        target.classList.add("highlight");
        setTimeout(()=>target.classList.remove("highlight"),2300);
      }
    });
  } else {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

function sourceCard(channel, messageId, preview){
  return `
    <div class="source-card" data-jump-channel="${channel}" data-jump-message="${messageId}">
      <div class="source-channel">#${channel}</div>
      <div class="source-preview">${preview}</div>
      <div class="source-cta">Nhấn để mở đúng kênh và highlight message nguồn →</div>
    </div>`;
}

function addBotInteraction(prompt){
  if(currentChannel !== "daily-digest"){
    renderChannel("daily-digest");
  }

  const time = "vừa xong";
  channels["daily-digest"].messages.push({
    id:"user-"+Date.now(),
    author:"ThaiDuong",
    avatar:"D",
    color:"blue",
    time,
    text:`<span class="slash-command">/bot</span> ${prompt}`
  });

  const p = prompt.toLowerCase();
  let embed = "";

  // HAPPY PATH
  if(p.includes("học") && (p.includes("ở đâu") || p.includes("mấy giờ") || p.includes("lịch học")) && !p.includes("tóm tắt")){
    embed = `
      <div class="embed green">
        <div class="embed-title">✅ Happy path <span class="chip green">HIGH CONFIDENCE</span></div>
        <p><strong>Lịch học ngày mai</strong></p>
        <p>• Thời gian: <strong>08:30</strong></p>
        <p>• Phòng: <strong>A305</strong></p>
        <p>• Địa điểm: <strong>Cơ sở chính</strong></p>
        <p>AI dùng message cập nhật mới nhất làm căn cứ.</p>
        ${sourceCard("class-announcement","class-update","Cập nhật lịch học: ngày mai chuyển sang 08:30, phòng A305...")}
      </div>`;
  }
  // LOW CONFIDENCE
  else if(p.includes("họp") || p.includes("cuộc họp")){
    embed = `
      <div class="embed yellow">
        <div class="embed-title">⚠ Low-confidence <span class="chip yellow">NEEDS REVIEW</span></div>
        <p>Discord có đề cập <strong>“Mai họp nhóm”</strong> nhưng chưa có giờ và địa điểm.</p>
        <p><strong>Kết luận:</strong> Chưa đủ thông tin để xác định lịch họp chính xác.</p>
        ${sourceCard("project","meeting-1","Mai họp nhóm nhé mọi người.")}
      </div>`;
  }
  // NO GROUNDING
  else if(p.includes("deadline") || p.includes("nộp bài")){
    embed = `
      <div class="embed red">
        <div class="embed-title">⛔ Failure / No-grounding <span class="chip red">NO EVIDENCE</span></div>
        <p>Không tìm thấy message nào xác nhận <strong>deadline nộp bài ngày mai</strong>.</p>
        <p>AI không tự suy đoán ngày nộp.</p>
        <p><strong>Trả lời:</strong> “Không tìm thấy thông tin xác nhận deadline trong các channel đã theo dõi.”</p>
        ${sourceCard("project","deadline-none","Hiện chưa thấy thông báo deadline mới.")}
      </div>`;
  }
  // CORRECTION
  else if(p.includes("tóm tắt") && p.includes("lịch học")){
    embed = `
      <div class="embed purple">
        <div class="embed-title">✏ Correction <span class="chip purple">USER EDIT</span></div>
        <p><strong>Kết quả AI ban đầu:</strong> 08:00 — phòng A203.</p>
        <p>Nhưng có message mới hơn cập nhật thành <strong>08:30 — phòng A305</strong>.</p>
        ${sourceCard("class-announcement","class-old","Lịch cũ: ngày mai học lúc 08:00 tại phòng A203...")}
        ${sourceCard("class-announcement","class-update","Cập nhật lịch học: chuyển sang 08:30, phòng A305...")}
        <div class="actions">
          <button class="btn primary" id="editBotResult">Edit result</button>
        </div>
      </div>`;
  }
  // GENERIC BOT HELP
  else{
    embed = `
      <div class="embed">
        <div class="embed-title">Daily Digest Bot</div>
        <p>Mình có thể demo 4 tình huống:</p>
        <p>• “Ngày mai học ở đâu và mấy giờ?”</p>
        <p>• “Cuộc họp ngày mai lúc mấy giờ?”</p>
        <p>• “Ngày mai có deadline nộp bài không?”</p>
        <p>• “Tóm tắt lịch học ngày mai.”</p>
      </div>`;
  }

  channels["daily-digest"].messages.push({
    id:"bot-"+Date.now(),
    author:"Daily Digest Bot",
    avatar:"AI",
    color:"bot-avatar",
    bot:true,
    time,
    text:"Đã kiểm tra các message liên quan trong Discord.",
    embed
  });

  renderChannel("daily-digest");
  bindDynamicActions();
}

function bindDynamicActions(){
  document.querySelectorAll("[data-jump-channel]").forEach(card=>{
    card.addEventListener("click",()=>{
      const ch = card.dataset.jumpChannel;
      const msg = card.dataset.jumpMessage;
      renderChannel(ch, msg);
    });
  });

  const edit = document.getElementById("editBotResult");
  if(edit){
    edit.addEventListener("click",()=>{
      document.getElementById("correctionModal").classList.remove("hidden");
    });
  }
}

document.querySelectorAll(".channel-btn[data-channel]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    renderChannel(btn.dataset.channel);
    bindDynamicActions();
  });
});

composer.addEventListener("input",()=>{
  const value = composer.value.trimStart();
  if(value === "/" || value.startsWith("/b") || value === "/bot"){
    slashMenu.classList.remove("hidden");
  }else{
    slashMenu.classList.add("hidden");
  }
});

composer.addEventListener("keydown",(e)=>{
  if(e.key === "Tab" && !slashMenu.classList.contains("hidden")){
    e.preventDefault();
    composer.value = "/bot ";
    slashMenu.classList.add("hidden");
  }

  if(e.key === "Enter"){
    e.preventDefault();
    const raw = composer.value.trim();
    if(!raw) return;

    if(raw === "/" || raw === "/b"){
      composer.value = "/bot ";
      slashMenu.classList.add("hidden");
      return;
    }

    if(raw.startsWith("/bot")){
      const prompt = raw.replace(/^\/bot\s*/i,"").trim();
      addBotInteraction(prompt || "help");
      composer.value = "";
      slashMenu.classList.add("hidden");
    }else{
      // normal message
      channels[currentChannel].messages.push({
        id:"normal-"+Date.now(),
        author:"ThaiDuong",
        avatar:"D",
        color:"blue",
        time:"vừa xong",
        text:raw
      });
      renderChannel(currentChannel);
      composer.value = "";
    }
  }
});

document.querySelector(".slash-item").addEventListener("click",()=>{
  composer.value = "/bot ";
  slashMenu.classList.add("hidden");
  composer.focus();
});

// Correction modal
const correctionModal = document.getElementById("correctionModal");
function closeCorrection(){ correctionModal.classList.add("hidden"); }
document.getElementById("closeCorrection").addEventListener("click", closeCorrection);
document.getElementById("cancelCorrection").addEventListener("click", closeCorrection);
correctionModal.addEventListener("click",(e)=>{ if(e.target === correctionModal) closeCorrection(); });

document.getElementById("saveCorrection").addEventListener("click",()=>{
  const time = document.getElementById("editTime").value;
  const room = document.getElementById("editRoom").value;
  const location = document.getElementById("editLocation").value;

  closeCorrection();
  renderChannel("daily-digest");

  channels["daily-digest"].messages.push({
    id:"correction-"+Date.now(),
    author:"Daily Digest Bot",
    avatar:"AI",
    color:"bot-avatar",
    bot:true,
    time:"vừa xong",
    text:"Correction đã được người dùng xác nhận.",
    embed:`
      <div class="embed green">
        <div class="embed-title">✓ Correction saved</div>
        <p>• Thời gian: <strong>${time}</strong></p>
        <p>• Phòng: <strong>${room}</strong></p>
        <p>• Địa điểm: <strong>${location}</strong></p>
        <p>Kết quả mới sẽ được dùng trong Daily Digest.</p>
        ${sourceCard("class-announcement","class-update","Cập nhật lịch học: ngày mai chuyển sang 08:30, phòng A305...")}
      </div>`
  });

  renderChannel("daily-digest");
  bindDynamicActions();
});

// Seed intro in daily digest
channels["daily-digest"].messages = [
  {
    id:"bot-intro",
    author:"Daily Digest Bot",
    avatar:"AI",
    color:"bot-avatar",
    bot:true,
    time:"Hôm nay lúc 19:58",
    text:"Gõ <span class='slash-command'>/bot</span> + prompt để hỏi thông tin từ Discord.",
    embed:`
      <div class="embed">
        <div class="embed-title">Demo slash command</div>
        <p>Ví dụ:</p>
        <p><strong>/bot Ngày mai học ở đâu và mấy giờ?</strong></p>
        <p><strong>/bot Cuộc họp ngày mai lúc mấy giờ?</strong></p>
        <p><strong>/bot Ngày mai có deadline nộp bài không?</strong></p>
        <p><strong>/bot Tóm tắt lịch học ngày mai.</strong></p>
      </div>`
  }
];

renderChannel("daily-digest");
bindDynamicActions();
