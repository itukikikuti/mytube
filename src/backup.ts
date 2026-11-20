import { copyFileSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { db } from './db.js'

const BACKUP_DIR = "videos/backup"

export async function backupDatabase() {
  try {
    // NAS 上で SQLite を開くとロックが取れないため、一旦ローカルに書いてからコピーする
    const tmp = "data/_backup.tmp"
    await db.backup(tmp)
    mkdirSync(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
    const dest = `${BACKUP_DIR}/db-${stamp}.sqlite`
    copyFileSync(tmp, `${dest}.tmp`)
    renameSync(`${dest}.tmp`, dest) // 転送中の不完全なファイルを有効な世代に見せない
    unlinkSync(tmp)

    // 自分が作った命名のものだけを世代管理の対象にする
    const olds = readdirSync(BACKUP_DIR).filter((f) => /^db-\d{14}\.sqlite$/.test(f)).sort()
    for (const f of olds.slice(0, -24)) unlinkSync(`${BACKUP_DIR}/${f}`)
    console.log(`Backed up database to ${dest}`)
  } catch (error) {
    console.error("Backup failed:", error)
  }
}
