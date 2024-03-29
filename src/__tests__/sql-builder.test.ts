import { uuid } from "../database/pg-catalog.ts";
import * as sql from "../sql-builder.ts";
import { assertEquals } from "./prelude.ts";

Deno.test(
  "Sanitize SELECT identifiers",
  () => {
    const statement = sql.selection(
      sql.makeSelect(
        'tables"; DROP SCHEMA public CASCADE; -- ',
        'information_schema";',
      ),
      ['column", (SELECT count(*) FROM pg_class) as "injected'],
      "tables",
    );
    assertEquals(
      statement.toSql(),
      'SELECT tables ."column"", (SELECT count(*) FROM pg_class) as ""injected"  FROM "information_schema"";"."tables""; DROP SCHEMA public CASCADE; -- "',
    );
  },
);

Deno.test(
  "Make a select using a schema",
  () => {
    const statement = sql.makeSelect("tables", "information_schema");
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables");
  },
);

Deno.test(
  "Make a select using a schema and alias",
  () => {
    const statement = sql.makeSelect(["tables", "t"], "information_schema");
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables  AS t");
  },
);

Deno.test(
  "Make a select from union all",
  () => {
    const statementA = sql.makeSelect(["tables", "t1"], "information_schema");
    const statementB = sql.makeSelect(["tables", "t2"], "information_schema");
    const statement = sql.makeUnionAll(statementA, statementB)
    assertEquals(statement.toSql(), "(SELECT  FROM information_schema.tables  AS t1  ) UNION ALL (SELECT  FROM information_schema.tables  AS t2  )");
  },
);

Deno.test(
  "Make a select using an inner join",
  () => {
    const statement = sql.join(
      sql.makeSelect("tables", "information_schema"),
      "columns",
      { "tables.id": "columns.table_id" },
      "information_schema"
    );
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables  INNER JOIN information_schema.columns  ON ((tables .id) = (columns .table_id))");
  },
);


Deno.test(
  "Select columns",
  () => {
    const statement = sql.selection(
      sql.makeSelect("tables", "information_schema"),
      ["table_name"],
      "tables",
    );
    assertEquals(statement.toSql(), "SELECT tables .table_name  FROM information_schema.tables");
  },
);

Deno.test(
  "Select columns using alias",
  () => {
    const statement = sql.selection(
      sql.makeSelect("tables", "information_schema"),
      [["table_name", "name"]],
      "tables",
    );
    assertEquals(statement.toSql(), "SELECT tables .table_name AS name  FROM information_schema.tables");
  },
);

Deno.test(
  "Select literals using alias",
  () => {
    const statement = sql.selectionLiteral(
      sql.makeSelect("tables", "information_schema"),
      [["some name", "name"], [null, "null_value"]],
    );
    assertEquals(statement.toSql(), "SELECT ('some name') AS name , (null) AS null_value  FROM information_schema.tables");
  },
);

Deno.test(
  "Select using order by",
  () => {
    const statement = sql.order(
      sql.makeSelect("tables", "information_schema"),
      [["name", "ASC"]],
      "tables",
    );
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables    ORDER BY name ASC");
  },
);

Deno.test(
  "Select using subquery",
  () => {
    const statement = sql.selectionSubquery(
      sql.makeSelect("tables", "information_schema"),
      [[sql.makeSelect("table_subquery"), "subquery"]],
    );
    assertEquals(statement.toSql(), "SELECT (SELECT  FROM table_subquery   ) AS subquery  FROM information_schema.tables");
  },
);

Deno.test(
  "Select filtering with expr other than equality",
  () => {
    const statement = sql.whereExpression(
      sql.makeSelect("tables", "information_schema"),
      sql.regex(["someTextField", "anotherSearchable"], "searchPattern.*") 
    );
    assertEquals(statement.toSql(), "SELECT  FROM information_schema.tables   WHERE ((((coalesce ((\"someTextField\"::text ), ('')) ) || (' ')) || (coalesce ((\"anotherSearchable\"::text ), ('')) )) ~* ('searchPattern.*'))");
  },
);

Deno.test(
  "Sanitize UPDATE identifiers and values",
  () => {
    const statement = sql.makeUpdate('some_table" SET field = true;--', { "id\",injected": 1, compositeKey: 2 }, { "data\",injected": "test', another = true" });
    assertEquals(
      statement.toSql(),
      "UPDATE \"some_table\"\" SET field = true;--\"   SET \"data\"\",injected\" = ('test'', another = true')  WHERE ((\"id\"\",injected\", \"compositeKey\") = (('1'), ('2')))",
    );
  },
);

Deno.test(
  "UPDATE",
  () => {
    const statement = sql.makeUpdate("some_table", { id: 1, compositeKey: 2 }, { data: "test", nullable: null, optional: undefined });
    assertEquals(
      statement.toSql(),
      "UPDATE some_table   SET data = ('test') , nullable = (null)  WHERE ((id, \"compositeKey\") = (('1'), ('2')))",
    );
  },
);

Deno.test(
  "Sanitize INSERT identifiers and values",
  () => {
    const statement = sql.makeInsert('some_table",injected', { 'id",injected': undefined, data: "test',injected" });
    assertEquals(
      statement.toSql(),
      "INSERT INTO \"some_table\"\",injected\"  (\"id\"\",injected\", data) VALUES (( DEFAULT ), ('test'',injected'))",
    );
  },
);

Deno.test(
  "INSERT",
  () => {
    const statement = sql.makeInsert("some_table", { id: undefined, data: "test", nullable: null });
    assertEquals(
      statement.toSql(),
      "INSERT INTO some_table  (id, data, nullable) VALUES (( DEFAULT ), ('test'), (null))",
    );
  },
);

Deno.test(
  "INSERT json values and function calls in the database",
  () => {
    const statement = sql.makeInsert("some_table", { id: uuid(), tags: ["some value'; inject --"]});
    assertEquals(
      statement.toSql(),
      "INSERT INTO some_table  (id, tags) VALUES ((gen_random_uuid () ), ('[\"some value''; inject --\"]'))",
    );
  },
);

Deno.test(
  "Sanitize DELETE identifiers and values",
  () => {
    const statement = sql.makeDelete("some_table\",injected", { "id\",injected": 1 });
    assertEquals(statement.toSql(), "DELETE FROM \"some_table\"\",injected\"   WHERE ((\"id\"\",injected\") = (('1')))");
  },
);

Deno.test(
  "DELETE",
  () => {
    const statement = sql.makeDelete("some_table", { id: 1 });
    assertEquals(statement.toSql(), "DELETE FROM some_table   WHERE ((id) = (('1')))");
  },
);

Deno.test(
  "UPSERT",
  () => {
    const statement = sql.makeUpsert("some_table", { id: 1, updated: false }, { updated: true });
    assertEquals(statement.toSql(), "INSERT INTO some_table  (id, updated) VALUES (('1'), ('false')) ON CONFLICT  DO UPDATE SET updated = ('true')");
  },
);

