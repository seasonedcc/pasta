import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";
import type { SeedBuilder } from "./statement-builder.ts";

async function connection(uri: string) {
  const sql = postgres(uri);
  console.log("Connected to ", await sql`SELECT version()`);
  return sql;
}

async function transaction(statement: SeedBuilder) {
  const uri = Deno.env.get("DATABASE_URL");
  if (!uri) {
    throw new Error("Please set DATABASE_URL to use database access functions");
  }
  const sql = postgres(uri);
  const r = await sql.unsafe(statement.toSql());
  await sql.end({ timeout: 5 });
  return r;
}

export { connection, transaction };
