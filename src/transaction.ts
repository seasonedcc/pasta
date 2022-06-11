import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

async function connection(uri: string) {
  const sql = postgres(uri);
  console.log("Connected to ", await sql`SELECT version()`);
  return sql;
}

export { connection };
