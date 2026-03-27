// Ask Sila - Medical AI Assistant for drugindex.click
// Version 4.0 - Purple Modern Design + Fixed Streaming
// ============================================================

(function () {
  "use strict";

  const CONFIG = { apiUrl: "/api/askSila" };

  const state = {
    isOpen: false,
    isLoading: false,
    history: [],
  };

  // ── Inject Google Fonts ──
  function injectFonts() {
    if (document.getElementById("sila-fonts")) return;
    const link = document.createElement("link");
    link.id = "sila-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }

  // ── Inject CSS - Purple Modern Design ──
  function injectStyles() {
    if (document.getElementById("sila-styles")) return;
    const css = `
      * { box-sizing: border-box; }
      
      #sila-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 8px 32px rgba(168, 85, 247, 0.4), 0 0 0 4px rgba(168, 85, 247, 0.15);
        z-index: 9998;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 3px solid #ffffff;
        overflow: visible;
        padding: 0;
      }
      #sila-fab:hover { 
        transform: scale(1.1) translateY(-4px);
        box-shadow: 0 12px 40px rgba(168, 85, 247, 0.5), 0 0 0 6px rgba(168, 85, 247, 0.2);
      }
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
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      #sila-fab .sila-fab-badge svg {
        width: 12px;
        height: 12px;
        fill: white;
      }
      #sila-fab::before {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        border: 2px solid rgba(168, 85, 247, 0.3);
        animation: sila-pulse 2.5s ease-in-out infinite;
      }
      #sila-fab.closed {
        opacity: 0.6;
      }
      #sila-fab.closed::before {
        animation: none;
        border-color: rgba(168, 85, 247, 0.15);
      }
      #sila-fab-close-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        color: white;
        opacity: 0;
        transform: scale(0.7);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        z-index: 10;
      }
      #sila-fab:hover #sila-fab-close-btn {
        opacity: 1;
        transform: scale(1);
      }
      #sila-fab-close-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
      }
      @keyframes sila-pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0; transform: scale(1.2); }
      }

      #sila-window {
        position: fixed;
        bottom: 96px;
        right: 24px;
        width: 420px;
        max-height: 680px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 9999;
        font-family: 'Cairo', 'Inter', sans-serif;
        overflow: hidden;
      }

      @media (max-width: 480px) {
        #sila-window {
          width: calc(100vw - 32px);
          max-height: calc(100vh - 120px);
          bottom: 80px;
          right: 16px;
          left: 16px;
          border-radius: 16px;
        }
      }

      #sila-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px;
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
        border-radius: 20px 20px 0 0;
        position: relative;
        overflow: hidden;
      }

      #sila-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: sila-shimmer 8s ease-in-out infinite;
      }

      @keyframes sila-shimmer {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(20px, 20px); }
      }

      .sila-header-left {
        display: flex;
        gap: 14px;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .sila-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid rgba(255,255,255,0.8);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }

      .sila-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .sila-title {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.3px;
      }

      .sila-subtitle {
        font-size: 12px;
        color: rgba(255,255,255,0.85);
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 3px;
      }

      .sila-dot {
        width: 7px;
        height: 7px;
        background: #10b981;
        border-radius: 50%;
        display: inline-block;
        animation: sila-pulse-dot 2s ease-in-out infinite;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      }

      @keyframes sila-pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      #sila-close {
        background: rgba(255,255,255,0.2);
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #ffffff;
        padding: 6px 8px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        border-radius: 8px;
        position: relative;
        z-index: 1;
      }

      #sila-close:hover { 
        background: rgba(255,255,255,0.3);
        transform: rotate(90deg);
      }

      #sila-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: linear-gradient(180deg, #fafaf9 0%, #f5f3ff 100%);
      }

      #sila-messages::-webkit-scrollbar {
        width: 6px;
      }

      #sila-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      #sila-messages::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.3);
        border-radius: 3px;
      }

      #sila-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, 0.5);
      }

      .sila-welcome {
        text-align: center;
        padding: 24px 16px;
        color: #64748b;
      }

      .sila-welcome-title {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin: 12px 0;
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .sila-welcome-sub {
        font-size: 14px;
        line-height: 1.6;
        color: #64748b;
      }

      .sila-msg-row {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        animation: sila-fade-in 0.3s ease-out;
      }

      @keyframes sila-fade-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .sila-msg-row.user {
        justify-content: flex-end;
      }

      .sila-msg-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 18px;
      }

      .sila-msg-avatar.bot img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(168, 85, 247, 0.3);
      }

      .sila-bubble {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.6;
        word-wrap: break-word;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }

      .sila-bubble.user {
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        color: white;
        border-radius: 16px 4px 16px 16px;
      }

      .sila-bubble.bot {
        background: #ffffff;
        color: #1e293b;
        border-radius: 4px 16px 16px 16px;
        border: 1px solid rgba(168, 85, 247, 0.1);
      }

      .sila-bubble.error {
        background: #fee2e2;
        color: #991b1b;
        border-radius: 4px 16px 16px 16px;
        border: 1px solid #fecaca;
      }

      .sila-typing {
        display: flex;
        gap: 5px;
        height: 18px;
        align-items: center;
        padding: 4px 0;
      }

      .sila-typing span {
        width: 7px;
        height: 7px;
        background: rgba(168, 85, 247, 0.6);
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
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.1));
        color: #7c3aed;
        padding: 3px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        margin: 4px 0;
        border-left: 3px solid #a855f7;
      }

      .md-warn {
        display: block;
        background: rgba(239, 68, 68, 0.08);
        color: #dc2626;
        padding: 8px 12px;
        border-left: 3px solid #dc2626;
        margin: 6px 0;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
      }

      .md-h3 {
        display: block;
        font-weight: 700;
        color: #7c3aed;
        margin: 10px 0 6px 0;
        font-size: 14px;
      }

      .md-li {
        display: block;
        margin: 5px 0;
        padding-left: 20px;
      }

      .md-li-marker {
        display: inline-block;
        width: 20px;
        margin-left: -20px;
        font-weight: 600;
        color: #a855f7;
      }

      .md-para {
        display: block;
        margin: 6px 0;
      }

      #sila-quick {
        padding: 12px 16px;
        border-top: 1px solid rgba(168, 85, 247, 0.1);
        background: linear-gradient(180deg, #fafaf9 0%, #f5f3ff 100%);
        flex-shrink: 0;
      }

      .sila-quick-label {
        font-size: 11px;
        font-weight: 700;
        color: #7c3aed;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 10px;
      }

      .sila-quick-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .sila-qa-btn {
        background: white;
        border: 1.5px solid rgba(168, 85, 247, 0.2);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 12px;
        font-family: 'Cairo', 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-align: center;
        color: #1e293b;
        font-weight: 500;
      }
      .sila-qa-btn:hover { 
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(124, 58, 237, 0.08));
        border-color: #a855f7;
        color: #7c3aed;
        transform: translateY(-2px);
      }

      #sila-input-area {
        border-top: 1px solid rgba(168, 85, 247, 0.1);
        padding: 14px 16px;
        display: flex;
        gap: 10px;
        align-items: center;
        background: linear-gradient(180deg, #fafaf9 0%, #f5f3ff 100%);
        flex-shrink: 0;
      }

      #sila-input {
        flex: 1;
        border: 1.5px solid rgba(168, 85, 247, 0.2);
        border-radius: 26px;
        padding: 11px 16px;
        font-size: 14px;
        font-family: 'Cairo', 'Inter', sans-serif;
        outline: none;
        color: #1e293b;
        background: #ffffff;
        transition: all 0.2s;
        direction: auto;
      }

      #sila-input:focus { 
        border-color: #a855f7;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
      }

      #sila-input::placeholder { color: #a0aec0; }

      #sila-send {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
      }

      #sila-send:hover { 
        transform: scale(1.08) translateY(-2px);
        box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
      }

      #sila-send:disabled { 
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      #sila-send svg { 
        width: 18px;
        height: 18px;
        fill: white;
      }
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
      <button id="sila-fab-close-btn" aria-label="Close Sila">✕</button>
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
            <div class="sila-title">سيلا / Sila <span style="font-size:10px;background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:8px;font-weight:600;letter-spacing:0.5px;backdrop-filter:blur(10px);">AI</span></div>
            <div class="sila-subtitle"><span class="sila-dot"></span> مساعد ICD-10-AM الذكي</div>
          </div>
        </div>
        <button id="sila-close" aria-label="Close chat">✕</button>
      </div>

      <div id="sila-messages">
        <div class="sila-welcome">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/txZYZmGUUkDUUsSi.PNG" alt="Sila" style="width:56px;height:56px;border-radius:50%;border:3px solid rgba(168, 85, 247, 0.3);object-fit:cover;box-shadow:0 4px 12px rgba(168, 85, 247, 0.2);" />
          </div>
          <div class="sila-welcome-title">مرحباً! أنا سيلا 👋</div>
          <div class="sila-welcome-sub">
            مساعدك الطبي الذكي المتخصص في <strong>ICD-10-AM</strong><br>
            أبحث في قاعدة بيانات الموقع لأجيبك بدقة عن الأكواد والأدوية
          </div>
        </div>
      </div>

      <div id="sila-quick">
        <div class="sila-quick-label">أسئلة سريعة</div>
        <div class="sila-quick-grid">
          <button class="sila-qa-btn" data-q="ما هو كود ICD-10 للسكري؟">🩸 السكري</button>
          <button class="sila-qa-btn" data-q="ما هي أدوية ضغط الدم؟">💊 الضغط</button>
          <button class="sila-qa-btn" data-q="ما هي الأكواد غير المغطاة؟">⚠️ غير مغطى</button>
          <button class="sila-qa-btn" data-q="ما هو ICD-10؟">❓ معلومات</button>
        </div>
      </div>

      <div id="sila-input-area">
        <input id="sila-input" type="text" placeholder="اسأل سيلا..." autocomplete="off" />
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
    document.getElementById("sila-fab-close-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      closeFab();
    });
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
    // Re-open FAB on click when closed
    document.getElementById("sila-fab").addEventListener("click", () => {
      if (document.getElementById("sila-fab").classList.contains("closed")) {
        reopenFab();
      }
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

  function closeFab() {
    const fab = document.getElementById("sila-fab");
    fab.classList.add("closed");
    fab.style.pointerEvents = "none";
    fab.style.opacity = "0.4";
    setTimeout(() => {
      fab.style.pointerEvents = "auto";
    }, 300);
  }

  function reopenFab() {
    const fab = document.getElementById("sila-fab");
    fab.classList.remove("closed");
    fab.style.opacity = "1";
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
      </div>`;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function hideLoading() {
    const el = document.getElementById("sila-loading-row");
    if (el) el.remove();
  }

  // ── Stream response - FIXED ──
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
                // Scroll to bottom
                const container = bubble.closest("#sila-messages");
                if (container) container.scrollTop = container.scrollHeight;
              }
              
              if (data.done) {
                return { success: true, conversationHistory: data.conversationHistory };
              }
            } catch (e) {
              console.error("Parse error:", e);
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
      addMessage("error", "❌ حدث خطأ. يرجى المحاولة مرة أخرى.");
      console.error("Error:", err);
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
