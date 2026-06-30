/* ============ AI KYRGYZSTAN — универсальный чат ============ */
(function () {
  "use strict";

  // ---------- Хранилище настроек ----------
  const LS_KEY = "aikg_api_key";
  const LS_MODEL = "aikg_model";
  const getKey = () => localStorage.getItem(LS_KEY) || "";
  const getModel = () => localStorage.getItem(LS_MODEL) || "claude-opus-4-8";

  // ---------- Системный промпт ----------
  const SYSTEM_PROMPT =
    "Ты — AI Kyrgyzstan, универсальный ИИ-ассистент. Отвечай на любые вопросы дружелюбно, " +
    "понятно и по делу, на языке пользователя (русский или кыргызский). " +
    "Ты — отличный программист и помогаешь писать код на любых языках и платформах: " +
    "Swift, SwiftUI, UIKit, HTML, CSS, JavaScript, Python и других. " +
    "Когда даёшь код — приводи рабочий, чистый, полный пример и оформляй его в Markdown-блок " +
    "с указанием языка (например ```swift, ```python, ```html). Кратко поясняй ключевые места.";

  // ---------- Элементы ----------
  const chat = document.getElementById("chat");
  const messagesEl = document.getElementById("messages");
  const welcome = document.getElementById("welcome");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const hint = document.getElementById("hint");

  // настройки/модалка
  const modal = document.getElementById("settingsModal");
  const openSettings = document.getElementById("openSettings");
  const closeSettings = document.getElementById("closeSettings");
  const saveSettings = document.getElementById("saveSettings");
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("modelSelect");
  const modalStatus = document.getElementById("modalStatus");
  const newChatBtn = document.getElementById("newChat");

  // история диалога (для многоходового контекста)
  let history = [];

  // ---------- Markdown настройка ----------
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  // ---------- Утилиты UI ----------
  function refreshHint() {
    hint.style.display = getKey() ? "none" : "block";
  }

  function hideWelcome() {
    if (welcome) welcome.style.display = "none";
  }

  function scrollDown() {
    chat.scrollTop = chat.scrollHeight;
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 200) + "px";
  }

  // Рендер блоков кода: подсветка + кнопка копирования
  function enhanceCode(container) {
    container.querySelectorAll("pre > code").forEach((code) => {
      // язык
      let lang = "code";
      code.classList.forEach((c) => { if (c.startsWith("language-")) lang = c.slice(9); });
      // подсветка
      if (window.hljs) { try { hljs.highlightElement(code); } catch (e) {} }
      // обёртка с шапкой
      const pre = code.parentElement;
      const wrap = document.createElement("div");
      wrap.className = "code-wrap";
      const head = document.createElement("div");
      head.className = "code-head";
      head.innerHTML = '<span class="code-lang">' + lang + '</span>';
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Копировать";
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          btn.textContent = "✓ Скопировано";
          btn.classList.add("copied");
          setTimeout(() => { btn.textContent = "Копировать"; btn.classList.remove("copied"); }, 1500);
        });
      });
      head.appendChild(btn);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);
    });
  }

  function addMessage(role, text) {
    hideWelcome();
    const msg = document.createElement("div");
    msg.className = "msg " + (role === "user" ? "user" : "bot");
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "Вы" : "AI";
    const body = document.createElement("div");
    body.className = "body";
    if (role === "user") {
      body.textContent = text; // у пользователя — обычный текст
    } else {
      body.innerHTML = window.marked ? marked.parse(text) : text;
      enhanceCode(body);
    }
    msg.appendChild(avatar);
    msg.appendChild(body);
    messagesEl.appendChild(msg);
    scrollDown();
    return body;
  }

  function addTyping() {
    hideWelcome();
    const msg = document.createElement("div");
    msg.className = "msg bot";
    msg.innerHTML = '<div class="avatar">AI</div>' +
      '<div class="body"><div class="typing"><span></span><span></span><span></span></div></div>';
    messagesEl.appendChild(msg);
    scrollDown();
    return msg;
  }

  // ---------- Запрос к Claude API ----------
  async function askClaude(userText) {
    const key = getKey();
    history.push({ role: "user", content: userText });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: history
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error("API " + res.status + ": " + errText.slice(0, 300));
    }
    const data = await res.json();
    const answer = (data.content || []).map((b) => b.text || "").join("").trim();
    history.push({ role: "assistant", content: answer });
    return answer || "(пустой ответ)";
  }

  // ---------- Офлайн-ответ (без ключа) ----------
  function offlineReply(q) {
    return "Чтобы я мог отвечать на любые вопросы и **писать код** (Swift, SwiftUI, UIKit, HTML, Python и др.), " +
      "подключите ключ Claude API в настройках ⚙️ вверху справа.\n\n" +
      "Получить ключ можно бесплатно зарегистрировавшись на [console.anthropic.com](https://console.anthropic.com).";
  }

  // ---------- Отправка ----------
  let busy = false;
  async function handleSend(text) {
    if (busy || !text.trim()) return;
    busy = true; sendBtn.disabled = true;

    addMessage("user", text);
    input.value = ""; autoGrow();

    const typing = addTyping();
    try {
      let answer;
      if (getKey()) {
        answer = await askClaude(text);
      } else {
        await new Promise((r) => setTimeout(r, 300));
        answer = offlineReply(text);
      }
      typing.remove();
      addMessage("bot", answer);
    } catch (e) {
      typing.remove();
      addMessage("bot", "⚠️ Ошибка: " + e.message +
        "\n\nПроверьте API-ключ в настройках ⚙️ или попробуйте ещё раз.");
    } finally {
      busy = false; sendBtn.disabled = false;
      input.focus();
    }
  }

  // ---------- События ----------
  form.addEventListener("submit", (e) => { e.preventDefault(); handleSend(input.value); });

  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input.value);
    }
  });

  document.querySelectorAll("#welcome .chips button").forEach((b) => {
    b.addEventListener("click", () => handleSend(b.textContent));
  });

  newChatBtn.addEventListener("click", () => {
    history = [];
    messagesEl.innerHTML = "";
    if (welcome) welcome.style.display = "";
    input.focus();
  });

  // ---------- Настройки ----------
  function openModal() {
    apiKeyInput.value = "";
    modelSelect.value = getModel();
    modalStatus.textContent = getKey() ? "✅ Ключ уже сохранён" : "";
    modal.hidden = false;
  }
  openSettings.addEventListener("click", openModal);
  closeSettings.addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  saveSettings.addEventListener("click", () => {
    const val = apiKeyInput.value.trim();
    if (val) localStorage.setItem(LS_KEY, val);
    localStorage.setItem(LS_MODEL, modelSelect.value);
    modalStatus.textContent = "✅ Сохранено!";
    refreshHint();
    setTimeout(() => { modal.hidden = true; }, 700);
  });

  // ---------- Старт ----------
  refreshHint();
  autoGrow();
  input.focus();
})();
