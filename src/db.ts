import Database from "better-sqlite3"
import { z } from 'zod'

export const db: Database.Database = new Database("data/db.sqlite")

export const thumbsListSchema = z.array(z.string())

export const mediaItemRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.number(),
  type: z.string(),
  duration: z.number(),
  rate: z.number(),
  file_size: z.number(),
  playCount: z.number(),
  thumbs: z.string().transform((json) => JSON.parse(json)).pipe(thumbsListSchema),
})

export const mediaItemIdListSchema = z.array(z.object({ id: z.number() }))
