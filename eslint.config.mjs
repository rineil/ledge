import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "standard-with-typescript",
    "prettier",
), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.jest,
            ...globals.mocha,
            SELECT: true,
            INSERT: true,
            UPSERT: true,
            UPDATE: true,
            DELETE: true,
            CREATE: true,
            DROP: true,
            CDL: true,
            CQL: true,
            CXL: true,
            cds: true,
        },

        ecmaVersion: "latest",
        sourceType: "commonjs",
    },

    rules: {},
}];