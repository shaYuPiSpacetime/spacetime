FROM node:22-alpine AS build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY docs/静态Demo/ /usr/share/nginx/html/demo/
RUN set -eu; \
    index=/usr/share/nginx/html/demo/index.html; \
    { \
      printf '%s\n' '<!doctype html>'; \
      printf '%s\n' '<html lang="zh-CN">'; \
      printf '%s\n' '<head>'; \
      printf '%s\n' '  <meta charset="utf-8">'; \
      printf '%s\n' '  <meta name="viewport" content="width=device-width, initial-scale=1">'; \
      printf '%s\n' '  <title>静态 Demo 总入口</title>'; \
      printf '%s\n' '  <link rel="stylesheet" href="shared/base.css">'; \
      printf '%s\n' '  <style>'; \
      printf '%s\n' '    body { margin: 0; background: #f6f7fb; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }'; \
      printf '%s\n' '    .demo-index { width: min(1120px, calc(100vw - 48px)); margin: 0 auto; padding: 48px 0 64px; }'; \
      printf '%s\n' '    .demo-hero { margin-bottom: 24px; }'; \
      printf '%s\n' '    .demo-hero h1 { margin: 0 0 10px; font-size: 32px; line-height: 1.2; }'; \
      printf '%s\n' '    .demo-hero p { margin: 0; color: #667085; font-size: 15px; }'; \
      printf '%s\n' '    .demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }'; \
      printf '%s\n' '    .demo-card { display: flex; min-height: 108px; flex-direction: column; justify-content: space-between; padding: 18px; border: 1px solid #e5e7ef; border-radius: 8px; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 10px 30px rgba(15, 23, 42, .06); }'; \
      printf '%s\n' '    .demo-card span { font-size: 16px; font-weight: 700; line-height: 1.45; }'; \
      printf '%s\n' '    .demo-card strong { color: #7c3aed; font-size: 14px; }'; \
      printf '%s\n' '  </style>'; \
      printf '%s\n' '</head>'; \
      printf '%s\n' '<body>'; \
      printf '%s\n' '  <main class="demo-index">'; \
      printf '%s\n' '    <section class="demo-hero">'; \
      printf '%s\n' '      <h1>静态 Demo 总入口</h1>'; \
      printf '%s\n' '      <p>这里自动收录 docs/静态Demo/ 下所有包含 html/index.html 的 Demo。</p>'; \
      printf '%s\n' '    </section>'; \
      printf '%s\n' '    <section class="demo-grid" aria-label="静态 Demo 列表">'; \
    } > "$index"; \
    find /usr/share/nginx/html/demo -mindepth 3 -maxdepth 3 -path '*/html/index.html' | sort | while read -r page; do \
      rel="${page#/usr/share/nginx/html/demo/}"; \
      title="${rel%/html/index.html}"; \
      printf '        <a class="demo-card" href="%s"><span>%s</span><strong>打开 Demo</strong></a>\n' "$rel" "$title" >> "$index"; \
    done; \
    { \
      printf '%s\n' '    </section>'; \
      printf '%s\n' '  </main>'; \
      printf '%s\n' '</body>'; \
      printf '%s\n' '</html>'; \
    } >> "$index"

EXPOSE 80
