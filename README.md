## 起動手順

1. docker-compose.yml のボリューム設定を自分の環境に合わせる。

```yaml
volumes:
  - /mnt/nas/Videos:/videos:ro
```

Windows環境では次のような形式でも指定できます。

```yaml
volumes:
  - D:/nas/Videos:/videos:ro
```

2. ルートで起動する。

```bash
docker compose up --build
```

3. ブラウザで開く。

- フロント: http://localhost:5173
- バックエンドAPI: http://localhost:8081/api/videos（直接確認用）

別サーバーで公開している場合は、そのサーバーIPでアクセスします。

- 例: http://10.0.0.99:5173

この構成ではフロントが相対パス /api を使い、Nginx経由でbackendへ内部転送されます。

## 開発モード（ローカル実行）

### backend

```bash
cd backend
npm install
npm run dev
```

### frontend

```bash
cd frontend
npm install
npm run dev
```

Viteのプロキシで /api は http://localhost:8080 に転送されます（ローカル開発時）。
