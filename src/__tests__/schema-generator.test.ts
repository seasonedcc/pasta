import { generateSchema } from "../schema-generator.ts";
import { withTestDatabase } from "./test-database.ts";
import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

Deno.test(
  "generateSchema",
  withTestDatabase(async (sql) => {
    const expectedSchema = await Deno.readTextFile(
      "./src/__tests__/test-database-expected-schema.ts",
    );

    const schema = await generateSchema(sql);

    assertEquals(schema, expectedSchema);
  }),
);
