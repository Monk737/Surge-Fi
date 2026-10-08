import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Contract reads cross the ABI boundary as loosely typed data throughout the app.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      // Icons are tiny local SVGs; next/image adds nothing for them.
      "@next/next/no-img-element": "off",
      // The docs page is long-form prose full of apostrophes and quotes.
      "react/no-unescaped-entities": "off",
      // Flags the load-from-localStorage-on-mount effects; worth seeing, not worth failing on.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "artifacts/**", "cache/**", "contracts/**"]),
]);
