# Guoku Style Copywriting Skill

一个用于 Codex 的中文文案风格 skill，专注于“果库风”的商品评价、推荐、介绍与生活方式文案。

它不会把商品写成传统电商详情页，而是把参数、功能和卖点转成更克制、更有人味、更有画面感的使用瞬间。

## What It Does

- 将商品参数改写成短句生活方式文案。
- 为商品评价、推荐、介绍提供果库风表达。
- 保持克制、留白、轻微自嘲和都市生活观察。
- 避免促销腔、参数堆叠、购买焦虑和 AI 腔。

## Structure

```text
guoku-style-copywriting/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    └── guoku-research.md
chrome-extension/
├── manifest.json
├── background.js
├── content-script.js
├── guoku-engine.js
├── popup.html
├── popup.css
└── popup.js
```

The reference file contains source-backed style notes and original calibration examples. It is not a scraped copy bank.

## Usage

After installing the folder as a Codex skill, invoke it explicitly:

```text
Use $guoku-style-copywriting to rewrite this product description in a restrained Guoku-style voice.
```

Example request:

```text
用果库风评价这个玻璃杯：高硼硅玻璃，耐热耐冷，适合冷饮热饮。
```

Example output:

```text
热水进去很安静。
冰块掉进去的时候，又像夏天来了。
```

## Chrome Extension

The `chrome-extension/` folder contains a Manifest V3 extension that can evaluate product links and images on web pages.

Features:

- Right-click a product link and choose `用果库风评价这个链接`.
- Right-click an image and choose `用果库风评价这张图片`.
- Use the popup to paste a product URL or image URL manually.
- Runs locally with a rule-based Guoku-style evaluator by default.
- Optionally calls an OpenAI-compatible Chat Completions API after you enable AI API mode and save an API key.

Install locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `chrome-extension/` folder.

The extension evaluates links from anchor text, page metadata, URL words, and surrounding page text. It evaluates images from alt text, image URLs, filenames, and surrounding page text. It does not perform computer vision on image pixels.

AI API mode sends the collected link/image context to the configured API endpoint from the extension service worker. If the API call fails, the extension falls back to the local evaluator and labels the result as local.

## Source And Copyright Notes

This project uses public articles about Guoku to infer style principles and editorial positioning. It does not redistribute a large corpus of third-party copy. Examples in the skill are original calibration examples unless explicitly marked as short source snippets in the reference file.

## License

MIT
