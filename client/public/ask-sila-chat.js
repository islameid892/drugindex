// Ask Sila - Medical AI Assistant for drugindex.click
// Version 3.1 - Fixed Streaming Support
// ============================================================

(function () {
  "use strict";

  const CONFIG = { apiUrl: "/api/askSila" };

  const state = {
    isOpen: false,
    isLoading: false,
    history: [],
  };

  // ── Inject Google Fonts (Cairo for Arabic, Inter for English) ──
  function injectFonts() {
    if (document.getElementById("sila-fonts")) return;
    const link = document.createElement("link");
    link.id = "sila-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }

  // ── Inject CSS ──
  function injectStyles() {
    if (document.getElementById("sila-styles")) return;
    const css = `
      #sila-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        background: linear-gradient(145deg, #1a6fc4, #0d4f9e);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 6px 24px rgba(26,111,196,0.55), 0 0 0 4px rgba(26,111,196,0.18);
        z-index: 9998;
        transition: transform 0.25s ease, box-shadow 0.25s ease;
        border: 3px solid #ffffff;
        overflow: visible;
        padding: 0;
      }
      #sila-fab:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(26,111,196,0.7), 0 0 0 6px rgba(26,111,196,0.25); }
      #sila-fab .sila-fab-avatar {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
      }
      #sila-fab .sila-fab-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #1a6fc4, #0d4f9e);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      }
      #sila-fab .sila-fab-badge svg {
        width: 12px;
        height: 12px;
        fill: white;
      }
      #sila-fab::before {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 2px solid rgba(26,111,196,0.35);
        animation: sila-pulse 2.5s ease-in-out infinite;
      }
      @keyframes sila-pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0; transform: scale(1.18); }
      }

      #sila-window {
        position: fixed;
        bottom: 96px;
        right: 24px;
        width: 400px;
        max-height: 620px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 9999;
        font-family: 'Cairo', 'Inter', sans-serif;
      }

      #sila-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
        background: linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%);
        border-radius: 16px 16px 0 0;
      }

      .sila-header-left {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .sila-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid #bfdbfe;
      }

      .sila-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .sila-title {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: -0.3px;
      }

      .sila-subtitle {
        font-size: 11px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
      }

      .sila-dot {
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 50%;
        display: inline-block;
        animation: sila-pulse-dot 2s ease-in-out infinite;
      }

      @keyframes sila-pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      #sila-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }

      #sila-close:hover { color: #1e293b; }

      #sila-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #ffffff;
      }

      .sila-welcome {
        text-align: center;
        padding: 20px 12px;
        color: #64748b;
      }

      .sila-welcome-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin: 8px 0;
      }

      .sila-welcome-sub {
        font-size: 13px;
        line-height: 1.5;
        color: #64748b;
      }

      .sila-msg-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .sila-msg-row.user {
        justify-content: flex-end;
      }

      .sila-msg-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 16px;
      }

      .sila-msg-avatar.bot img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid #bfdbfe;
      }

      .sila-bubble {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .sila-bubble.user {
        background: linear-gradient(135deg, #1a6fc4, #0d4f9e);
        color: white;
        border-radius: 12px 4px 12px 12px;
      }

      .sila-bubble.bot {
        background: #f1f5f9;
        color: #1e293b;
        border-radius: 4px 12px 12px 12px;
      }

      .sila-bubble.error {
        background: #fee2e2;
        color: #991b1b;
        border-radius: 4px 12px 12px 12px;
      }

      .sila-typing {
        display: flex;
        gap: 4px;
        height: 16px;
        align-items: center;
      }

      .sila-typing span {
        width: 6px;
        height: 6px;
        background: #94a3b8;
        border-radius: 50%;
        animation: sila-bounce 1.4s infinite;
      }

      .sila-typing span:nth-child(2) { animation-delay: 0.2s; }
      .sila-typing span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes sila-bounce {
        0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-8px); }
      }

      .md-db-badge {
        display: inline-block;
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        margin: 4px 0;
      }

      .md-warn {
        display: block;
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        padding: 6px 10px;
        border-left: 3px solid #dc2626;
        margin: 4px 0;
        border-radius: 4px;
        font-weight: 600;
      }

      .md-h3 {
        display: block;
        font-weight: 700;
        color: #1e293b;
        margin: 8px 0 4px 0;
        font-size: 13px;
      }

      .md-li {
        display: block;
        margin: 4px 0;
        padding-left: 16px;
      }

      .md-li-marker {
        display: inline-block;
        width: 16px;
        margin-left: -16px;
        font-weight: 600;
        color: #1a6fc4;
      }

      .md-para {
        display: block;
        margin: 4px 0;
      }

      #sila-quick {
        padding: 10px 12px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        flex-shrink: 0;
      }

      .sila-quick-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .sila-quick-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .sila-qa-btn {
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 12px;
        font-family: 'Cairo', 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        color: #1e293b;
        font-weight: 500;
      }
      .sila-qa-btn:hover { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

      #sila-input-area {
        border-top: 1px solid #e2e8f0;
        padding: 10px 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        background: #fff;
        flex-shrink: 0;
      }
      #sila-input {
        flex: 1;
        border: 1.5px solid #e2e8f0;
        border-radius: 24px;
        padding: 9px 14px;
        font-size: 13.5px;
        font-family: 'Cairo', 'Inter', sans-serif;
        outline: none;
        color: #1e293b;
        background: #f8fafc;
        transition: border-color 0.2s;
        direction: auto;
      }
      #sila-input:focus { border-color: #1a6fc4; background: #fff; }
      #sila-input::placeholder { color: #94a3b8; }
      #sila-send {
        width: 38px; height: 38px;
        background: linear-gradient(135deg, #1a6fc4, #0d4f9e);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.2s, transform 0.15s;
      }
      #sila-send:hover { opacity: 0.88; transform: scale(1.05); }
      #sila-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
      #sila-send svg { width: 16px; height: 16px; fill: white; }
    `;
    const style = document.createElement("style");
    style.id = "sila-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Build UI ──
  function buildUI() {
    const fab = document.createElement("div");
    fab.id = "sila-fab";
    fab.setAttribute("role", "button");
    fab.setAttribute("aria-label", "Ask Sila - Medical Assistant");
    fab.innerHTML = `
      <img class="sila-fab-avatar" src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" loading="lazy" />
      <div class="sila-fab-badge">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
    `;

    const win = document.createElement("div");
    win.id = "sila-window";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Ask Sila Chat");
    win.innerHTML = `
      <div id="sila-header">
        <div class="sila-header-left">
          <div class="sila-avatar">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" loading="lazy" />
          </div>
          <div>
            <div class="sila-title">سيلا / Sila <span style="font-size:10px;background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:8px;font-weight:600;letter-spacing:0.5px;">AI</span></div>
            <div class="sila-subtitle"><span class="sila-dot"></span> مساعد ICD-10-AM الذكي · drugindex.click</div>
          </div>
        </div>
        <button id="sila-close" aria-label="Close chat">✕</button>
      </div>

      <div id="sila-messages">
        <div class="sila-welcome">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" style="width:52px;height:52px;border-radius:50%;border:2px solid #bfdbfe;object-fit:cover;" />
          </div>
          <div class="sila-welcome-title">مرحباً! أنا سيلا 👋</div>
          <div class="sila-welcome-sub">
            مساعدك الطبي الذكي المتخصص في <strong>ICD-10-AM</strong> على drugindex.click<br>
            أبحث في قاعدة بيانات الموقع لأجيبك بدقة عن الأكواد والأدوية وقواعد الفوترة السعودية
          </div>
        </div>
      </div>

      <div id="sila-quick">
        <div class="sila-quick-label">أسئلة سريعة / Quick Actions</div>
        <div class="sila-quick-grid">
          <button class="sila-qa-btn" data-q="ما هو كود ICD-10 للسكري؟">🩸 كود السكري</button>
          <button class="sila-qa-btn" data-q="ما هي أدوية ضغط الدم؟">💊 أدوية الضغط</button>
          <button class="sila-qa-btn" data-q="What is ICD-10 coding?">❓ ICD-10 Info</button>
          <button class="sila-qa-btn" data-q="ما هي الأكواد غير المغطاة بالتأمين؟">⚠️ غير مغطى</button>
        </div>
      </div>

      <div id="sila-input-area">
        <input id="sila-input" type="text" placeholder="اسأل سيلا... / Ask Sila..." autocomplete="off" />
        <button id="sila-send" aria-label="Send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(win);
  }

  // ── Events ──
  function bindEvents() {
    document.getElementById("sila-fab").addEventListener("click", toggleChat);
    document.getElementById("sila-close").addEventListener("click", closeChat);
    document.getElementById("sila-send").addEventListener("click", sendMessage);
    document.getElementById("sila-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.querySelectorAll(".sila-qa-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.getAttribute("data-q");
        document.getElementById("sila-input").value = q;
        sendMessage();
      });
    });
  }

  function toggleChat() {
    state.isOpen = !state.isOpen;
    const win = document.getElementById("sila-window");
    win.style.display = state.isOpen ? "flex" : "none";
    if (state.isOpen) setTimeout(() => document.getElementById("sila-input").focus(), 120);
  }

  function closeChat() {
    state.isOpen = false;
    document.getElementById("sila-window").style.display = "none";
  }

  function detectDir(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    return arabicChars > latinChars ? "rtl" : "ltr";
  }

  function renderMarkdown(raw) {
    let t = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    t = t.replace(
      /Found in drugindex\.click database|وجدت في قاعدة بيانات الموقع/g,
      '<span class="md-db-badge">🗄️ قاعدة بيانات الموقع</span>'
    );

    t = t.replace(
      /^(⚠️.+|.*NOT covered.*)$/gm,
      '<span class="md-warn">$1</span>'
    );

    t = t.replace(/^#{2,3}\s+(.+)$/gm, '<span class="md-h3">$1</span>');
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");

    t = t.replace(
      /^(\d+)\.\s+(.+)$/gm,
      '<span class="md-li"><span class="md-li-marker">$1.</span><span>$2</span></span>'
    );

    t = t.replace(
      /^[-•]\s+(.+)$/gm,
      '<span class="md-li"><span class="md-li-marker">•</span><span>$1</span></span>'
    );

    const blocks = t.split(/\n{2,}/);
    t = blocks
      .map((block) => {
        if (
          block.startsWith('<span class="md-h3') ||
          block.startsWith('<span class="md-li') ||
          block.startsWith('<span class="md-warn') ||
          block.startsWith('<span class="md-db')
        ) {
          return block;
        }
        const inner = block.replace(/\n/g, "<br>");
        return `<span class="md-para">${inner}</span>`;
      })
      .join("\n");

    return t;
  }

  function addMessage(role, content) {
    const container = document.getElementById("sila-messages");
    const row = document.createElement("div");
    row.className = `sila-msg-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `sila-msg-avatar ${role === "user" ? "user" : "bot"}`;
    if (role === "user") {
      avatar.textContent = "👤";
    } else {
      avatar.innerHTML = `<img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" loading="lazy" />`;
    }

    const bubble = document.createElement("div");
    bubble.className = `sila-bubble ${role === "error" ? "error" : role === "user" ? "user" : "bot"}`;

    if (role === "user") {
      const dir = detectDir(content);
      bubble.setAttribute("dir", dir);
      bubble.textContent = content;
    } else if (role === "assistant") {
      const dir = detectDir(content);
      bubble.setAttribute("dir", dir);
      bubble.innerHTML = renderMarkdown(content);
    } else {
      bubble.setAttribute("dir", "rtl");
      bubble.textContent = content;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  function showLoading() {
    const container = document.getElementById("sila-messages");
    const row = document.createElement("div");
    row.className = "sila-msg-row assistant";
    row.id = "sila-loading-row";
    row.innerHTML = `
      <div class="sila-msg-avatar bot"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" loading="lazy" /></div>
      <div class="sila-bubble bot" dir="rtl">
        <div class="sila-typing"><span></span><span></span><span></span></div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;font-family:'Cairo',sans-serif;">سيلا تفكر...</div>
      </div>`;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function hideLoading() {
    const el = document.getElementById("sila-loading-row");
    if (el) el.remove();
  }

  // ── Stream response with proper SSE parsing ──
  async function streamResponse(bubble, response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep last incomplete line in buffer
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              
              if (data.chunk) {
                fullText += data.chunk;
                bubble.innerHTML = renderMarkdown(fullText);
                bubble.parentElement.parentElement.scrollTop = bubble.parentElement.parentElement.scrollHeight;
              }
              
              if (data.done) {
                return { success: true, conversationHistory: data.conversationHistory };
              }
            } catch (e) {
              console.error("Parse error:", e, "line:", line);
            }
          }
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      throw err;
    }
  }

  // ── Send message ──
  async function sendMessage() {
    const input = document.getElementById("sila-input");
    const sendBtn = document.getElementById("sila-send");
    const text = input.value.trim();
    if (!text || state.isLoading) return;

    addMessage("user", text);
    input.value = "";
    state.isLoading = true;
    sendBtn.disabled = true;
    showLoading();

    try {
      const res = await fetch(CONFIG.apiUrl + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          conversationHistory: state.history.slice(-8),
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      hideLoading();
      const bubble = addMessage("assistant", "");

      const result = await streamResponse(bubble, res);

      if (result && result.conversationHistory) {
        state.history = result.conversationHistory;
      }
    } catch (err) {
      hideLoading();
      addMessage("error", "❌ حدث خطأ. يرجى المحاولة مرة أخرى.\n" + err.message);
    } finally {
      state.isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ── Init ──
  function init() {
    injectFonts();
    injectStyles();
    buildUI();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
