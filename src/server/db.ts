import Database from "better-sqlite3";

const db: Database.Database = new Database("data/db.sqlite");

export default db;
