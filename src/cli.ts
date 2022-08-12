import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import { generateSchema } from "./schema-generator.ts";

const { "_": connectionUrl } = parse(Deno.args);

await generateSchema(connectionUrl);
