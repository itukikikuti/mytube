import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db = null;

export async function getDbConnection() {
  if (db) {
    return db;
  }
  
  // const dbPath = path.resolve(process.cwd(), 'db.sqlite');

  db = await open({
    filename: '/app/nas/Videos/data/db.sqlite',
    driver: sqlite3.Database,
  });

  return db;
}
