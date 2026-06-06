## 起動手順

### 1. docker-compose.yml のボリューム設定を自分の環境に合わせる。

```yaml
volumes:
  - /mnt/nas/Videos:/videos:ro
```

### 2. ルートで起動

```bash
docker compose up --build
```

### 3. アクセス先

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api/videos

## 開発モード（ローカル）

backend:

```bash
cd backend
npm install
npm run dev
```

frontend:

```bash
cd frontend
npm install
npm run dev
```
