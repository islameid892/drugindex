/**
 * Ask Sila - Medical AI Assistant Chat Widget
 * Vanilla JavaScript implementation with tRPC integration
 */

(function () {
  // Configuration
  const CONFIG = {
    apiUrl: "/api/trpc",
  };

  // Chat state
  const chatState = {
    isOpen: false,
    isLoading: false,
    conversationHistory: [],
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAskSila);
  } else {
    initAskSila();
  }

  function initAskSila() {
    createChatWidget();
    setupEventListeners();
  }

  function createChatWidget() {
    // Create FAB button
    const fab = document.createElement("div");
    fab.id = "ask-sila-fab";
    fab.setAttribute("role", "button");
    fab.setAttribute("hint", "Ask Sila / اسأل سيلا");
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    // Create chat window
    const chatWindow = document.createElement("div");
    chatWindow.id = "ask-sila-window";
    chatWindow.style.display = "none";
    chatWindow.innerHTML = `
      <div class="ask-sila-header">
        <div class="ask-sila-title-group">
          <h3 class="ask-sila-title">Ask Sila</h3>
          <div class="ask-sila-status">
            <div class="ask-sila-status-dot"></div>
            <span>Online</span>
          </div>
        </div>
        <button id="ask-sila-close" class="ask-sila-close-btn" hint="Close chat">✕</button>
      </div>
      <div class="ask-sila-messages"></div>
      <div class="ask-sila-quick-actions">
        <button class="ask-sila-quick-btn" data-action="What is ICD-10 and why is it important in medical billing? Explain in simple terms.">❓ What is ICD-10?</button>
        <button class="ask-sila-quick-btn" data-action="What are the main billing rules in Saudi Billing System (SBS v3.0)?">💰 Check Billing Rules</button>
        <button class="ask-sila-quick-btn" data-action="How do I find the correct ICD-10 code for a specific diagnosis?">🔍 Find a Code</button>
      </div>
      <div class="ask-sila-input-group">
        <input id="ask-sila-input" type="text" placeholder="Ask Sila... / اسأل سيلا..." />
        <button id="ask-sila-send" hint="Send message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    // Add styles
    addStyles();

    // Append to body
    document.body.appendChild(fab);
    document.body.appendChild(chatWindow);

    // Add initial message
    addMessageToUI(
      "assistant",
      "مرحباً! أنا سيلا (Ask Sila) 👋\nI'm your medical AI assistant specialized in ICD-10 coding and billing. I can help you:\n\n• Find the correct ICD-10 codes\n• Explain medical conditions\n• Answer billing questions\n• Support both Arabic and English\n\nLet's get started! 🚀"
    );
  }

  function setupEventListeners() {
    const fab = document.getElementById("ask-sila-fab");
    const closeBtn = document.getElementById("ask-sila-close");
    const sendBtn = document.getElementById("ask-sila-send");
    const input = document.getElementById("ask-sila-input");
    const quickBtns = document.querySelectorAll(".ask-sila-quick-btn");

    fab.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", closeChat);
    sendBtn.addEventListener("click", () => {
      const message = input.value.trim();
      if (message) {
        sendMessage(message);
        input.value = "";
      }
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const message = input.value.trim();
        if (message) {
          sendMessage(message);
          input.value = "";
        }
      }
    });

    quickBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        sendMessage(action);
      });
    });
  }

  function toggleChat() {
    const chatWindow = document.getElementById("ask-sila-window");
    chatState.isOpen = !chatState.isOpen;
    chatWindow.style.display = chatState.isOpen ? "flex" : "none";
    if (chatState.isOpen) {
      setTimeout(() => {
        document.getElementById("ask-sila-input").focus();
      }, 100);
    }
  }

  function closeChat() {
    chatState.isOpen = false;
    document.getElementById("ask-sila-window").style.display = "none";
  }

  async function sendMessage(userMessage) {
    if (!userMessage.trim() || chatState.isLoading) return;

    // Add user message to UI
    addMessageToUI("user", userMessage);
    chatState.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    chatState.isLoading = true;
    showLoadingState();

    try {
      // Prepare query params for tRPC
      const params = new URLSearchParams();
      params.append("input", JSON.stringify({
        json: {
          message: userMessage,
          conversationHistory: chatState.conversationHistory.slice(-10),
        },
      }));

      const url = `${CONFIG.apiUrl}/askSila.chat?${params.toString()}`;
      console.log("Sending request to:", url);

      // Call tRPC endpoint
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText, response.status);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("tRPC Response:", data);

      // Parse tRPC response
      let aiResponse = null;

      // tRPC returns an array with the result at index 0
      if (Array.isArray(data) && data[0]) {
        const result = data[0];

        // Check for error in the response
        if (result.error) {
          console.error("tRPC Error:", result.error);
          aiResponse = `❌ Error: ${
            result.error.json?.message ||
            result.error.message ||
            "Unknown error"
          }`;
        }
        // Check for successful result
        else if (result.result?.data?.json?.message) {
          aiResponse = result.result.data.json.message;
        }
        // Fallback: check if result has message directly
        else if (result.result?.data?.message) {
          aiResponse = result.result.data.message;
        }
      }

      if (!aiResponse) {
        aiResponse =
          "❌ Unable to get a response. Please try again or check the console for errors.";
      }

      addMessageToUI("assistant", aiResponse);
      chatState.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });
    } catch (error) {
      console.error("Error:", error);
      addMessageToUI(
        "assistant",
        `❌ Failed to send message: ${error.message}`
      );
    } finally {
      chatState.isLoading = false;
      hideLoadingState();
    }
  }

  function addMessageToUI(role, content) {
    const messagesContainer = document.querySelector(".ask-sila-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `ask-sila-message ask-sila-message-${role}`;

    const textDiv = document.createElement("div");
    textDiv.className = "ask-sila-message-text";
    textDiv.textContent = content;

    messageDiv.appendChild(textDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showLoadingState() {
    const messagesContainer = document.querySelector(".ask-sila-messages");
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "ask-sila-loading";
    loadingDiv.className = "ask-sila-message ask-sila-message-assistant";
    loadingDiv.innerHTML = `
      <div class="ask-sila-message-text">
        <div class="ask-sila-typing">
          <span></span><span></span><span></span>
        </div>
        Sila is thinking...
      </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideLoadingState() {
    const loading = document.getElementById("ask-sila-loading");
    if (loading) loading.remove();
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #ask-sila-fab {
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
      }

      #ask-sila-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 123, 255, 0.6);
      }

      #ask-sila-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 380px;
        height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      @media (max-width: 480px) {
        #ask-sila-window {
          width: calc(100vw - 20px);
          height: 70vh;
          bottom: 80px;
          right: 10px;
        }
      }

      .ask-sila-header {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ask-sila-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .ask-sila-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        white-space: nowrap;
      }

      .ask-sila-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        opacity: 0.9;
      }

      .ask-sila-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .ask-sila-close-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
        flex-shrink: 0;
        font-size: 20px;
      }

      .ask-sila-close-btn:hover {
        opacity: 0.8;
      }

      .ask-sila-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ask-sila-message {
        display: flex;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ask-sila-message-user {
        justify-content: flex-end;
      }

      .ask-sila-message-assistant {
        justify-content: flex-start;
      }

      .ask-sila-message-text {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
      }

      .ask-sila-message-user .ask-sila-message-text {
        background: #007bff;
        color: white;
        border-radius: 12px 4px 12px 12px;
      }

      .ask-sila-message-assistant .ask-sila-message-text {
        background: #f0f0f0;
        color: #333;
        border-radius: 4px 12px 12px 12px;
      }

      .ask-sila-typing {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }

      .ask-sila-typing span {
        width: 8px;
        height: 8px;
        background: #999;
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .ask-sila-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ask-sila-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0.5; }
        30% { opacity: 1; }
      }

      .ask-sila-quick-actions {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid #eee;
      }

      .ask-sila-quick-btn {
        background: #f8f9fa;
        border: 1px solid #ddd;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        text-align: left;
        transition: all 0.2s;
      }

      .ask-sila-quick-btn:hover {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }

      .ask-sila-input-group {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #eee;
      }

      #ask-sila-input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      #ask-sila-input:focus {
        outline: none;
        border-color: #007bff;
      }

      #ask-sila-send {
        background: #007bff;
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      #ask-sila-send:hover {
        background: #0056b3;
      }
    `;
    document.head.appendChild(style);
  }
})();
