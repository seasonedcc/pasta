import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { connectionUrl } = parse(Deno.args);

console.info(`Connecting to ${connectionUrl} ...`);
const sql = postgres(connectionUrl);

const version = await sql`select version()`;
console.info(`Connected to${version}`);

console.info("Done ✅");
