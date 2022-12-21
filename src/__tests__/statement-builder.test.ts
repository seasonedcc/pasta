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
      .columns([["table_name", "table_name"]], "pk_tco");

    assertEquals(
      stmt.toSql(),
      "SELECT pk_tco .table_name AS table_name  FROM information_schema.table_constraints  AS pk_tco",
    );
  },
);

Deno.test(
  "Select with limit and offset",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .limit(10)
      .offset(5);

    assertEquals(
      stmt.toSql(),
      "SELECT  FROM information_schema.table_constraints  AS pk_tco  OFFSET (5)LIMIT (10)",
    );
  },
);

Deno.test(
  "Select with count",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .expressions([sql.count("*")]);

    assertEquals(
      stmt.toSql(),
      "SELECT (count (*) )  FROM information_schema.table_constraints  AS pk_tco",
    );
  },
);

Deno.test(
  "Select from union",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .columns([["table_name", "table_name"]], "pk_tco")
      .unionAll(sql.makeSelect("someOtherTable"));

    assertEquals(
      stmt.toSql(),
      '(SELECT pk_tco .table_name AS table_name  FROM information_schema.table_constraints  AS pk_tco  ) UNION ALL (SELECT  FROM "someOtherTable"   )',
    );
  },
);

Deno.test(
  "Real world select",
  () => {
    const selectReference = sql
      .makeSelect(["referential_constraints", "rco"], "information_schema")
      .columns([["table_name", "table_name"]], "pk_tco")
      .literals([[null, "relations"]])
      .columns([["table_name", "references"]], "fk_tco")
      .columns([["column_name", "foreign_keys"]], "kcu")
      .join(["table_constraints", "fk_tco"], {
        "rco.constraint_name": "fk_tco.constraint_name",
        "rco.constraint_schema": "fk_tco.table_schema",
      }, "information_schema")
      .join(["table_constraints", "pk_tco"], {
        "rco.unique_constraint_name": "pk_tco.constraint_name",
        "rco.unique_constraint_schema": "pk_tco.table_schema",
      }, "information_schema")
      .join(["key_column_usage", "kcu"], {
        "fk_tco.constraint_name": "kcu.constraint_name",
        "fk_tco.table_schema": "kcu.table_schema",
      }, "information_schema");

    const selectRelation = sql
      .makeSelect(["referential_constraints", "rco"], "information_schema")
      .columns([["table_name", "table_name"]], "fk_tco")
      .columns([["table_name", "relations"]], "pk_tco")
      .literals([[null, "references"]])
      .columns([["column_name", "foreign_keys"]], "kcu")
      .join(["table_constraints", "fk_tco"], {
        "rco.constraint_name": "fk_tco.constraint_name",
        "rco.constraint_schema": "fk_tco.table_schema",
      }, "information_schema")
      .join(["table_constraints", "pk_tco"], {
        "rco.unique_constraint_name": "pk_tco.constraint_name",
        "rco.unique_constraint_schema": "pk_tco.table_schema",
      }, "information_schema")
      .join(["key_column_usage", "kcu"], {
        "fk_tco.constraint_name": "kcu.constraint_name",
        "fk_tco.table_schema": "kcu.table_schema",
      }, "information_schema");

    const stmt = selectReference.where({ "pk_tco.table_name": "x" }).unionAll(
      selectRelation.where({ "fk_tco.table_name": "x" }),
    );

    assertEquals(
      stmt.toSql(),
      `(SELECT pk_tco .table_name AS table_name , (null) AS relations , fk_tco .table_name AS "references" , kcu .column_name AS foreign_keys  FROM information_schema.referential_constraints  AS rco INNER JOIN information_schema.table_constraints  AS fk_tco ON ((rco .constraint_name, rco .constraint_schema) = (fk_tco .constraint_name, fk_tco .table_schema)) INNER JOIN information_schema.table_constraints  AS pk_tco ON ((rco .unique_constraint_name, rco .unique_constraint_schema) = (pk_tco .constraint_name, pk_tco .table_schema)) INNER JOIN information_schema.key_column_usage  AS kcu ON ((fk_tco .constraint_name, fk_tco .table_schema) = (kcu .constraint_name, kcu .table_schema))  WHERE ((pk_tco .table_name) = (('x'))) ) UNION ALL (SELECT fk_tco .table_name AS table_name , pk_tco .table_name AS relations , (null) AS "references" , kcu .column_name AS foreign_keys  FROM information_schema.referential_constraints  AS rco INNER JOIN information_schema.table_constraints  AS fk_tco ON ((rco .constraint_name, rco .constraint_schema) = (fk_tco .constraint_name, fk_tco .table_schema)) INNER JOIN information_schema.table_constraints  AS pk_tco ON ((rco .unique_constraint_name, rco .unique_constraint_schema) = (pk_tco .constraint_name, pk_tco .table_schema)) INNER JOIN information_schema.key_column_usage  AS kcu ON ((fk_tco .constraint_name, fk_tco .table_schema) = (kcu .constraint_name, kcu .table_schema))  WHERE ((fk_tco .table_name) = (('x'))) )`,
    );
  },
);
Deno.test(
  "Select with join",
  () => {
    const stmt = sql
      .makeSelect(["table_constraints", "pk_tco"], "information_schema")
      .columns([["table_name", "table_name"]], "pk_tco")
      .join("tables", { "tables.id": "pk_tco.id" }, "information_schema");

    assertEquals(
      stmt.toSql(),
      "SELECT pk_tco .table_name AS table_name  FROM information_schema.table_constraints  AS pk_tco INNER JOIN information_schema.tables  ON ((tables .id) = (pk_tco .id))",
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
