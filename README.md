Prakya-tech105 / NightOwl / README.md
# NightOwl

A minimal, production-ready starter template for building React applications with TypeScript and Vite. NightOwl focuses on developer experience, fast HMR, and sensible defaults (linting, type-checking recommendations), while staying flexible enough for production apps.

- Framework: React
- Bundler: Vite
Install dependencies

bash
npm install
# or
yarn
# or
pnpm install
Run the dev server

bash
npm run dev
# visit http://localhost:5173
Build for production

bash
npm run build
Preview production build locally

bash
npm run preview
Available scripts
These are common scripts you should add or already have in package.json:

JSON
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md,json}\"",
    "test": "vitest"
  }
}
Adjust names and commands to match your preferred tooling (Jest, Playwright, etc.).

Project structure
A suggested layout:

src/
main.tsx — app entry
App.tsx — root component
index.css
components/ — reusable components
pages/ — route-level components
hooks/ — custom hooks
utils/ — helpers
public/ — static assets
vite.config.ts
tsconfig.app.json
tsconfig.node.json
eslint.config.js
package.json
README.md
Keep module boundaries small and prefer colocating component styles and tests where it makes sense.

ESLint & Type-aware linting
This template includes a basic ESLint config. For production apps, enable type-aware lint rules to catch a broader class of issues.

Example (eslint.config.js) snippet to enable type-checked rules:

js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Replace recommended with type-checked for stricter type-aware linting:
      tseslint.configs.recommendedTypeChecked,
      // or for stricter:
      // tseslint.configs.strictTypeChecked,
      // stylistic rules:
      // tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
Note:

Type-aware linting requires parserOptions.project to point to your TS config and may slow down lint runs.
Consider running type-aware linting in CI or as a pre-commit step rather than on every keystroke.
You can also add plugin configs for React-specific checks:

js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
React Compiler (optional)
React Compiler can improve runtime performance but may increase build complexity and toolchain constraints. It is not enabled by default in this template.

To add it, follow React docs: https://react.dev/learn/react-compiler/installation

If you use the React Compiler, test thoroughly and weigh build-time vs runtime improvements for your app.

Vite React plugin options
Two official plugins are commonly used:

@vitejs/plugin-react — uses Oxc for transforms
@vitejs/plugin-react-swc — uses SWC for transforms (faster builds for many cases)
Choose based on your build performance needs and feature support. Both have trade-offs (plugins, custom JSX transforms, supported syntax).

Type checking
Run a full TypeScript check separately:

bash
npm run typecheck
Consider adding type checking in CI (e.g., GitHub Actions) to avoid merge-time regressions.

Testing
This template is test-agnostic. Recommended choices:

Unit: Vitest + Testing Library (fast and works well with Vite)
Integration/E2E: Playwright or Cypress
Example quick setup:

bash
npm install -D vitest @testing-library/react jsdom
Add a test script and basic config as needed.

Deployment
Deploy to any static host that supports SPA routing:

Vercel — recommended for Vite apps
Netlify
GitHub Pages (with proper routing adjustments)
Docker + static server
Make sure to set proper environment variables and configure rewrites to index.html for client-side routing.

Contributing
Contributions are welcome.

Suggested workflow:

Fork the repo
Create a branch: feat/my-feature
Add changes and tests
Run lint, typecheck, and tests locally
Open a PR describing your changes
Include guidelines here for commit message style, PR checklist, and code owners if relevant.

License
Choose a license for your project (e.g., MIT). Replace this line with a proper license file.

Acknowledgements
Vite (https://vitejs.dev)
React (https://reactjs.org)
TypeScript (https://www.typescriptlang.org)
ESLint & community plugins
Maintainers / Contact
Maintained by Prakya-tech105 — open issues or PRs at https://github.com/Prakya-tech105/NightOwl

