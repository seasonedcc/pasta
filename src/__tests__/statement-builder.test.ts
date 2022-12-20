import * as sql from "../statement-builder.ts";
import { assertEquals } from "./prelude.ts";

Deno.test(
  "Select columns with order",
  () => {
    const stmt = sql.makeSelect("tables", "information_schema").columns(["table_name"], "tables")
      .order([["t", "ASC"]]);
    assertEquals(
      stmt.toSql(),
      "SELECT tables .table_name  FROM information_schema.tables    ORDER BY t ASC",
    );
  },
);

Deno.test(
  "Select columns and table with alias",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .columns([["table_name", "table_name"]], "pk_tco")

    assertEquals(
      stmt.toSql(),
      "SELECT pk_tco .table_name AS table_name  FROM information_schema.table_constraints  AS pk_tco",
    );
  },
);

Deno.test(
  "Select from union",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .columns([["table_name", "table_name"]], "pk_tco").unionAll(sql.makeSelect("someOtherTable"))

    assertEquals(
      stmt.toSql(),
      "(SELECT pk_tco .table_name AS table_name  FROM information_schema.table_constraints  AS pk_tco  ) UNION ALL (SELECT  FROM \"someOtherTable\"   )",
    );
  },
);


Deno.test(
  "UPDATE",
  () => {
    const statement = sql.makeUpdate("some_table", { id: 1, compositeKey: 2 }, { data: "test" })
      .returning(["id"]);
    assertEquals(
      statement.toSql(),
      "UPDATE some_table   SET data = ('test')  WHERE ((id, \"compositeKey\") = (('1'), ('2')))  RETURNING id",
    );
  },
);

Deno.test(
  "DELETE",
  () => {
    const statement = sql.makeDelete("some_table", { id: 1 }).returning(["id"]);
    assertEquals(statement.toSql(), "DELETE FROM some_table   WHERE ((id) = (('1'))) RETURNING id");
  },
);

Deno.test(
  "UPSERT",
  () => {
    const statement = sql.makeUpsert("some_table", { id: 1, updated: false }, { updated: true })
      .returning(["id"]);
    assertEquals(
      statement.toSql(),
      "INSERT INTO some_table  (id, updated) VALUES (('1'), ('false')) ON CONFLICT  DO UPDATE SET updated = ('true')   RETURNING id",
    );
  },
);

Deno.test(
  "INSERT",
  () => {
    const statement = sql.makeInsert("some_table", { id: undefined, data: "test" }).returning([
      "id",
    ]);
    assertEquals(
      statement.toSql(),
      "INSERT INTO some_table  (id, data) VALUES (( DEFAULT ), ('test'))  RETURNING id",
    );
  },
);
