# AgnAIstic (working title)

AI Agnostic Chat

Based upon the early work of https://github.com/PygmalionAI/galatea-ui.

## Roadmap

See the [roadmap here](https://github.com/users/sceuick/projects/1).

## Quick Start for Users

> CAUTION: This project is in an early stage of development. You may experience breaking changes between updates.

If you're only looking to run AgnAI without contributing:

1. Install [Node.js](https://nodejs.org/en/download/)
2. Clone the project: `git clone https://github.com/sceuick/agn-ai` or [download it](https://github.com/sceuick/agn-ai/archive/refs/heads/dev.zip)
3. From inside the project folder in your terminal/console:
   - `npm install`
   - `npm start`

## Design Goals

This project quickly deviated from the upstream project. This project is not intended to be a SaaS nor be centered around the Pygmalion model.  
Ultimately the design goals for this project are my own.

- High quality codebase
- Adapters: Transparently use a variety of AI models and services to converse with
  - Initial adapters: Kobold, Kobold Horde, and Novel
- Implementing adapters should be low friction
- Lightweight to self-host
- Avoiding native dependencies and Docker to be easy for non-technical people to install and run

## For Developers

### Tech Stack

The important parts of the stack are:

- [NeDB](https://npmjs.org/package/@seald-io/nedb) for persistence
- [SolidJS](https://www.solidjs.com/) for interactivity
- [TailwindCSS](https://tailwindcss.com/) for styling
- [pnpm](https://pnpm.io/) for dependency management

### Quick Start

If you have Node and `pnpm` installed and working, you can start the development server with:

```bash
# Install dependencies
> pnpm install --lockfile

# Start the frontend, backend, and python service
> pnpm start
```

### Format and Type Checking

The project uses ESLint for linting, Prettier for enforcing code style and TypeScript to check for type errors. When opening a PR, please make sure you're not introducing any new errors in any of these checks by running:

```bash
# auto-fixes any style problems
$ pnpm run format:fix

# runs the TypeScript compiler so any type errors will be shown
$ pnpm run typecheck
```
