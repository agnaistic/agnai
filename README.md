# AgnAIstic

> Agnai: AI Agnostic, Self-hosted or Multi-tenant

AI Agnostic Chat

Based upon the early work of https://github.com/PygmalionAI/galatea-ui.

<div style="display: flex; flex-direction: row; gap: 0.5rem;" >
<img src="https://github.com/sceuick/agn-ai/blob/dev/screenshots/chat.png?raw=true" height="150">
<img src="https://github.com/sceuick/agn-ai/blob/dev/screenshots/persona.png?raw=true" height="150">
<img src="https://github.com/sceuick/agn-ai/blob/dev/screenshots/settings.png?raw=true" height="150">
</div>

## Features

- Multiple AI adapters: Support for Kobold, Novel, Kobold Horde, Chai
- Group Conversations: Multiple users with one character/bot
- Multiple persona schema formats (W++, Square bracket format, Boostyle)
- Multi-tenancy:
  - User authentication
  - Individual user settings: Which adapter to use and their own adapter configuration
  - Individual user generation settings (_In progress_)
- Chat overrides:
  - Change the AI adapter for a specific chat
  - Change the character for a specific chat

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
4. If you wish to run a public facing version:
   - `npm run start:public`

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

# Start the public facing version:
> pnpm start:public
```

### Developer Tooling

- Redux Dev Tools
  - The front-end application state is wired up to the Redux Dev Tools chrome extension.
- NodeJS debugger
  - The `start` script launchs the NodeJS API using the `--inspect` flag
  - Go to the url `chrome://inspect` to use the debugger

### Format and Type Checking

The project uses ESLint for linting, Prettier for enforcing code style and TypeScript to check for type errors. When opening a PR, please make sure you're not introducing any new errors in any of these checks by running:

```bash
# auto-fixes any style problems
$ pnpm run format:fix

# runs the TypeScript compiler so any type errors will be shown
$ pnpm run typecheck
```
