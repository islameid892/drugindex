// Ask Sila Chat - Medical AI Assistant with Markdown Rendering
// Uses direct API endpoint instead of tRPC

const CONFIG = {
  apiUrl: "/api/askSila",
};

const chatState = {
  isOpen: false,
  isLoading: false,
  conversationHistory: [],
};

document.addEventListener("DOMContentLoaded", initializeChat);

function initializeChat() {
  createChatUI();
  setupEventListeners();
  addMarkdownStyles();
}

function createChatUI() {
  const fab = document.createElement("div");
  fab.id = "ask-sila-fab";
  fab.setAttribute("role", "button");
  fab.setAttribute("hint", "Ask Sila / اسأل سيلا");
  fab.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
    color: white;
    z-index: 999;
    transition: all 0.3s ease;
    font-size: 24px;
  `;
  fab.innerHTML = "💬";

  const chatWindow = document.createElement("div");
  chatWindow.id = "ask-sila-window";
  chatWindow.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 380px;
    height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: none;
    flex-direction: column;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  chatWindow.innerHTML = `
    <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 32px; height: 32px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">●</div>
        <div>
          <div style="font-weight: 600;">Ask Sila</div>
          <div style="font-size: 12px; color: #dbeafe;">● Online</div>
        </div>
      </div>
      <button id="ask-sila-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;">✕</button>
    </div>

    <div id="ask-sila-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f9fafb; display: flex; flex-direction: column; gap: 12px;">
      <div style="background: #eff6ff; padding: 12px; border-radius: 8px;">
        <div style="font-size: 14px; font-weight: 600; color: #1e40af;">👋 مرحباً أنا سيلا</div>
        <div style="font-size: 12px; color: #1e3a8a; margin-top: 4px;">I'm your medical AI assistant. How can I help?</div>
      </div>
    </div>

    <div style="padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 12px; font-weight: 600; color: #4b5563;">Quick Actions:</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
        <button class="quick-action-btn" data-action="icd10" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s;">❓ ICD-10?</button>
        <button class="quick-action-btn" data-action="billing" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s;">💰 Billing</button>
        <button class="quick-action-btn" data-action="code" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s;">🔍 Code</button>
      </div>
    </div>

    <div style="border-top: 1px solid #e5e7eb; padding: 12px 16px; display: flex; gap: 8px;">
      <input id="ask-sila-input" type="text" placeholder="Ask Sila... / اسأل سيلا..." style="flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 14px; outline: none;" />
      <button id="ask-sila-send" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">➤</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(chatWindow);
}

function setupEventListeners() {
  const fab = document.getElementById("ask-sila-fab");
  const closeBtn = document.getElementById("ask-sila-close");
  const sendBtn = document.getElementById("ask-sila-send");
  const inputField = document.getElementById("ask-sila-input");
  const quickBtns = document.querySelectorAll(".quick-action-btn");

  fab.addEventListener("click", toggleChat);
  fab.addEventListener("mouseover", () => fab.style.transform = "scale(1.1)");
  fab.addEventListener("mouseout", () => fab.style.transform = "scale(1)");

  closeBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", sendMessage);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      handleQuickAction(action);
    });
    btn.addEventListener("mouseover", () => btn.style.background = "#dbeafe");
    btn.addEventListener("mouseout", () => btn.style.background = "#eff6ff");
  });
}

function toggleChat() {
  chatState.isOpen = !chatState.isOpen;
  const chatWindow = document.getElementById("ask-sila-window");
  chatWindow.style.display = chatState.isOpen ? "flex" : "none";
  if (chatState.isOpen) {
    setTimeout(() => document.getElementById("ask-sila-input").focus(), 100);
  }
}

function closeChat() {
  chatState.isOpen = false;
  document.getElementById("ask-sila-window").style.display = "none";
}

function handleQuickAction(action) {
  const messages = {
    icd10: "What is ICD-10 and why is it important in medical billing?",
    billing: "Explain the Saudi Billing System (SBS v3.0) and how it works",
    code: "Help me find the ICD-10 code for diabetes",
  };
  document.getElementById("ask-sila-input").value = messages[action];
  sendMessage();
}

async function sendMessage() {
  const inputField = document.getElementById("ask-sila-input");
  const userMessage = inputField.value.trim();

  if (!userMessage || chatState.isLoading) return;

  addMessageToChat("user", userMessage);
  inputField.value = "";

  chatState.isLoading = true;
  showLoadingIndicator();

  try {
    const payload = {
      message: userMessage,
      conversationHistory: chatState.conversationHistory.slice(-10),
    };

    const response = await fetch(CONFIG.apiUrl + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    addMessageToChat("assistant", data.message);

    if (data.conversationHistory) {
      chatState.conversationHistory = data.conversationHistory;
    }
  } catch (error) {
    console.error("Chat error:", error);
    addMessageToChat("error", `❌ Error: ${error.message}`);
  } finally {
    chatState.isLoading = false;
    removeLoadingIndicator();
  }
}

function renderMarkdown(text) {
  let html = text;

  // Escape HTML special characters first (but preserve markdown syntax)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert markdown to HTML
  // Headers (### Title)
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight: 600; font-size: 13px; margin-top: 8px; color: #1e40af;">$1</div>');

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: #111827;">$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: #374151;">$1</em>');

  // Inline code (`code`)
  html = html.replace(/`(.+?)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 12px; color: #1f2937;">$1</code>');

  // Bullet points (- item or • item)
  html = html.replace(/^\s*[-•]\s+(.+)$/gm, '<div style="margin-left: 16px; margin-top: 4px;">• $1</div>');

  // Numbered lists (1. item)
  let listCounter = 0;
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, () => {
    listCounter++;
    return `<div style="margin-left: 16px; margin-top: 4px;">${listCounter}. ${arguments[1]}</div>`;
  });

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function addMessageToChat(role, content) {
  const messagesContainer = document.getElementById("ask-sila-messages");
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `display: flex; ${role === "user" ? "justify-end" : "justify-start"};`;

  const textDiv = document.createElement("div");
  if (role === "user") {
    textDiv.style.cssText = "background: #007bff; color: white; padding: 12px; border-radius: 8px; max-width: 70%; word-wrap: break-word; font-size: 14px;";
    textDiv.textContent = content;
  } else if (role === "assistant") {
    textDiv.style.cssText = "background: #e5e7eb; color: #111827; padding: 12px; border-radius: 8px; max-width: 70%; word-wrap: break-word; font-size: 14px; line-height: 1.5;";
    // Render markdown for assistant messages
    textDiv.innerHTML = renderMarkdown(content);
  } else if (role === "error") {
    textDiv.style.cssText = "background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; max-width: 70%; word-wrap: break-word; font-size: 14px;";
    textDiv.textContent = content;
  }
  
  messageDiv.appendChild(textDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoadingIndicator() {
  const messagesContainer = document.getElementById("ask-sila-messages");
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "ask-sila-loading";
  loadingDiv.style.cssText = "display: flex; justify-start;";
  loadingDiv.innerHTML = `
    <div style="background: #e5e7eb; color: #111827; padding: 12px; border-radius: 8px; font-size: 14px;">
      <div style="display: flex; gap: 4px;">
        <div style="width: 8px; height: 8px; background: #4b5563; border-radius: 50%; animation: ask-sila-bounce 1.4s infinite;"></div>
        <div style="width: 8px; height: 8px; background: #4b5563; border-radius: 50%; animation: ask-sila-bounce 1.4s infinite; animation-delay: 0.2s;"></div>
        <div style="width: 8px; height: 8px; background: #4b5563; border-radius: 50%; animation: ask-sila-bounce 1.4s infinite; animation-delay: 0.4s;"></div>
      </div>
      <div style="margin-top: 4px; font-size: 12px;">Sila is thinking...</div>
    </div>
  `;
  messagesContainer.appendChild(loadingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoadingIndicator() {
  const loadingDiv = document.getElementById("ask-sila-loading");
  if (loadingDiv) loadingDiv.remove();
}

function addMarkdownStyles() {
  if (!document.getElementById("ask-sila-markdown-styles")) {
    const style = document.createElement("style");
    style.id = "ask-sila-markdown-styles";
    style.textContent = `
      @keyframes ask-sila-bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-8px); }
      }
      
      #ask-sila-messages strong {
        font-weight: 600;
        color: #111827;
      }
      
      #ask-sila-messages em {
        font-style: italic;
        color: #374151;
      }
      
      #ask-sila-messages code {
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
        color: #1f2937;
      }
      
      #ask-sila-messages div[style*="margin-left"] {
        margin-top: 4px;
        margin-bottom: 2px;
      }
    `;
    document.head.appendChild(style);
  }
}
