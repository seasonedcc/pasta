
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";
import type { SeedBuilder } from "./statement-builder.ts";

function connection(uri: string) {
  const sql = postgres(uri);
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

async function transactionReturning(statement: SeedBuilder) {
  const r = await transaction(statement);
  if (r.length === 0) {
    throw new Error(
      "Statement" + statement.toSql() + " did not return any rows",
    );
  }
  return r;
}

const db = {
  transaction,
  transactionReturning,
};

export { connection, db, transaction, transactionReturning };
