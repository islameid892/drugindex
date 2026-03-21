// ============================================================
// Ask Sila - Medical AI Assistant for drugindex.click
// Version 2.0 - Professional Bilingual Design
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
        width: 58px;
        height: 58px;
        background: linear-gradient(135deg, #1a6fc4 0%, #0d4f9e 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(26,111,196,0.45);
        z-index: 9998;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: 2px solid rgba(255,255,255,0.2);
      }
      #sila-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(26,111,196,0.55); }
      #sila-fab svg { width: 26px; height: 26px; fill: white; }

      #sila-window {
        position: fixed;
        bottom: 96px;
        right: 24px;
        width: 400px;
        max-height: 620px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.18);
        display: none;
        flex-direction: column;
        z-index: 9999;
        font-family: 'Cairo', 'Inter', -apple-system, sans-serif;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      @media (max-width: 480px) {
        #sila-window { width: calc(100vw - 24px); right: 12px; bottom: 88px; }
      }

      /* ── Header ── */
      #sila-header {
        background: linear-gradient(135deg, #1a6fc4 0%, #0d4f9e 100%);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .sila-header-left { display: flex; align-items: center; gap: 10px; }
      .sila-avatar {
        width: 38px; height: 38px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        border: 2px solid rgba(255,255,255,0.35);
        flex-shrink: 0;
      }
      .sila-title { color: #fff; font-weight: 700; font-size: 15px; font-family: 'Cairo', sans-serif; line-height: 1.2; }
      .sila-subtitle { color: rgba(255,255,255,0.8); font-size: 11px; font-family: 'Cairo', sans-serif; display: flex; align-items: center; gap: 4px; }
      .sila-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; display: inline-block; }
      #sila-close {
        background: rgba(255,255,255,0.15);
        border: none; color: white; cursor: pointer;
        width: 28px; height: 28px; border-radius: 50%;
        font-size: 14px; display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      #sila-close:hover { background: rgba(255,255,255,0.3); }

      /* ── Messages area ── */
      #sila-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 14px;
        scroll-behavior: smooth;
      }
      #sila-messages::-webkit-scrollbar { width: 4px; }
      #sila-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

      /* ── Welcome card ── */
      .sila-welcome {
        background: linear-gradient(135deg, #eff6ff, #dbeafe);
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        padding: 14px;
        text-align: center;
      }
      .sila-welcome-title { font-size: 15px; font-weight: 700; color: #1e40af; font-family: 'Cairo', sans-serif; margin-bottom: 4px; }
      .sila-welcome-sub { font-size: 12px; color: #3b82f6; font-family: 'Cairo', sans-serif; line-height: 1.5; }

      /* ── Message bubbles ── */
      .sila-msg-row { display: flex; align-items: flex-end; gap: 8px; }
      .sila-msg-row.user { flex-direction: row-reverse; }

      .sila-msg-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0;
      }
      .sila-msg-avatar.bot { background: linear-gradient(135deg, #1a6fc4, #0d4f9e); color: white; }
      .sila-msg-avatar.user { background: #e2e8f0; color: #475569; }

      .sila-bubble {
        max-width: 78%;
        padding: 11px 14px;
        border-radius: 14px;
        font-size: 13.5px;
        line-height: 1.7;
        word-break: break-word;
      }
      .sila-bubble.bot {
        background: #ffffff;
        color: #1e293b;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .sila-bubble.user {
        background: linear-gradient(135deg, #1a6fc4, #0d4f9e);
        color: #ffffff;
        border-bottom-right-radius: 4px;
      }
      .sila-bubble.error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
        border-bottom-left-radius: 4px;
      }

      /* ── RTL/LTR detection ── */
      .sila-bubble[dir="rtl"] { text-align: right; font-family: 'Cairo', sans-serif; }
      .sila-bubble[dir="ltr"] { text-align: left; font-family: 'Inter', sans-serif; }

      /* ── Markdown inside bubbles ── */
      .sila-bubble strong { font-weight: 700; }
      .sila-bubble.bot strong { color: #1a6fc4; }
      .sila-bubble em { font-style: italic; opacity: 0.85; }
      .sila-bubble code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 1px 5px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }
      .sila-bubble .md-h3 {
        font-weight: 700;
        font-size: 13px;
        color: #1a6fc4;
        margin: 10px 0 4px;
        padding-bottom: 3px;
        border-bottom: 1px solid #dbeafe;
        display: block;
      }
      .sila-bubble .md-li {
        display: flex;
        gap: 6px;
        margin: 3px 0;
        padding-inline-start: 4px;
      }
      .sila-bubble .md-li-marker { color: #1a6fc4; font-weight: 700; flex-shrink: 0; }
      .sila-bubble .md-para { margin: 6px 0; display: block; }
      .sila-bubble .md-warn {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 6px;
        padding: 6px 10px;
        margin: 6px 0;
        color: #9a3412;
        font-size: 12.5px;
      }
      .sila-bubble .md-db-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 20px;
        padding: 2px 8px;
        font-size: 11px;
        color: #1d4ed8;
        margin-bottom: 6px;
      }

      /* ── Loading dots ── */
      .sila-typing { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
      .sila-typing span {
        width: 7px; height: 7px;
        background: #94a3b8;
        border-radius: 50%;
        animation: sila-bounce 1.3s infinite ease-in-out;
      }
      .sila-typing span:nth-child(2) { animation-delay: 0.18s; }
      .sila-typing span:nth-child(3) { animation-delay: 0.36s; }
      @keyframes sila-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
        40% { transform: translateY(-6px); opacity: 1; }
      }

      /* ── Quick actions ── */
      #sila-quick {
        padding: 10px 14px 6px;
        border-top: 1px solid #f1f5f9;
        background: #fff;
        flex-shrink: 0;
      }
      .sila-quick-label { font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 7px; font-family: 'Cairo', sans-serif; }
      .sila-quick-grid { display: flex; gap: 6px; flex-wrap: wrap; }
      .sila-qa-btn {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #334155;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        cursor: pointer;
        font-family: 'Cairo', sans-serif;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .sila-qa-btn:hover { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

      /* ── Input area ── */
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
    // FAB button
    const fab = document.createElement("div");
    fab.id = "sila-fab";
    fab.setAttribute("role", "button");
    fab.setAttribute("aria-label", "Ask Sila - Medical Assistant");
    fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;

    // Chat window
    const win = document.createElement("div");
    win.id = "sila-window";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Ask Sila Chat");
    win.innerHTML = `
      <div id="sila-header">
        <div class="sila-header-left">
          <div class="sila-avatar">🩺</div>
          <div>
            <div class="sila-title">سيلا / Sila</div>
            <div class="sila-subtitle"><span class="sila-dot"></span> مساعد drugindex.click</div>
          </div>
        </div>
        <button id="sila-close" aria-label="Close chat">✕</button>
      </div>

      <div id="sila-messages">
        <div class="sila-welcome">
          <div class="sila-welcome-title">👋 مرحباً! أنا سيلا</div>
          <div class="sila-welcome-sub">
            مساعدك الطبي الذكي على drugindex.click<br>
            أبحث في قاعدة بيانات الموقع لأجيبك بدقة عن أكواد ICD-10 والأدوية وقواعد الفوترة
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

  // ── Detect text direction ──
  function detectDir(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    return arabicChars > latinChars ? "rtl" : "ltr";
  }

  // ── Markdown renderer ──
  function renderMarkdown(raw) {
    // Escape HTML
    let t = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Database badge
    t = t.replace(
      /Found in drugindex\.click database|وجدت في قاعدة بيانات الموقع/g,
      '<span class="md-db-badge">🗄️ قاعدة بيانات الموقع</span>'
    );

    // Warning lines (⚠️ or NOT covered)
    t = t.replace(
      /^(⚠️.+|.*NOT covered.*)$/gm,
      '<span class="md-warn">$1</span>'
    );

    // H3 headers (### or ##)
    t = t.replace(/^#{2,3}\s+(.+)$/gm, '<span class="md-h3">$1</span>');

    // Bold
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Numbered list items
    t = t.replace(
      /^(\d+)\.\s+(.+)$/gm,
      '<span class="md-li"><span class="md-li-marker">$1.</span><span>$2</span></span>'
    );

    // Bullet list items (- or •)
    t = t.replace(
      /^[-•]\s+(.+)$/gm,
      '<span class="md-li"><span class="md-li-marker">•</span><span>$1</span></span>'
    );

    // Paragraphs: split on double newline
    const blocks = t.split(/\n{2,}/);
    t = blocks
      .map((block) => {
        // If already wrapped in a block element, don't wrap again
        if (
          block.startsWith('<span class="md-h3') ||
          block.startsWith('<span class="md-li') ||
          block.startsWith('<span class="md-warn') ||
          block.startsWith('<span class="md-db')
        ) {
          return block;
        }
        // Single newlines within a paragraph → <br>
        const inner = block.replace(/\n/g, "<br>");
        return `<span class="md-para">${inner}</span>`;
      })
      .join("\n");

    return t;
  }

  // ── Add message to chat ──
  function addMessage(role, content) {
    const container = document.getElementById("sila-messages");

    const row = document.createElement("div");
    row.className = `sila-msg-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `sila-msg-avatar ${role === "user" ? "user" : "bot"}`;
    avatar.textContent = role === "user" ? "👤" : "🩺";

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
  }

  // ── Loading indicator ──
  function showLoading() {
    const container = document.getElementById("sila-messages");
    const row = document.createElement("div");
    row.className = "sila-msg-row assistant";
    row.id = "sila-loading-row";
    row.innerHTML = `
      <div class="sila-msg-avatar bot">🩺</div>
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
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      hideLoading();
      addMessage("assistant", data.message);

      if (data.conversationHistory) {
        state.history = data.conversationHistory;
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
