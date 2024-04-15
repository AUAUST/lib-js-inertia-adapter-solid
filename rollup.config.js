import withSolid from "rollup-preset-solid";

export default withSolid([
  {
    input: "src/index.ts",
    output: [
      {
        format: "esm",
        file: "dist/index/index.mjs",
        sourcemap: true,
      },
      {
        format: "cjs",
        file: "dist/index/index.cjs",
        sourcemap: true,
      },
    ],
  },
  {
    input: "src/server.ts",
    output: [
      {
        format: "esm",
        file: "dist/server/index.mjs",
        sourcemap: true,
      },
      {
        format: "cjs",
        file: "dist/server/index.cjs",
        sourcemap: true,
      },
    ],
  },
]);
