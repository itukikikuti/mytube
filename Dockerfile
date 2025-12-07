# ----------------------------------------------------
# ステージ 1: ビルドステージ
# ----------------------------------------------------
FROM node:20-alpine AS builder

# ユーザーとグループを作成
# Next.js の推奨設定に合わせ、セキュリティのために root 権限で実行しないようにします
#RUN addgroup --system --gid 2000 nodejs
#RUN adduser --system --uid 1000 -G nodejs nextjs

# 作業ディレクトリを設定
WORKDIR /app

# package.json とロックファイルをコピーして依存関係をインストール
# これにより、ソースコードの変更があっても依存関係の再インストールをスキップできます
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# 環境変数などを設定
ENV NEXT_TELEMETRY_DISABLED 1

# next build を実行し、standalone出力を生成
# standalone設定により、最小限のファイルが .next/standalone に生成されます
RUN npm run build

# ----------------------------------------------------
# ステージ 2: 実行ステージ
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# ステージ1で作成したユーザーとグループを再利用
#RUN addgroup --system --gid 2000 nodejs
#RUN adduser --system --uid 1000 -G nodejs nextjs

# next.js の standalone出力をコピー
# --chown を使って、コピーしたファイルの所有者を非rootユーザー (nextjs) に変更
COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static
COPY --from=builder --chown=1000:1000 /app/public ./public

# アプリケーションを非rootユーザーで実行
#USER nextjs

# ポート 3000 を公開
EXPOSE 3000

# Next.js サーバーを起動
# standalone ビルドの場合、エントリーポイントは自動的に生成された server.js です
CMD ["node", "server.js"]
