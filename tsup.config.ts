import { defineConfig } from "tsup";
import {
  type PresetOptions,
  generatePackageExports,
  generateTsupOptions,
  parsePresetOptions,
  writePackageJson,
} from "tsup-preset-solid";

const preset_options: PresetOptions = {
  entries: [
    {
      // entries with '.tsx' extension will have `solid` export condition generated
      entry: "src/index.tsx",
      dev_entry: true,
    },
    {
      name: "server",
      entry: "src/server.ts",
      server_entry: true,
    },
    {
      name: "extras",
      entry: "src/extras/index.ts",
    },
  ],
  cjs: true,
};

const CI =
  process.env["CI"] === "true" ||
  process.env["GITHUB_ACTIONS"] === "true" ||
  process.env["CI"] === '"1"' ||
  process.env["GITHUB_ACTIONS"] === '"1"';

export default defineConfig((config) => {
  const watching = !!config.watch;

  const parsed_options = parsePresetOptions(preset_options, watching);

  if (!watching && !CI) {
    const package_fields = generatePackageExports(parsed_options);

    console.log(
      `package.json: \n\n${JSON.stringify(package_fields, null, 2)}\n\n`
    );

    // will update ./package.json with the correct export fields
    writePackageJson(package_fields);
  }

  return generateTsupOptions(parsed_options);
});
