import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

const sql = neon(process.env.DATABASE_URL ?? 'postgresql://user:password@localhost/db')
export const db = drizzle(sql, { schema })
