// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.25.2/mod.ts";

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
  package: {
    // package.json properties
    name: "pasta",
    version: Deno.args[0],
    description: "Your package.",
    license: "MIT",
    "dependencies": {
      "postgres": "^3.2.4",
      "pgsql-ast-parser": "^10.3.1",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
