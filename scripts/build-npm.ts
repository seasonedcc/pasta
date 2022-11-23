import { build, emptyDir } from "https://deno.land/x/dnt@0.25.2/mod.ts";
import pkg from '../deno.json' assert { type: 'json' }

await emptyDir("./npm");

await build({
  typeCheck: false,
  declaration: false,
  entryPoints: ["./src/index.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  mappings: {
    "https://deno.land/x/postgresjs@v3.2.4/mod.js": {
      name: "postgres",
      version: "3.2.4",
    },
    "https://deno.land/x/pgsql_ast_parser@11.0.0/mod.ts": {
      name: "pgsql-ast-parser",
      version: "11.0.0",
    },
  },
  package: {
    // package.json properties
    name: "ts-pasta",
    version: pkg.version,
    description: "TypeScript PostgreSQL Abstract Syntax Tree Assembler",
    license: "MIT",
    dependencies: {
      "postgres": "3.2.4",
      "pgsql-ast-parser": "11.0.0"
    }
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
