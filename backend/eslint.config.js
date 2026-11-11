// Architectural checks only; formatting and unrelated legacy lint cleanup are separate concerns.
export default [
  { ignores: ["node_modules/**", "uploads/**"] },
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
  {
    files: ["src/modules/**/*.js", "src/shared/**/*.js", "src/models/**/*.js", "src/stock/**/*.js", "src/ordering/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["**/routes/**", "**/app.js", "**/server.js"], message: "Feature and infrastructure modules cannot depend on HTTP routes or the application entry point." },
        ],
      }],
    },
  },
  {
    files: ["src/modules/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["**/routes/**", "**/app.js", "**/server.js"], message: "Move reusable behavior into a feature module instead of importing an HTTP route." },
          { regex: "^\\.\\./[^/]+/.*Repository\\.js$", message: "Cross-feature calls must use a service or rules module, not another feature's repository." },
        ],
      }],
    },
  },
];
