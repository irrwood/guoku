(function attachGuokuEngine(global) {
  const STOP_WORDS = new Set([
    "http",
    "https",
    "www",
    "com",
    "cn",
    "html",
    "product",
    "item",
    "detail",
    "index",
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif"
  ]);

  const CATEGORY_RULES = [
    {
      category: "glassware",
      tests: ["杯", "glass", "mug", "茶具", "水壶", "壶"],
      lines: [
        "冰块掉进去的时候，夏天就有声音了。",
        "热水进去很安静。",
        "很适合下班以后，认真喝一杯水。"
      ]
    },
    {
      category: "keyboard",
      tests: ["键盘", "keyboard", "keycap", "轴"],
      lines: [
        "键盘声会让人误以为自己很专业。",
        "深夜打字的时候特别好听。",
        "有一种“今晚效率很高”的错觉。"
      ]
    },
    {
      category: "audio",
      tests: ["耳机", "音箱", "speaker", "headphone", "earphone", "buds", "蓝牙"],
      lines: [
        "戴上以后，世界终于安静了一点。",
        "声音不大，刚好够一个人假装周末。",
        "很适合不太想回消息的时候。"
      ]
    },
    {
      category: "bag",
      tests: ["包", "tote", "bag", "帆布", "背包", "挎包"],
      lines: [
        "看起来像随便拿的，其实已经用了三年。",
        "它装不下野心，但装得下一本没读完的书。",
        "很适合没有安排的周日下午。"
      ]
    },
    {
      category: "lamp",
      tests: ["灯", "lamp", "light", "照明", "台灯"],
      lines: [
        "打开以后，桌子终于不像审讯室了。",
        "光不急，事情好像也可以慢一点。",
        "很适合把夜晚分给自己一小块。"
      ]
    },
    {
      category: "stationery",
      tests: ["本", "笔", "notebook", "pen", "纸", "文具"],
      lines: [
        "买的时候以为会记录人生，后来主要记录快递单号。",
        "纸面很安静，适合写一些不会立刻完成的计划。",
        "像给拖延找了一个体面的地方。"
      ]
    },
    {
      category: "storage",
      tests: ["收纳", "盒", "架", "organizer", "box", "柜"],
      lines: [
        "不是收纳盒，是给生活留的一点体面。",
        "东西回到该在的位置，人也会松一口气。",
        "不解决凌乱，但让凌乱看起来有边界。"
      ]
    },
    {
      category: "food",
      tests: ["咖啡", "茶", "饼", "面", "饭", "零食", "coffee", "tea", "snack", "food"],
      lines: [
        "有时候想吃的不是味道，是被照顾一下。",
        "很适合晚上十点以后，不太想讲道理的时候。",
        "热的东西总是比较容易原谅今天。"
      ]
    },
    {
      category: "shoe",
      tests: ["鞋", "sneaker", "shoe", "靴"],
      lines: [
        "很适合没有目的地的晚上。",
        "走着走着，就不太想回消息了。",
        "不是为了运动，是为了让路变短一点。"
      ]
    },
    {
      category: "fragrance",
      tests: ["香", "蜡烛", "candle", "perfume", "fragrance", "香薰"],
      lines: [
        "不解决孤独，但让房间看起来像有人认真生活。",
        "气味很轻，像刚刚收拾过心情。",
        "很适合下雨天不出门。"
      ]
    }
  ];

  const DEFAULT_LINES = [
    "看起来不是非买不可。",
    "但会让人想把日子过得稍微认真一点。",
    "像一个很小、但没有敷衍的决定。",
    "不解决什么大问题，只是让生活好看了一点。",
    "很适合放在一个不太匆忙的下午。"
  ];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/[|_]+/g, " ")
      .trim();
  }

  function getFilename(url) {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, "");
    } catch (_error) {
      return "";
    }
  }

  function collectTokens(input) {
    const text = [
      input.title,
      input.text,
      input.alt,
      input.surroundingText,
      input.url,
      getFilename(input.url)
    ]
      .map(normalizeText)
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text
      .split(/[^\p{L}\p{N}\u4e00-\u9fa5]+/u)
      .map((token) => token.trim())
      .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
  }

  function detectCategory(input) {
    const haystack = [
      input.title,
      input.text,
      input.alt,
      input.surroundingText,
      input.url,
      getFilename(input.url)
    ]
      .map(normalizeText)
      .join(" ")
      .toLowerCase();

    return CATEGORY_RULES.find((rule) =>
      rule.tests.some((test) => haystack.includes(test.toLowerCase()))
    );
  }

  function pickProductName(input, tokens) {
    const candidates = [
      input.text,
      input.alt,
      input.title,
      input.surroundingText,
      getFilename(input.url)
    ]
      .map(normalizeText)
      .filter((value) => value && value.length <= 42);

    if (candidates.length) return candidates[0];
    if (tokens.length) return tokens.slice(0, 3).join(" ");
    return input.type === "image" ? "这张图里的东西" : "这个链接里的东西";
  }

  function compactLines(lines, maxLines) {
    const seen = new Set();
    return lines
      .map(normalizeText)
      .filter(Boolean)
      .filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .slice(0, maxLines);
  }

  function evaluate(input = {}) {
    const type = input.type === "image" ? "image" : "link";
    const tokens = collectTokens(input);
    const productName = pickProductName(input, tokens);
    const rule = detectCategory(input);
    const lines = [];

    if (rule) {
      lines.push(...rule.lines);
    } else if (type === "image") {
      lines.push("图片里这个东西，看起来已经有自己的生活了。");
      lines.push("不急着解释用途，反而比较可信。");
    } else {
      lines.push("这个链接不太像广告，更像一次顺手收藏。");
      lines.push("点开之前，会先想象一下拥有它的人。");
    }

    if (productName && productName.length <= 24 && !lines.join(" ").includes(productName)) {
      lines.push(`如果叫它“${productName}”，好像也不算过分。`);
    }

    lines.push(...DEFAULT_LINES);

    return {
      title: productName,
      category: rule ? rule.category : "general",
      summary: compactLines(lines, input.compact ? 2 : 3).join("\n"),
      source: {
        type,
        url: input.url || "",
        text: input.text || input.alt || ""
      }
    };
  }

  global.GuokuEngine = { evaluate };
})(globalThis);
