const typeInput = document.getElementById("type");
const urlInput = document.getElementById("url");
const textInput = document.getElementById("text");
const button = document.getElementById("evaluate");
const result = document.getElementById("result");
const aiEnabledInput = document.getElementById("aiEnabled");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const modelInput = document.getElementById("model");
const apiKeyInput = document.getElementById("apiKey");
const saveSettingsButton = document.getElementById("saveSettings");

const DEFAULT_AI_SETTINGS = {
  aiEnabled: false,
  apiBaseUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4o-mini"
};

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function renderResult(evaluation) {
  const summary = evaluation.summary;
  result.innerHTML = "";
  const pre = document.createElement("pre");
  pre.textContent = summary;
  const meta = document.createElement("p");
  meta.className = "result-meta";
  meta.textContent =
    evaluation.mode === "ai"
      ? "AI API 生成"
      : evaluation.aiError
        ? `本地生成：AI 调用失败，${evaluation.aiError}`
        : "本地规则生成";
  const row = document.createElement("div");
  row.className = "copy-row";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "复制";
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(summary);
    copy.textContent = "已复制";
    setTimeout(() => {
      copy.textContent = "复制";
    }, 1200);
  });
  row.append(copy);
  result.append(pre, meta, row);
}

function renderMessage(message) {
  result.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = message;
  result.append(p);
}

async function loadSettings() {
  const settings = await sendMessage({ type: "GUOKU_GET_SETTINGS" });
  const merged = { ...DEFAULT_AI_SETTINGS, ...(settings || {}) };
  aiEnabledInput.checked = Boolean(merged.aiEnabled);
  apiBaseUrlInput.value = merged.apiBaseUrl;
  modelInput.value = merged.model;
  apiKeyInput.value = merged.apiKey;
}

async function saveSettings() {
  await sendMessage({
    type: "GUOKU_SAVE_SETTINGS",
    payload: {
      aiEnabled: aiEnabledInput.checked,
      apiBaseUrl: apiBaseUrlInput.value.trim() || DEFAULT_AI_SETTINGS.apiBaseUrl,
      model: modelInput.value.trim() || DEFAULT_AI_SETTINGS.model,
      apiKey: apiKeyInput.value.trim()
    }
  });
  saveSettingsButton.textContent = "已保存";
  setTimeout(() => {
    saveSettingsButton.textContent = "保存 AI 设置";
  }, 1200);
}

button.addEventListener("click", async () => {
  const payload = {
    type: typeInput.value,
    url: urlInput.value.trim(),
    text: textInput.value.trim(),
    title: "手动输入",
    compact: false
  };

  renderMessage("正在生成……");
  const evaluation = await sendMessage({
    type: "GUOKU_EVALUATE_MANUAL",
    payload
  });
  renderResult(evaluation);
});

saveSettingsButton.addEventListener("click", saveSettings);

loadSettings();
