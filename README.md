# agn-ai (working name)

AI Agnostic Chat

Based upon the early work of https://github.com/PygmalionAI/galatea-ui. Very early work in progress.

## Design Goals

This project quickly deviated from the upstream project. This project is not intended to be a SaaS nor be centered around the Pygmalion model.  
Ultimately the design goals for this project are my own

- High quality codebase
- Adapters: Transparently use a variety of AI models and services to converse with
  - Initial adapters: Kobold, Kobold Horde, and Novel
- Implementing adapters should be low friction
- Lightweight to self-host

### Tech stack

The important parts of the stack are:

- [SolidJS](https://www.solidjs.com/) for interactivity
- [TailwindCSS](https://tailwindcss.com/) for styling
- [pnpm](https://pnpm.io/) for dependency management

### Quick start

If you have Node and `pnpm` installed and working, you can start the development server with:

```bash
# install dependencies
$ pnpm install

# start the dev server
$ pnpm start
```

### Code quality checks

The project uses ESLint for linting, Prettier for enforcing code style and TypeScript to check for type errors. When opening a PR, please make sure you're not introducing any new errors in any of these checks by running:

```bash
# auto-fixes any style problems
$ pnpm run style:fix

# auto-fixes any linting problems, and prints the ones that can't be auto-fixed
$ pnpm run lint:fix

# runs the TypeScript compiler so any type errors will be shown
$ pnpm run typecheck
```
