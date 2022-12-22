function header() {
  return `// Automatically generated by PASTA`;
}

function generatePgCatalog() {
  return `${header()}
type UUIDFunctionCall = { returnType: "uuid" };
type TimestampFunctionCall = { returnType: "timestamp" };
type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

function uuid() {
  return {
    "type": "call",
    "function": { "name": "gen_random_uuid" },
    "args": [],
    "returnType": "uuid",
  } as UUIDFunctionCall;
}

function now() {
  return (
    {
      "type": "call",
      "function": { "name": "now" },
      "args": [],
      "returnType": "timestamp",
    } as TimestampFunctionCall
  );
}

const functions = {
  now,
  uuid,
};
export type { JSONValue, TimestampFunctionCall };
export { functions, now, uuid };
`;
}

function generateSchema() {
  return `${header()}
import type { TableName, Tables } from "./custom-schema.ts";
import { associations } from "./custom-schema.ts";

type KeysOf<T extends TableName> = Tables[T]["keys"];
type ColumnsOf<T extends TableName> = Tables[T]["columns"];
type ColumnNamesOf<T extends TableName> = (keyof ColumnsOf<T>)[];
type AssociationsOf<T extends TableName> = Tables[T]["associations"];

type MxNAssociation = {
  kind: "MxN";
  table: TableName;
  associativeTable: TableName;
  fks: Record<string, [string, string]>;
};

type NAssociation = {
  kind: "1xN";
  table: TableName;
  fks: Record<string, string>;
};

type Association =
  | NAssociation
  | MxNAssociation;

type Associations = Record<TableName, Record<string, Association>>;

export type {
  Association,
  Associations,
  AssociationsOf,
  ColumnNamesOf,
  ColumnsOf,
  KeysOf,
  MxNAssociation,
  NAssociation,
  TableName,
  Tables,
};
export { associations };

`;
}

function generateTypedStatementBuilder(pastaLib: string) {
  return `${header()}
import {
  associations,
  AssociationsOf,
  ColumnNamesOf,
  ColumnsOf,
  KeysOf,
  MxNAssociation,
  NAssociation,
  TableName,
} from "./schema.ts";

import { internal as sql } from "${pastaLib}";

type ReturningBuilder<T extends TableName> = sql.SqlBuilder & {
  returning: (options: ColumnNamesOf<T>) => ReturningBuilder<T>;
};
type InsertBuilder<T extends TableName> = ReturningBuilder<T> & {
  associate: (associationMap: AssociationsOf<T>) => InsertBuilder<T>;
};
type SelectBuilder<T extends TableName> = ReturningBuilder<T> & {
  where: (whereMap: ColumnsOf<T>) => SelectBuilder<T>;
  unique: (whereMap: KeysOf<T>) => SelectBuilder<T>;
};

// Public functions

function insert<T extends TableName>(table: T): (valueMap: ColumnsOf<T>) => InsertBuilder<T> {
  return function (valueMap) {
    const builder = sql.makeInsert(table, valueMap) as InsertBuilder<T>;
    const associate: InsertBuilder<T>["associate"] = (associationMap) => {
      const builderWithAssociations = () => {
        const builderWithMxNAssociation = (
          builder: sql.SqlBuilder,
          association: MxNAssociation,
          associatedValues: Record<string, unknown>,
        ) => {
          const { fks, associativeTable } = association;
          const targetAssociationColumns = Object.keys(fks);
          const sourceColumns = targetAssociationColumns.map((
            c,
          ) => (sql.column(...fks[c])));
          const returningFksAssociation = Object.values(fks).filter((
            [fkTable],
          ) => (fkTable == association.table))
            .map(([_, fkColumn]) => (fkColumn));

          return sql.makeInsertWith(
            association.table,
            sql.returning(
              sql.makeInsert(association.table, associatedValues),
              returningFksAssociation,
            ),
            sql.makeInsertWith(
              table,
              builder,
              sql.makeInsertFrom(associativeTable, sourceColumns, targetAssociationColumns),
            ),
          );
        };

        const builderWith1xNAssociation = (
          builder: sql.SqlBuilder,
          association: NAssociation,
          associatedValues: Record<string, unknown>,
        ) => {
          const { fks, table: associedTable } = association;

          const returningFksAssociation = Object.values(fks);

          const sourceFkColumns = Object.keys(fks).map((
            k,
          ) => (sql.column(table, fks[k])));

          const sourceValueColumns = Object.keys(associatedValues).map((
            k,
          ) => (sql.column(String(associatedValues[k]))));

          return sql.makeInsertWith(
            table,
            sql.returning(builder, returningFksAssociation),
            sql.makeInsertFrom(
              associedTable,
              [...sourceFkColumns, ...sourceValueColumns],
              [...Object.keys(fks), ...Object.keys(associatedValues)],
            ),
          );
        };

        return Object.entries(associationMap).reduce((previous, [associated, associatedValues]) => {
          const association = associations[table][associated];
          const pks = association.kind === "1xN"
            ? Object.values(association.fks)
            : Object.values(association.fks).filter((
              [associatedTable, _column],
            ) => associatedTable === table).map(([_table, column]) => column);

          const returningPks = sql.returning(previous, pks);

          return association.kind === "1xN"
            ? builderWith1xNAssociation(returningPks, association, associatedValues)
            : builderWithMxNAssociation(returningPks, association, associatedValues);
        }, builder as sql.SqlBuilder);
      };
      const { statement, toSql } = builderWithAssociations();
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };
    const returning: ReturningBuilder<T>["returning"] = (options) => {
      const { statement, toSql } = sql.returning(builder, options.map(String));
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };

    builder.associate = associate;
    builder.returning = returning;
    return builder;
  };
}

function upsert<T extends TableName>(
  table: T,
): (insertValues: ColumnsOf<T>, updateValues?: ColumnsOf<T>) => ReturningBuilder<T> {
  return (insertValues, updateValues) => {
    const builder = sql.makeUpsert(table, insertValues, updateValues) as ReturningBuilder<T>;
    const returning: ReturningBuilder<T>["returning"] = (options) => {
      const { statement, toSql } = sql.returning(builder, options.map(String));
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };

    builder.returning = returning;
    return builder;
  };
}

function update<T extends TableName>(
  table: T,
): (keyValues: KeysOf<T>, setValues: ColumnsOf<T>) => ReturningBuilder<T> {
  return (keyValues, setValues) => {
    const builder = sql.makeUpdate(table, keyValues, setValues) as ReturningBuilder<T>;
    const returning: ReturningBuilder<T>["returning"] = (options) => {
      const { statement, toSql } = sql.returning(builder, options.map(String));
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };

    builder.returning = returning;
    return builder;
  };
}

function insertWith<T1 extends TableName>(contextTable: T1, context: ReturningBuilder<T1>) {
  return function <T2 extends TableName>(insert: ReturningBuilder<T2>) {
    const builder = sql.makeInsertWith(contextTable, context, insert) as ReturningBuilder<T2>;
    const returning: ReturningBuilder<T2>["returning"] = (options) => {
      const { statement, toSql } = sql.returning(builder, options.map(String));
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };

    builder.returning = returning;
    return builder;
  };
}

function select<T extends TableName>(table: T): () => SelectBuilder<T> {
  return () => {
    const builder = sql.makeSelect(table) as SelectBuilder<T>;
    const returning: ReturningBuilder<T>["returning"] = (options) => {
      const { statement, toSql } = sql.selection(builder, options.map(String));
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };
    const where: SelectBuilder<T>["where"] = (options) => {
      const { statement, toSql } = sql.where(builder, options);
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };
    const unique: SelectBuilder<T>["unique"] = (options) => {
      const { statement, toSql } = sql.where(builder, options);
      builder.statement = statement;
      builder.toSql = toSql;
      return builder;
    };

    builder.returning = returning;
    builder.where = where;
    builder.unique = unique;
    return builder;
  };
}

export { insert, insertWith, select, update, upsert };
export type { InsertBuilder, ReturningBuilder, SelectBuilder };
`;
}

function generateIndex(pastaLib: string) {
  return `${header()}
export { db } from "${pastaLib}";
export { tables } from "./builders.ts";
export { functions } from "./pg-catalog.ts";
`;
}

export { generateIndex, generatePgCatalog, generateSchema, generateTypedStatementBuilder };
