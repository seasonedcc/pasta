import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import { generateSchema } from "./schema-generator.ts";
import postgres from "https://deno.land/x/postgresjs@v3.2.4/mod.js";

const { "_": connectionUrl } = parse(Deno.args);
const sql = postgres(connectionUrl);

console.log(await generateSchema(sql));

await sql.end();
