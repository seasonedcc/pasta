// Automatically generated by PASTA
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

