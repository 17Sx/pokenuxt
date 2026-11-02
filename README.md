# PokéNuxt

Nuxt 4 · Tailwind CSS v4 · données [PokéAPI](https://pokeapi.co)

## Setup

```bash
npm install
npm run dev
```

## Scripts

| Script              |                                     |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000 |
| `npm run build`     | Production build                    |
| `npm run typecheck` | Type check                          |
| `npm run lint`      | ESLint (`lint:fix` to autofix)      |
| `npm run format`    | Prettier (`format:check` in CI)     |

CI (`.github/workflows/ci.yml`) runs lint, format check, type check and build on every PR and on pushes to `main` and `dev`.
