(function attachContentScript() {
  const CARD_ID = "guoku-evaluation-card";

  function textOf(node) {
    return (node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function findImageByUrl(srcUrl) {
    if (!srcUrl) return null;
    return Array.from(document.images).find((img) => img.currentSrc === srcUrl || img.src === srcUrl);
  }

  function findAnchorByUrl(linkUrl) {
    if (!linkUrl) return null;
    return Array.from(document.links).find((anchor) => anchor.href === linkUrl);
  }

  function nearbyText(element) {
    if (!element) return "";
    const parts = [];
    const parent = element.closest("article, li, section, div, figure") || element.parentElement;
    if (parent) parts.push(textOf(parent).slice(0, 180));
    if (element instanceof HTMLImageElement) {
      const figure = element.closest("figure");
      if (figure) parts.push(textOf(figure).slice(0, 120));
    }
    return parts.filter(Boolean).join(" ");
  }

  function collectContext(payload) {
    const type = payload.type === "image" ? "image" : "link";
    const element =
      type === "image" ? findImageByUrl(payload.url) : findAnchorByUrl(payload.url);

    const pageTitle = document.title || "";
    if (type === "image") {
      const img = element instanceof HTMLImageElement ? element : null;
      return {
        type,
        url: payload.url,
        title: pageTitle,
        alt: img ? img.alt || img.title || "" : payload.alt || "",
        text: payload.selectionText || "",
        surroundingText: nearbyText(img)
      };
    }

    const anchor = element instanceof HTMLAnchorElement ? element : null;
    return {
      type,
      url: payload.url,
      title: pageTitle,
      text: anchor ? textOf(anchor) || anchor.title || "" : payload.selectionText || "",
      surroundingText: nearbyText(anchor)
    };
  }

  function showCard(result) {
    const previous = document.getElementById(CARD_ID);
    if (previous) previous.remove();

    const card = document.createElement("div");
    card.id = CARD_ID;
    card.setAttribute("role", "dialog");
    card.innerHTML = `
      <div class="guoku-card-head">
        <strong>果库风评价</strong>
        <button type="button" aria-label="关闭">×</button>
      </div>
      <div class="guoku-card-title"></div>
      <pre></pre>
      <div class="guoku-card-meta"></div>
      <div class="guoku-card-actions">
        <button type="button" data-copy>复制</button>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #${CARD_ID} {
        position: fixed;
        z-index: 2147483647;
        right: 20px;
        bottom: 20px;
        width: min(360px, calc(100vw - 40px));
        box-sizing: border-box;
        padding: 16px;
        border: 1px solid rgba(40, 40, 40, 0.14);
        border-radius: 8px;
        background: #fbfaf7;
        color: #242321;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${CARD_ID} .guoku-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      #${CARD_ID} strong {
        font-size: 14px;
        font-weight: 650;
      }
      #${CARD_ID} button {
        border: 1px solid rgba(40, 40, 40, 0.18);
        border-radius: 6px;
        background: #fff;
        color: #242321;
        min-height: 30px;
        padding: 0 10px;
        cursor: pointer;
      }
      #${CARD_ID} .guoku-card-head button {
        width: 30px;
        padding: 0;
        font-size: 18px;
        line-height: 1;
      }
      #${CARD_ID} .guoku-card-title {
        margin-bottom: 10px;
        color: #706b63;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${CARD_ID} pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 15px;
        line-height: 1.75;
        letter-spacing: 0;
      }
      #${CARD_ID} .guoku-card-meta {
        margin-top: 10px;
        color: #9a9389;
        font-size: 11px;
        line-height: 1.45;
      }
      #${CARD_ID} .guoku-card-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 14px;
      }
    `;

    card.querySelector(".guoku-card-title").textContent = result.title || "网页商品";
    card.querySelector("pre").textContent = result.summary;
    card.querySelector(".guoku-card-meta").textContent =
      result.mode === "ai"
        ? "AI API 生成"
        : result.aiError
          ? `本地生成：AI 调用失败，${result.aiError}`
          : "本地规则生成";
    card.querySelector("[aria-label='关闭']").addEventListener("click", () => {
      card.remove();
      style.remove();
    });
    card.querySelector("[data-copy]").addEventListener("click", async (event) => {
      await navigator.clipboard.writeText(result.summary);
      event.currentTarget.textContent = "已复制";
      setTimeout(() => {
        event.currentTarget.textContent = "复制";
      }, 1200);
    });

    document.documentElement.append(style, card);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GUOKU_PING") {
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "GUOKU_COLLECT_CONTEXT") {
      sendResponse(collectContext(message.payload || {}));
      return true;
    }

    if (message.type === "GUOKU_SHOW_RESULT") {
      showCard(message.result);
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });
})();
