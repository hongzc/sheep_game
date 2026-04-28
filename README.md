# sheep_game

Telegram Mini App Demo —— 一个最小可运行的 H5 页面，用来跑通从 Bot 菜单进入 Mini App 的闭环。

## 文件说明

- `index.html` — 主页面，引入 Telegram WebApp SDK，展示当前用户信息 + 一个交互按钮
- 没有构建步骤，纯静态文件

## 本地预览

直接用浏览器打开 `index.html`（看不到用户信息是正常的，只有在 Telegram 内才有）。

或起一个本地服务器：

```bash
python3 -m http.server 8000
# 然后打开 http://localhost:8000
```

## 部署

推送到 GitHub 后用 Vercel 一键导入即可，无需任何配置。

## 在 Telegram 中打开

部署拿到 HTTPS URL 后，去 BotFather：

```
/mybots → 选 Bot → Bot Settings → Menu Button → Configure → 填 URL
```

然后在 Telegram 里打开 Bot，点底部菜单即可。
