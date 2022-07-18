import type { TableName, Tables } from "./mock-schema.ts";
import { associations } from "./mock-schema.ts";

type KeysOf<T extends TableName> = Tables[T]["keys"];
type ColumnsOf<T extends TableName> = Tables[T]["columns"];
type AssociationsOf<T extends TableName> = Tables[T]["associations"];

type Association =
  | { kind: "1xN"; table: TableName; fks: Record<string, string> }
  | {
    kind: "MxN";
    table: TableName;
    associativeTable: TableName;
    fks: Record<string, [string, string]>;
  };
type Associations = Record<TableName, null | Record<string, Association>>;

export type {
  Associations,
  AssociationsOf,
  ColumnsOf,
  KeysOf,
  TableName,
  Tables,
};
export { associations };
