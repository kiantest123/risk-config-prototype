# 离线预览构建说明

这个目录用于生成方便分发的静态版本，无需启动服务或联网就能在浏览器里查看「特征 / 待发布清单 / 发布单」三个页面。

## 目录结构
- `source/`：原型代码的隔离副本，只在这里修正了 Vite `base`，补上漏掉的 `</div>`，方便用 `esbuild` 做一次性打包，不会影响原始工程。
- `share/`：打包好的静态资源。压缩并发送整个目录，接收方直接双击 `index.html` 就能离线浏览。
- `tailwind-cdn.js` & `index.css`：预先缓存的样式脚本，避免离线访问请求公网。

## 构建步骤
```bash
cd 风控配置平台产品原型图/offline-preview/source
npx esbuild index.tsx \\
  --bundle --format=iife --platform=browser --target=es2019 \\
  --minify --jsx=automatic --jsx-import-source=react \\
  --define:process.env.NODE_ENV=\"'production'\" \\
  --define:process.env.API_KEY=\"''\" \\
  --define:process.env.GEMINI_API_KEY=\"''\" \\
  --outfile=../share/app.js
```
构建完成后记得把 `source/public/index.css`、`source/public/tailwind-cdn.js` 拷贝到 `../share/`，再更新 `share/index.html` 里的版本号（如有需要）。发给同事时只需共享 `share/` 目录。
