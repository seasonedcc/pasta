import { generateSchema } from "../schema-generator.ts";
import { withTestDatabase } from "./test-database.ts";

Deno.test(
  "generateSchema",
  withTestDatabase(async (sql) => {
    await generateSchema(sql);
  }),
);
