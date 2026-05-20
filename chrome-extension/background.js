importScripts("guoku-engine.js");

const MENU_IDS = {
  link: "guoku-evaluate-link",
  image: "guoku-evaluate-image"
};

const DEFAULT_AI_SETTINGS = {
  aiEnabled: false,
  apiBaseUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4o-mini"
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.link,
      title: "用果库风评价这个链接",
      contexts: ["link"]
    });
    chrome.contextMenus.create({
      id: MENU_IDS.image,
      title: "用果库风评价这张图片",
      contexts: ["image"]
    });
  });
});

function getSettings() {
  return chrome.storage.local.get(DEFAULT_AI_SETTINGS);
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "GUOKU_PING" });
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["guoku-engine.js", "content-script.js"]
    });
  }
}

async function collectFromTab(tab, payload) {
  await ensureContentScript(tab.id);
  const context = await chrome.tabs.sendMessage(tab.id, {
    type: "GUOKU_COLLECT_CONTEXT",
    payload
  });
  if (payload.type === "link") {
    return enrichLinkContext(context || payload);
  }
  return context;
}

async function showInTab(tab, result) {
  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, {
    type: "GUOKU_SHOW_RESULT",
    result
  });
}

function buildPrompt(context) {
  return [
    "你是一个果库风商品评价助手。",
    "请根据输入的商品链接、图片线索、网页标题和周边文字，写 2-4 句中文短评。",
    "风格要求：克制、短句、有生活观察、有画面感、不要营销腔、不要参数堆叠、不要购买焦虑。",
    "可以轻微自嘲，可以留白。不要使用“绝绝子”“神器”“必买”“种草”等词。",
    "",
    `类型：${context.type === "image" ? "图片" : "链接"}`,
    `URL：${context.url || "无"}`,
    `标题：${context.title || "无"}`,
    `文字：${context.text || context.alt || "无"}`,
    `周边文字：${context.surroundingText || "无"}`,
    "",
    "只输出评价正文，不要解释。"
  ].join("\n");
}

function buildAiMessages(context) {
  const prompt = buildPrompt(context);
  if (context.type === "image" && /^https?:\/\//i.test(context.url || "")) {
    return [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: context.url } }
        ]
      }
    ];
  }

  return [{ role: "user", content: prompt }];
}

function normalizeApiText(data) {
  const choice = data && data.choices && data.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (Array.isArray(content)) {
    return content
      .map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return String(content || "").trim();
}

async function evaluateWithAi(context, settings) {
  const response = await fetch(settings.apiBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: buildAiMessages(context),
      temperature: 0.75,
      max_tokens: 220
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI API failed: ${response.status} ${text.slice(0, 160)}`);
  }

  const data = await response.json();
  const summary = normalizeApiText(data);
  if (!summary) throw new Error("AI API returned empty text");

  const fallback = GuokuEngine.evaluate(context);
  return {
    ...fallback,
    summary,
    mode: "ai"
  };
}

async function evaluateContext(context) {
  const settings = await getSettings();
  if (settings.aiEnabled && settings.apiKey && settings.apiBaseUrl && settings.model) {
    try {
      return await evaluateWithAi(context, settings);
    } catch (error) {
      const fallback = GuokuEngine.evaluate(context);
      return {
        ...fallback,
        mode: "local",
        aiError: error.message || "AI API failed"
      };
    }
  }

  return {
    ...GuokuEngine.evaluate(context),
    mode: "local"
  };
}

function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const description =
    (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i) || [])[1] ||
    "";
  const ogTitle =
    (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i) || [])[1] ||
    "";

  const decode = (value) =>
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

  return {
    title: decode(ogTitle || title),
    description: decode(description)
  };
}

async function enrichLinkContext(context) {
  if (!context || !context.url || !/^https?:\/\//i.test(context.url)) return context;

  try {
    const response = await fetch(context.url, {
      method: "GET",
      credentials: "omit",
      redirect: "follow"
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return context;
    const html = await response.text();
    const meta = extractMeta(html);
    return {
      ...context,
      title: meta.title || context.title,
      surroundingText: [context.surroundingText, meta.description].filter(Boolean).join(" ")
    };
  } catch (_error) {
    return context;
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  const isImage = info.menuItemId === MENU_IDS.image;
  const url = isImage ? info.srcUrl : info.linkUrl;
  if (!url) return;

  const fallback = {
    type: isImage ? "image" : "link",
    url,
    selectionText: info.selectionText || "",
    pageUrl: info.pageUrl || ""
  };

  try {
    const context = await collectFromTab(tab, fallback);
    const result = await evaluateContext(context || fallback);
    await showInTab(tab, result);
  } catch (error) {
    const result = await evaluateContext(fallback);
    await showInTab(tab, result);
    console.warn("Guoku evaluation fallback used:", error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GUOKU_GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.type === "GUOKU_SAVE_SETTINGS") {
    chrome.storage.local.set(message.payload || {}).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GUOKU_EVALUATE_MANUAL") {
    evaluateContext(message.payload || {}).then(sendResponse);
    return true;
  }

  return false;
});
