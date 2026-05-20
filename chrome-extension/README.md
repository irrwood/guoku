# 果库风商品评价 Chrome 插件

一个 Manifest V3 Chrome 插件，用于对网页里的商品链接和图片生成果库风短评。

## 功能

- 右键链接：`用果库风评价这个链接`
- 右键图片：`用果库风评价这张图片`
- Popup 手动输入商品链接、图片链接或商品线索
- 在当前网页右下角展示评价卡片，并支持复制
- 可选 AI API 模式：填入 API 地址、模型和 API Key 后调用 OpenAI-compatible Chat Completions API

## 工作方式

插件默认不调用外部 AI 服务。它会从以下线索生成评价：

- 链接文字、URL、目标页面 title/meta description、周边文字
- 图片 alt/title、图片 URL、文件名、周边文字
- 内置的果库风分类规则和短句模板

因此它适合开箱即用和开源分发。开启 AI API 后，插件会把这些上下文发送到你配置的 API endpoint；如果是图片 URL，也会把图片 URL 作为 `image_url` 一起发送给支持视觉输入的模型。

如果 AI API 调用失败，插件会自动回退到本地规则引擎，并在结果里标注为本地生成。

## AI API 设置

在 popup 里填写并保存：

- `API 地址`: 默认 `https://api.openai.com/v1/chat/completions`
- `模型`: 默认 `gpt-4o-mini`
- `API Key`: 你的服务密钥
- `启用 AI API`: 打开后右键评价和手动评价都会优先调用 AI

API Key 存在 Chrome `storage.local`。不要在不信任的浏览器环境里保存生产密钥。

## 本地安装

1. 打开 `chrome://extensions`
2. 开启 Developer mode
3. 点击 Load unpacked
4. 选择本目录 `chrome-extension/`

## 文件说明

- `manifest.json`: Chrome MV3 配置
- `background.js`: 右键菜单、链接元数据抓取、消息分发、AI API 调用
- `content-script.js`: 页面上下文提取与评价卡片展示
- `guoku-engine.js`: 离线果库风评价引擎
- `popup.html`, `popup.css`, `popup.js`: 手动输入评价界面
