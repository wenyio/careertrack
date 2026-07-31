import { defineConfig, globalIgnores } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

const antdDeprecationRules = {
  rules: {
    "no-runtime-deprecations": {
      meta: {
        type: "problem",
        messages: {
          list: "Ant Design List is deprecated; use a semantic container with existing components instead.",
          timelineChildren: "Timeline items.children is deprecated; use items.content instead.",
        },
      },
      create(context) {
        const nameOf = (node) => node?.type === "JSXIdentifier" ? node.name : null;

        return {
          JSXOpeningElement(node) {
            if (nameOf(node.name) === "List") context.report({ node, messageId: "list" });
          },
          Property(node) {
            if (node.key.type !== "Identifier" || node.key.name !== "children") return;

            let parent = node.parent;
            while (parent && parent.type !== "JSXAttribute") parent = parent.parent;
            if (parent?.name.type !== "JSXIdentifier" || parent.name.name !== "items") return;

            const opening = parent.parent;
            if (opening?.type === "JSXOpeningElement" && nameOf(opening.name) === "Timeline") {
              context.report({ node: node.key, messageId: "timelineChildren" });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      local: antdDeprecationRules,
    },
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error",
      "local/no-runtime-deprecations": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "e2e-test.js",
    "playwright.config.js",
    "deploy/**",
    "logs/**",
    "playwright-report/**",
    "screenshots/**",
    "test-results/**",
    "tests/e2e/**",
    "scripts/**",
    "tmp/**",
  ]),
]);

export default eslintConfig;
