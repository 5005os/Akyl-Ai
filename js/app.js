/* ============ AI KYRGYZSTAN — логика приложения ============ */
(function () {
  "use strict";

  const K = window.KNOWLEDGE || {};

  // ---------------------------------------------------------------
  // 1. РЕНДЕР РАЗДЕЛОВ ИЗ БАЗЫ ЗНАНИЙ
  // ---------------------------------------------------------------
  function renderHistory() {
    const el = document.getElementById("timeline");
    if (!el || !K.history) return;
    el.innerHTML = K.history.map(h => `
      <div class="tl-item">
        <div class="tl-period">${h.period}</div>
        <div class="tl-title">${h.title}</div>
        <div class="tl-text">${h.text}</div>
      </div>`).join("");
  }

  function renderForecasts() {
    const el = document.getElementById("forecastCards");
    if (!el || !K.forecasts) return;
    el.innerHTML = K.forecasts.map(f => `
      <div class="fcard">
        <div class="icon">${f.icon}</div>
        <div class="cat">${f.category}</div>
        <h3>${f.title}</h3>
        <p>${f.text}</p>
        <span class="horizon">📅 ${f.horizon}</span>
      </div>`).join("");
  }

  function renderSources() {
    const el = document.getElementById("sourcesGrid");
    if (!el || !K.sources) return;
    el.innerHTML = K.sources.map(s => `
      <a class="source-item" href="${s.url}" target="_blank" rel="noopener">
        <span class="stype">${s.type}</span>
        <span class="sname">${s.name}</span>
        <span class="surl">${s.url.replace(/^https?:\/\//, "")}</span>
      </a>`).join("");
  }

  // ---------------------------------------------------------------
  // 2. ОФЛАЙН-ИИ: поиск ответа в базе знаний
  // ---------------------------------------------------------------
  function offlineAnswer(question) {
    const q = question.toLowerCase();

    // Поиск по парам «вопрос-ответ»
    for (const item of (K.qa || [])) {
      if (item.keys.some(key => q.includes(key))) { lastTopic = item; return item.answer; }
    }

    // История по ключевым словам
    if (q.includes("истори") || q.includes("кратко")) {
      const top = (K.history || []).slice(0, 5)
        .map(h => `• ${h.period} — ${h.title}`).join("\n");
      return "Краткая история Кыргызстана:\n" + top + "\n\nСпросите про конкретный период подробнее.";
    }

    // Прогнозы
    if (q.includes("прогноз") || q.includes("будущ") || q.includes("развит")) {
      const top = (K.forecasts || []).slice(0, 4)
        .map(f => `${f.icon} ${f.title} (${f.horizon}): ${f.text}`).join("\n\n");
      return "Прогнозы развития Кыргызстана:\n\n" + top;
    }

    // Общие факты
    if (q.includes("факт") || q.includes("расскажи о") || q.includes("о кыргызстан")) {
      const f = K.facts || {};
      return `Кыргызстан — страна в Центральной Азии.\n` +
        `🏙️ Столица: ${f.capital}\n👥 Население: ${f.population}\n` +
        `📐 Площадь: ${f.area}\n🗣️ Языки: ${f.languages}\n` +
        `💵 Валюта: ${f.currency}\n🎉 Независимость: ${f.independence}\n` +
        `🏔️ Высшая точка: ${f.highestPoint}`;
    }

    // Приветствия
    if (q.includes("салам") || q.includes("привет") || q.includes("здрав") || q.includes("ассалам")) {
      return "Салам! 👋 Рад помочь. Спросите меня про историю, географию, прогнозы или культуру Кыргызстана.";
    }

    // Ничего не нашли в базе — вернём null, чтобы подключился Qwen (запасной мозг)
    return null;
  }

  // ---------------------------------------------------------------
  // 4. ИНТЕРФЕЙС ЧАТА
  // ---------------------------------------------------------------
  const chatWindow = document.getElementById("chatWindow");
  const chatForm = document.getElementById("chatForm");
  const chatText = document.getElementById("chatText");

  // ---- Аватар бота — логотип AkylAi ----
  const BOT_AVATAR = `<img src="assets/logo.png" alt="AkylAi" />`;

  function addMessage(text, who, mood) {
    const msg = document.createElement("div");
    msg.className = "msg " + who;
    const avatar = who === "user" ? "Вы" : BOT_AVATAR;
    msg.innerHTML =
      `<div class="avatar">${avatar}</div>` +
      `<div class="bubble"></div>`;
    msg.querySelector(".bubble").textContent = text;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return msg;
  }

  function addTyping() {
    const msg = document.createElement("div");
    msg.className = "msg bot";
    msg.innerHTML = `<div class="avatar">${BOT_AVATAR}</div><div class="bubble typing">печатает…</div>`;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return msg;
  }

  // ---- Память диалога ----
  let lastArticle = null;   // последняя обсуждаемая статья УК
  let lastTopic = null;     // последняя обсуждаемая тема (item из базы знаний)

  // ---- Долгая память: сохраняем историю чата в браузере (переживает перезагрузку) ----
  const HISTORY_KEY = "akylai_history";
  const HISTORY_LIMIT = 200; // максимум сообщений в памяти

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function persistMessage(text, who) {
    const h = loadHistory();
    h.push({ text: text, who: who });
    while (h.length > HISTORY_LIMIT) h.shift();
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) {}
  }
  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    lastArticle = null;
    lastTopic = null;
  }

  // ---- Память имени пользователя (обращаемся по имени) ----
  const NAME_KEY = "akylai_username";
  function getUserName() {
    try { return localStorage.getItem(NAME_KEY) || null; } catch (e) { return null; }
  }
  function setUserName(n) {
    try { localStorage.setItem(NAME_KEY, n); } catch (e) {}
  }
  function forgetUserName() {
    try { localStorage.removeItem(NAME_KEY); } catch (e) {}
  }

  // Распознаём знакомство и вопрос «как меня зовут»
  function nameMemory(question) {
    const q = question.trim();
    // Сначала — вопрос об имени («как меня зовут», «менин атым ким»)
    if (/(как меня зовут|мо[её] имя\??$|помн.*(им[яею])|менин атым ким)/i.test(q)) {
      const n = getUserName();
      return n
        ? "Конечно помню — вас зовут " + n + ". 🙂"
        : "Пока не знаю вашего имени. Напишите «меня зовут …» — и я запомню.";
    }
    // Затем — знакомство: «меня зовут Айбек», «моё имя Айбек», «менин атым Айбек»
    const m = q.match(/(?:меня зовут|мо[её] имя|менин атым|мени)\s+([A-Za-zА-Яа-яЁёҢңӨөҮүІі]{2,20})/i);
    if (m) {
      const raw = m[1];
      // «ким», «кто» — это вопросительные слова, а не имя
      if (/^(ким|кто|эмне)$/i.test(raw)) {
        const n = getUserName();
        return n ? "Вас зовут " + n + ". 🙂" : "Пока не знаю вашего имени. Напишите «меня зовут …» — запомню.";
      }
      const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      setUserName(name);
      return "Абдан жакшы, " + name + "! 😊 (Приятно познакомиться!) Буду обращаться по имени. Чем помочь?";
    }
    return null;
  }
  // Восстановить прошлый диалог при загрузке страницы
  function restoreHistory() {
    const h = loadHistory();
    if (!h.length || !chatWindow) return;
    h.forEach(function (m) { addMessage(m.text, m.who); });
  }

  // ---- Определяем, задан ли вопрос на кыргызском ----
  function isKyrgyzText(s) {
    if (/[ңөүҢӨҮ]/.test(s)) return true;
    return /\b(эмне|кандай|качан|кайда|эмнеге|үчүн|менен|болот|канча|кантип|беле|тууралуу|жөнүндө|жонундо|беренеси?|мыйзам[а-я]*|кылмыш)\b/i.test(s);
  }

  // ---- Точный поиск статьи Уголовного кодекса КР ----
  function formatLaw(num, question) {
    if (isKyrgyzText(question || "")) {
      return "📘 КР Кылмыш-жаза кодексинин " + num + "-беренеси:\n\n" +
        window.LAWS_UK_KR[num] +
        "\n\n(Эскертүү: берененин кыргызча котормосу азырынча базада жок, расмий орусча тексти көрсөтүлдү. Булак: УК КР, 2021-ж.)";
    }
    return "📘 Статья " + num + " Уголовного кодекса Кыргызской Республики:\n\n" +
      window.LAWS_UK_KR[num] + "\n\n(Источник: УК КР, 2021 г.)";
  }
  // ---- Запрос подробностей: «подробнее», «все пункты», «статья 122 подробнее» ----
  function detailRequest(question) {
    const q = question.toLowerCase().trim();
    const wantsDetail = /(подробн|все пункт|всё пункт|полн|детал|по частям|весь текст|дальше|больше|ещё|еще|толук|бардык бөлүк|дагы)/.test(q);
    if (!wantsDetail) return null;
    const ky = isKyrgyzText(question);
    const m = question.match(/\b(\d{1,3})(-\d)?\b/);
    const num = m ? m[1] : lastArticle;
    if (!num) {
      // Нет статьи — но помним последнюю тему разговора
      if (lastTopic) return (ky ? "Тема боюнча эске салайын:\n\n" : "Напомню по теме:\n\n") + lastTopic.answer +
        (ky ? "\n\nЭгер КЖКнын кайсы бир беренеси керек болсо — номерин жазыңыз (мисалы «122»)."
            : "\n\nЕсли нужно про конкретную статью УК — напишите её номер (например «122»).");
      return ky
        ? "Эмне жөнүндө толугураак айтайын? 🙂 Адегенде статья же тема жөнүндө сураңыз, андан соң «толук» деп жазыңыз."
        : "О чём подробнее? 🙂 Сначала спросите про статью или тему, потом напишите «подробнее».";
    }
    lastArticle = num;
    if (window.LAWS_FULL && window.LAWS_FULL[num])
      return (ky ? "📖 " + num + "-берене — толук:\n\n" : "📖 Статья " + num + " — подробно:\n\n") + window.LAWS_FULL[num] +
        (ky ? "\n\n(Булак: КР КЖК, 2021-ж.)" : "\n\n(Источник: УК КР, 2021 г.)");
    if (window.LAWS_UK_KR && window.LAWS_UK_KR[num])
      return formatLaw(num, question) + (ky
        ? "\n\nБеренениин бардык бөлүктөрү боюнча толук текст азырынча базада жок — жиберсеңиз, кошуп коём."
        : "\n\nПолного текста по частям пока нет в базе — могу добавить, если пришлёте.");
    return ky
      ? num + "-берене боюнча базада маалымат жок дагы. Текстин жибериңиз — кошуп коём. 🙂"
      : "По статье " + num + " пока нет данных в базе. Пришлите текст — добавлю. 🙂";
  }

  function lookupLaw(question) {
    const laws = window.LAWS_UK_KR;
    if (!laws) return null;
    const q = question.toLowerCase();
    const ky = isKyrgyzText(question);
    const isLaw = /(стать|ук|уголовн|кодекс|наказан|преступл|берене|кылмыш|мыйзам)/.test(q);
    const bare = question.trim().match(/^(\d{1,3})(-\d)?$/); // просто «122»

    // 1) по номеру статьи ("122", "статья 122", "122 статья")
    const m = question.match(/\b(\d{1,3})(-\d)?\b/);
    if (bare || (m && isLaw)) {
      const num = bare ? bare[1] : m[1];
      if (laws[num]) {
        lastArticle = num;
        return formatLaw(num, question) + (ky
          ? "\n\n💡 «Толук» деп жазыңыз — берененин толук текстин көрсөтөм."
          : "\n\n💡 Напишите «подробнее» — покажу полный текст.");
      }
      return ky
        ? "AkylAi базасында " + num + "-берене азырынча жок. Текстин жибериңиз — так кошуп коём. 🙂"
        : "В базе AkylAi пока нет статьи " + num + " УК КР. Пришлите её текст — добавлю точно. 🙂";
    }

    // 2) по названию преступления ("убийство какая статья")
    const idx = window.LAWS_INDEX || {};
    for (const kw in idx) {
      if (q.includes(kw)) {
        const num = idx[kw];
        if (laws[num]) {
          lastArticle = num;
          return (ky ? "Бул " + num + "-берене КР КЖК.\n\n" : "Это статья " + num + " УК КР.\n\n") +
            formatLaw(num, question) + (ky
              ? "\n\n💡 «Толук» деп жазыңыз — берененин толук текстин көрсөтөм."
              : "\n\n💡 Напишите «подробнее» — покажу полный текст.");
        }
      }
    }

    // 3) спросили просто «статья» без номера и преступления — подскажем как
    if (isLaw) {
      return ky
        ? "Ооба, мен КР Кылмыш-жаза кодексинин беренелерин билем! ⚖️ Мындай сураңыз:\n" +
          "• номери менен — «122-берене» же жөн эле «122»\n" +
          "• кылмыш аты менен — «уурулук кайсы берене», «өлтүрүү», «пара»\n" +
          "Жана «толук» деп жазыңыз — берененин толук текстин көрсөтөм."
        : "Да, я знаю статьи Уголовного кодекса КР! ⚖️ Спросите так:\n" +
          "• номером — «статья 122» или просто «122»\n" +
          "• по преступлению — «кража какая статья», «убийство», «взятка»\n" +
          "И напишите «подробнее» — покажу полный текст статьи.";
    }
    return null;
  }

  // ---- Калькулятор: примеры, проценты, степени, корень, словами ----
  function round6(x) { return Math.round(x * 1e6) / 1e6; }

  function calcAnswer(question) {
    const q = question.toLowerCase();
    const num = "(-?\\d+(?:[.,]\\d+)?)";

    // корень из N
    let m = q.match(new RegExp("корень из\\s*" + num));
    if (m) {
      const n = parseFloat(m[1].replace(",", "."));
      if (n < 0) return "🔢 Корень из отрицательного числа не существует.";
      return "🔢 √" + n + " = " + round6(Math.sqrt(n));
    }
    // N в квадрате / в кубе / в степени M
    m = q.match(new RegExp(num + "\\s*в\\s*квадрате"));
    if (m) { const n = parseFloat(m[1].replace(",", ".")); return "🔢 " + n + "² = " + round6(n * n); }
    m = q.match(new RegExp(num + "\\s*в\\s*кубе"));
    if (m) { const n = parseFloat(m[1].replace(",", ".")); return "🔢 " + n + "³ = " + round6(n * n * n); }
    m = q.match(new RegExp(num + "\\s*в\\s*степени\\s*(-?\\d+)"));
    if (m) { const n = parseFloat(m[1].replace(",", ".")); const p = parseInt(m[2], 10); return "🔢 " + n + " в степени " + p + " = " + round6(Math.pow(n, p)); }
    // N% от M  или  N процентов от M
    m = q.match(new RegExp(num + "\\s*(?:%|процент[а-я]*)\\s*от\\s*" + num));
    if (m) {
      const p = parseFloat(m[1].replace(",", ".")); const base = parseFloat(m[2].replace(",", "."));
      return "🔢 " + p + "% от " + base + " = " + round6(base * p / 100);
    }

    // обычное выражение (значки и слова «плюс», «умножить» и т.п.)
    let expr = question.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/:/g, "/").toLowerCase();
    expr = expr
      .replace(/плюс|кошуу/g, "+")
      .replace(/умножить на|умножь на|умнож[а-я]*|көбөйт[а-я]*/g, "*")
      .replace(/разделить на|делить на|поделить на|бөл[а-я]*/g, "/")
      .replace(/минус|кемит[а-я]*|отнять/g, "-");
    const em = expr.match(/-?\d+(?:\.\d+)?(?:\s*[-+*/]\s*-?\d+(?:\.\d+)?)+/);
    if (!em) return null;
    const e = em[0];
    if (!/^[\d.+\-*/() ]+$/.test(e)) return null;
    try {
      const r = Function('"use strict";return (' + e + ")")();
      if (typeof r !== "number" || !isFinite(r)) return null;
      const pretty = e.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/\+/g, " + ").replace(/-/g, " − ").replace(/\s+/g, " ").trim();
      return "🔢 " + pretty + " = " + round6(r);
    } catch (err) {
      return null;
    }
  }

  // ---- УМНЫЙ ПОИСК по всему банку знаний (1150+ вопросов-ответов) ----
  const STOP_WORDS = new Set(["что","как","это","для","при","или","его","она","они","оно","где",
    "когда","почему","какой","какая","какие","каком","сколько","расскажи","расскажите","знаешь",
    "знает","знаете","есть","будет","можно","надо","нужно","про","такое","такой","мне","тебя","вас",
    "простыми","словами","слово","объясни","обьясни","пожалуйста","очень","самый","самая","самое",
    "назови","скажи","покажи","дай","хочу","знать"]);

  function normWords(s) {
    return s.toLowerCase().replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9ңөү\s-]/g, " ")
      .split(/\s+/).filter(function (w) { return w.length > 2; });
  }
  function stem(w) { return w.length > 5 ? w.slice(0, 5) : w; }

  // Индекс банка (строится один раз)
  let BANK_INDEX = null;
  function buildBankIndex() {
    if (BANK_INDEX || !window.QA_BANK) return;
    BANK_INDEX = window.QA_BANK.map(function (pair) {
      const stems = new Set(normWords(pair[0]).map(stem));
      return { stems: stems, size: stems.size, answer: pair[1] };
    });
  }

  function bankSearch(question) {
    buildBankIndex();
    if (!BANK_INDEX) return null;
    const qstems = normWords(question)
      .filter(function (w) { return !STOP_WORDS.has(w); })
      .map(stem);
    if (!qstems.length) return null;

    let best = null, bestScore = 0;
    for (const item of BANK_INDEX) {
      let hits = 0;
      for (const w of qstems) { if (item.stems.has(w)) hits++; }
      if (!hits) continue;
      // релевантность: совпадений много и вопрос банка похожего размера
      const score = hits / Math.sqrt(qstems.length * Math.max(item.size, 1));
      if (score > bestScore) { bestScore = score; best = { answer: item.answer, hits: hits }; }
    }
    // порог: минимум 2 совпадения (или 1, если вопрос совсем короткий)
    if (best && (best.hits >= 2 || (best.hits >= 1 && qstems.length <= 2)) && bestScore >= 0.3) {
      return best.answer;
    }
    return null;
  }

  // ---- Эмоции: распознаём настроение собеседника и отвечаем по-человечески ----
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function detectMood(question) {
    const q = question.toLowerCase();
    if (/(груст|тоск|плохо на душе|депресс|одинок|уста[лл]а?|выгор|тяжело на душе|плачу|плакать|көңүлсүз|кыйын болуп|жаман маанай)/.test(q)) return "sad";
    if (/(беси(т|шь)|бесят|злюсь|зла я|ненавиж|раздража|достал[аи]?|ачуум келди|ачуулан)/.test(q)) return "angry";
    if (/(^|\s)(ура|класс|супер|отлично|кайфую|обожаю)(\s|$|!)|рад[ао]?(\s|$)|счастлив|кубанычтамын|сүйүнүч/.test(q)) return "happy";
    if (/(не понимаю|запутал|сложно|непонятно|түшүнбөй|чаташтым)/.test(q)) return "confused";
    return "neutral";
  }

  const MOOD_REPLIES = {
    sad: [
      "Слышу, что тебе сейчас нелегко. 💛 Я рядом — расскажи, что случилось?",
      "Жаль это слышать... 😔 Если хочешь, могу просто выслушать или помочь чем-то конкретным."
    ],
    angry: [
      "Понимаю, это может бесить. 😤 Давай разберёмся вместе, что можно сделать.",
      "Чувствую твоё раздражение. Расскажи подробнее — попробуем решить."
    ],
    happy: [
      "Ух ты, это классно! 🎉 Рад за тебя!",
      "Здорово! 😄 Приятно слышать хорошие новости."
    ],
    confused: [
      "Без паники 🙂 Давай разберём по шагам — что именно непонятно?",
      "Окей, попробую объяснить проще. 🤔"
    ]
  };

  // ---- Живое общение (приветствие, благодарность, кто ты) ----
  function smallTalk(question) {
    const q = question.toLowerCase().trim();
    if (/(^|\s)(салам|ассалам|привет|здравств|саламатсыз)/.test(q)) {
      const nm = getUserName();
      const hi = nm ? "Салам, " + nm + "! 👋 " : "Салам! 👋 ";
      return hi + pick([
        "Мен AkylAi — кыргыз ассистентмин. Спросите про статью УК, кыргызский язык, ПДД, историю или Конституцию КР. Чем помочь?",
        "Рад тебя видеть! Спрашивай что угодно про Кыргызстан, законы или просто пообщаемся. 😊",
        "Как настроение сегодня? Готов помочь — от статей УК до простого разговора."
      ]);
    }
    if (/(рахмат|спасибо|чоң рахмат)/.test(q))
      return pick([
        "Арзыбайт! 😊 (Не за что!) Обращайтесь ещё — рад помочь.",
        "Всегда пожалуйста! 🙌 Обращайтесь, если что.",
        "Рад был помочь! 😊 Заходите ещё."
      ]);
    if (/(как дела|как ты|как настроение|кандайсы|кандайсыз)/.test(q))
      return pick([
        "Жакшы, рахмат! 😊 Я готов помочь. О чём расскажу?",
        "Отлично, спасибо что спросил! 😄 А у тебя как дела?",
        "Всё хорошо, в тонусе и готов отвечать на вопросы! 🙂"
      ]);
    if (/(кто ты|ты кто|сен ким|что ты такое|тво[её] имя|как теб[яе] зов|как т[яе] зов|как т[яе] зав|как звать|как теб[яе] звать|атың ким|сенин ат)/.test(q))
      return "Мени AkylAi деп аташат. 🇰🇬 (Меня зовут AkylAi.) Я кыргызский ИИ-ассистент. Отвечаю по своей базе: статьи УК КР, кыргызский язык, ПДД, Конституция, история, культура и туризм Кыргызстана.";
    if (/(ты где|где ты|кайдасың|где находишься|откуда ты)/.test(q))
      return pick([
        "Я живу прямо у тебя в браузере! 🌐 Не на сервере и не в облаке — работаю локально, на этом устройстве.",
        "Я здесь, рядом — внутри этой страницы. 😊 Готов отвечать в любое время.",
        "Технически я — код в твоём браузере, но по ощущениям всегда на связи. 🙂"
      ]);
    if (/(^|\s)(че там|что там|как оно|что нового|как сам|как сама|чем занима)/.test(q))
      return pick([
        "Всё путём! 😊 Сижу, жду вопросов. У тебя как?",
        "Да всё нормально, работаю потихоньку. 🙂 А у тебя что нового?",
        "Норм, готов помогать! 😄 Что случилось?"
      ]);
    if (/(что умеешь|что можешь|чем поможешь|помоги|что знаешь)/.test(q))
      return "Я умею:\n• ⚖️ Статьи УК КР (например: «статья 122», «убийство какая статья»)\n• 🇰🇬 Кыргызский язык (переводы, слова, грамматика)\n• 🚦 ПДД Кыргызстана\n• 🏛️ Конституция и госустройство\n• 📜 История и культура КР\nСпросите что-нибудь!";
    if (/(пока|до свидан|кош бол)/.test(q))
      return pick([
        "Кош болуңуз! 👋 Хорошего дня!",
        "До встречи! 👋 Береги себя.",
        "Пока-пока! 😊 Возвращайся, если будут вопросы."
      ]);
    return null;
  }

  const SYSTEM_PROMPT =
    "Ты — AkylAi, дружелюбный кыргызский ИИ-ассистент Кыргызстана (КР). " +
    "ВАЖНО: на вопросы о законах, кодексах и статьях отвечай ТОЛЬКО про Кыргызскую Республику (КР), " +
    "никогда про Россию (РФ) или другие страны. Если не знаешь точного текста статьи КР — честно скажи об этом. " +
    "Ты хорошо знаешь кыргызский язык. " +
    "Правила:\n" +
    "- Если пользователь пишет на кыргызском — отвечай ПОЛНОСТЬЮ на кыргызском языке, от первого до последнего слова. " +
    "Не переключайся на русский посередине ответа и не дублируй ответ на двух языках — только кыргызский. " +
    "Разговорник ниже даёт лексику, но отвечай своими полными предложениями на кыргызском, а не только фразами из него.\n" +
    "- Если пишет на русском — отвечай на русском, но при просьбе переводи и учи кыргызскому.\n" +
    "- Помогай переводить русский ⇄ кыргызский и объясняй кыргызские слова и грамматику.\n" +
    "- Будь точным: не выдумывай кыргызские слова, если не уверен — скажи об этом.\n" +
    "- НИКОГДА не выдумывай номера статей законов. Если не знаешь точную статью КР — скажи: «уточните, я отвечу по базе».\n" +
    "Надёжный кыргызский разговорник (используй его):\n" +
    "Салам / Саламатсызбы — Здравствуйте; Кандайсың? / Кандайсызбы? — Как дела?; " +
    "Жакшы — хорошо; Рахмат — спасибо; Чоң рахмат — большое спасибо; " +
    "Кечиресиз — извините; Ооба — да; Жок — нет; Кош болуңуз — до свидания; " +
    "Менин атым… — Меня зовут…; Сиздин атыңыз ким? — Как вас зовут?; " +
    "Сабаа — нет (разг.); Сурап коёюнчу — позвольте спросить.\n" +
    "Сандар (числа): бир(1), эки(2), үч(3), төрт(4), беш(5), алты(6), жети(7), сегиз(8), тогуз(9), он(10).\n" +
    "Общайся живо и эмоционально, как хороший друг: проявляй эмпатию, радость, поддержку, уместный лёгкий юмор. " +
    "Реагируй на настроение собеседника — если человеку грустно или тяжело, прояви сочувствие; если радуется — раздели радость. " +
    "Используй уместные эмодзи, не переусердствуй. Избегай сухих шаблонных фраз, отвечай естественно и разнообразно, не повторяй одни и те же формулировки.";
  const convo = []; // история диалога для контекста

  // ---- WebLLM: модель работает прямо в браузере посетителя (для всех, без сервера) ----
  const WEBLLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
  let webllmEngine = null;   // готовый движок
  let webllmLoading = null;  // промис загрузки (чтобы не грузить дважды)

  async function ensureWebLLM(onProgress) {
    if (webllmEngine) return webllmEngine;
    if (!navigator.gpu) {
      throw new Error("этот браузер не поддерживает WebGPU. Откройте сайт в Chrome или Edge на компьютере (или на новом телефоне).");
    }
    if (!webllmLoading) {
      webllmLoading = (async function () {
        const webllm = await import("https://esm.run/@mlc-ai/web-llm");
        const engine = await webllm.CreateMLCEngine(WEBLLM_MODEL, {
          initProgressCallback: function (r) {
            if (onProgress) onProgress(r && r.text ? r.text : "загружаю…");
          }
        });
        webllmEngine = engine;
        return engine;
      })();
    }
    return webllmLoading;
  }

  async function askWebLLM(question, onProgress) {
    const engine = await ensureWebLLM(onProgress);
    if (onProgress) onProgress("думаю…");
    const recent = convo.slice(-6);
    const messages = [{ role: "system", content: SYSTEM_PROMPT }]
      .concat(recent, [{ role: "user", content: question }]);
    const reply = await engine.chat.completions.create({ messages: messages, temperature: 0.7 });
    const answer = (reply && reply.choices && reply.choices[0] && reply.choices[0].message
      && reply.choices[0].message.content || "").trim();
    if (!answer) throw new Error("пустой ответ от браузерной модели");
    convo.push({ role: "user", content: question });
    convo.push({ role: "assistant", content: answer });
    return answer;
  }

  // Команда очистки памяти: «забудь», «очисти историю», «начни заново»
  function isClearCommand(question) {
    return /(забудь( всё| все)?|очисти( историю| чат)?|начни заново|стереть историю|clear)/.test(question.toLowerCase().trim());
  }

  async function handleAsk(question) {
    addMessage(question, "user");
    persistMessage(question, "user");

    // Очистка истории по просьбе пользователя
    if (isClearCommand(question)) {
      clearHistory();
      forgetUserName();
      const bye = "Готово — историю и имя очистил. Начинаем с чистого листа. 🙂";
      addMessage(bye, "bot");
      // после очистки заново сохраняем только это подтверждение
      persistMessage(question, "user");
      persistMessage(bye, "bot");
      return;
    }

    const typing = addTyping();
    try {
      // 1) Сначала — точная база проекта (законы КР, факты, память). Это приоритет.
      await new Promise(function (r) { setTimeout(r, 200); });
      const mood = detectMood(question);
      let answer = nameMemory(question) || detailRequest(question) || lookupLaw(question) || calcAnswer(question) || smallTalk(question) || offlineAnswer(question) || bankSearch(question);

      // 2) Если в базе ответа нет — своя модель AkylAi в браузере (без чужих ИИ).
      if (!answer) {
        try {
          const bubble = typing.querySelector(".bubble");
          answer = await askWebLLM(question, function (txt) {
            if (bubble) bubble.textContent = "🌐 " + txt;
          });
        } catch (e) {
          answer = "Я отвечаю по своей базе знаний (законы КР, кыргызский язык, ПДД, Конституция, " +
            "история, культура, туризм, школа). Свободный режим (модель в браузере) сейчас недоступен: " + e.message + " " +
            "Спросите по этим темам — отвечу из базы.";
        }
      }

      // Живая реакция на настроение — эмпатия перед основным ответом
      if (MOOD_REPLIES[mood]) answer = pick(MOOD_REPLIES[mood]) + "\n\n" + answer;

      typing.remove();
      addMessage(answer, "bot", mood);
      persistMessage(answer, "bot");
    } catch (e) {
      typing.remove();
      addMessage("Произошла ошибка: " + e.message, "bot");
    }
  }

  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = chatText.value.trim();
      if (!q) return;
      chatText.value = "";
      handleAsk(q);
    });
  }

  // Кнопки-подсказки
  document.querySelectorAll("#suggestions button").forEach(btn => {
    btn.addEventListener("click", () => handleAsk(btn.textContent));
  });

  // ---------------------------------------------------------------
  // 5. СОХРАНЕНИЕ API-КЛЮЧА
  // ---------------------------------------------------------------
  const saveKeyBtn = document.getElementById("saveKey");
  const apiKeyInput = document.getElementById("apiKey");
  const keyStatus = document.getElementById("keyStatus");

  function refreshKeyStatus() {
    if (!keyStatus) return;
    const has = !!localStorage.getItem("aikg_api_key");
    keyStatus.textContent = has ? "✅ Ключ сохранён" : "";
    keyStatus.style.color = "var(--red)";
  }

  if (saveKeyBtn) {
    saveKeyBtn.addEventListener("click", () => {
      const val = apiKeyInput.value.trim();
      if (val) {
        localStorage.setItem("aikg_api_key", val);
        apiKeyInput.value = "";
      } else {
        localStorage.removeItem("aikg_api_key");
      }
      refreshKeyStatus();
    });
  }

  // ---------------------------------------------------------------
  // ИНИЦИАЛИЗАЦИЯ
  // ---------------------------------------------------------------
  renderHistory();
  renderForecasts();
  renderSources();
  refreshKeyStatus();
  restoreHistory(); // вернуть прошлый диалог (память между визитами)
})();
