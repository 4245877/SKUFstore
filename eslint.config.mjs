import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/out/**', '**/coverage/**', '**/next-env.d.ts', '**/uploads/**', '**/private-files/**', '**/.pnpm-store/**'] },
  { ...js.configs.recommended, files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } },
    // Existing TS checks handle unused declarations; JSX identifiers are not JS
    // references in the core rule. Keep this lint focused on correctness.
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': 'off', 'no-fallthrough': ['error', { allowEmptyCase: true }], 'no-constant-condition': ['error', { checkLoops: false }] } },
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser },
    // TypeScript resolves names, namespaces and type-only declarations.
    rules: { 'no-undef': 'off' } },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
];
