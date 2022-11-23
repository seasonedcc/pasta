import * as sql from "../sql-builder.ts";
import { assertEquals } from "./prelude.ts";

Deno.test(
  "Make a select using a schema",
  () => {
    const statement = sql.makeSelect("tables", "information_schema");
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables");
  },
);
// SELECT table_name as name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' order by table_name;
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
