## 起動手順

### 1. docker-compose.yml のボリューム設定を自分の環境に合わせる。

```yaml
volumes:
  - /mnt/nas/Videos:/videos:ro
```

Windows環境では次のような形式でも指定できます。

```yaml
volumes:
  - D:/nas/Videos:/videos:ro
```

### 2. ルートで起動する。

```bash
docker compose up --build
```

### 3. ブラウザで開く。

http://localhost:5173

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
