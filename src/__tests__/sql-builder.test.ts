import * as sql from "../sql-builder.ts";
import { assertEquals } from "./prelude.ts";

Deno.test(
  "Make a select using a schema",
  () => {
    const statement = sql.makeSelect("tables", "information_schema");
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables");
  },
);

Deno.test(
  "Select columns",
  () => {
    const statement = sql.selection(
      sql.makeSelect("tables", "information_schema"),
      ["table_name"],
    );
    assertEquals(statement.toSql(), "SELECT table_name  FROM information_schema.tables");
  },
);

Deno.test(
  "DELETE",
  () => {
    const statement = sql.makeDelete("some_table", { id: 1 });
    assertEquals(statement.toSql(), "DELETE FROM some_table   WHERE ((id) = (('1')))");
  },
);
