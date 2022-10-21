# PASTA

PostgreSQL Abstract Syntax Tree Assembler (PASTA) will help you to build type-safe SQL statements using metadata extracted from your PostgreSQL database. Get rid of clumsy SQL strings in your application code without losing PostgreSQL's power and without having to wait for tests to find SQL syntax errors.

## Table of contents
- [PASTA](#pasta)
  - [Quickstart](#quickstart)
  - [Executing your first statement](#executing-your-first-statement)
  - [Inserting data with its associations](#inserting-data-with-its-associations)
  - [Returning data from a transaction](#returning-data-from-a-transaction)
  - [Quering existing data](#quering-existing-data)
  - [Finding unique records from a single table](#finding-unique-records-from-a-single-table)
  - [Technical goals](#technical-goals)
  - [What this library won't help you with](#what-this-library-wont-help-you-with)

## Quickstart

TBD

## Executing your first statement

All examples will use the schema defined as part of the tests for the library which model a simple user management system.
Let's start with a simple mutation, inserting a new user in our database:

```ts
import { tables, db, functions } from 'src/database';
const { user } = tables;
const { now } = functions;

await db.transaction(
  user.insert({ email: "user2@someaccout.tld" })
)
```

The example above assumes you have an environment variable called `DATABASE_URL` which constains a connection string to your PostgreSQL instance. It also assumes you are using the default generated schema path on `src/database`.

## Inserting data with its associations

Now let's see how we would insert a user with their corresponding account.

```ts
await db.transaction(
  user.insert(
    { email: "user2@someaccout.tld", created_at: now() }
  ).associate(
    { account: { name: "some product name" } }
  )
)
```

## Returning data from a transaction

In our database schema, PostgreSQL generates uuids as a user identifier.
Let's say you want to use this identifier, this is how you obtain it in the same transaction as the user is created.

```ts
const [{ id }] = await db.transaction(
  user.insert(
    { email: "user2@someaccout.tld", created_at: now() }
  ).associate(
    { account: { name: "some product name" } }
  ).returning(["id"])
)
```

## Quering existing data

Now, let's build a `SELECT` statement that will read existing data.

```ts
const [{ id, email }] = await db.transaction(
  user.select.returning(["id", "email"])
)
```

## Filtering existing data

In case you want to filter your `SELECT` just use the `where` function.

```ts
const [{ id, email }] = await db.transaction(
  user.where({ email: "user2@someaccout.tld" }).returning(["id", "email"])
)
```

## Finding unique records from a single table

In case you want to return a single record you have 2 options. You could use `whereUnique`

```ts
const [{ id, email }] = await db.transaction(
  user.unique({ email: "user2@someaccout.tld" }).returning(["id", "email"])
)
```

In the example above the function `transaction` knows that the statement from `whereUnique` can return only one row, so the return type is potentially null. To avoid having to deal with nullable data you can use the `transactionReturning` function.

```ts
const [{ id, email }] = await db.transactionReturning(
  user.unique({ email: "user2@someaccout.tld" }),
  ["id", "email"]
)
```

On the example above the return data definition is mandatory and the function will throw an exception when nothing is returned by the transation.

## Technical goals

* Provide an elegant way to interact with PostgreSQL being as type-safe as possible.
* Have a composable interface where you can combine statements out of other statements and define transactions, being able to do that in compile time or run-time defering database execution.
* Reduce the number of database round-trips.
* Provide a minimal transaction execution set of functions that will help with resource management while being optional so you can use this library with other database abstraction layers.

## What this library won't help you with

* Abstract over different database systems.
* Provide any sort of [Active Record](https://en.wikipedia.org/wiki/Active_record_pattern) implementation. Records are just data.