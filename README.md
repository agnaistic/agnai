# AgnAIstic

> AI Agnostic Chat, Self-hosted or Multi-tenant

AI Agnostic Chat

[Try it out!](https://agn.carlossus.com)

Based upon the early work of https://github.com/PygmalionAI/galatea-ui.

<div style="display: flex; flex-direction: row; gap: 0.5rem;" >
<img src="./screenshots/chat.png" height="150">
<img src="./screenshots/persona.png" height="150">
<img src="./screenshots/settings.png" height="150">
</div>

## Features

- **Group Conversations**: Multiple users with one character/bot
- **Multiple AI services**: Support for Kobold, Novel, AI Horde, Chai, LuminAI, OpenAI
- Multiple persona schema formats (W++, Square bracket format, Boostyle)
- Multi-tenancy:
  - User authentication
  - Individual user settings: Which AI service to use and their own service configuration
  - Individual user generation settings
- Chat specific overrides:
  - Choose the AI service for a specific chat
  - Personalise the character for a specific chat
  - Customise the generation preset/settings for a specific chat
- Image generation (_IN PROGRESS_)

## Roadmap

See the [roadmap here](https://github.com/users/sceuick/projects/1).

## Quick Start for Users

You can visit the hosted version at [Agn.carlossus.com](https://agn.carlossus.com)

> CAUTION: This project is in an early stage of development. You may experience breaking changes between updates.

If you're only looking to run AgnAI without contributing:

### Using Docker

1. Clone the project
2. With MongoDB: `docker compose -p agnai -f self-host.docker-compose.yml up -d`
3. Without MongoDB: `docker run -dt --restart=always -p 3001:3001 agnaistic:latest`
   - `-dt` Run the container detached
   - `--restart=always` Restart at start up or if the server crashes
   - `-p 3001:3001` Expose port 3001. Access the app at `http://localhost:3001`

### Manually

3. Install [Node.js](https://nodejs.org/en/download/)
4. Install [MongoDB](https://www.mongodb.com/docs/manual/installation/) **Optional**
   - The database is optional. Agnaistic will run in `anonymous-only` mode if there is no database available.
5. Download the project: `git clone https://github.com/luminai-companion/agn-ai` or [download it](https://github.com/luminai-companion/agn-ai/archive/refs/heads/dev.zip)
6. From inside the cloned/unpacked folder in your terminal/console:
   - `npm install`
   - Build and run the project in watch mode:
     - Mac/Linux: `npm run start`
     - Windows: `npm run start:win`
   - Build and run the project with Local Tunnel:
     - Mac/Linux: `npm run start:public`
     - Windows: `npm run start:public:win`

## Design Goals

This project quickly deviated from the upstream project. This project is not intended to be a SaaS nor be centered around the Pygmalion model.  
Ultimately the design goals for this project are my own.

- High quality codebase
- AI Services: Transparently use a variety of AI models and services to converse with
  - Initial AI services: Kobold, AI Horde, and Novel
- Supporting additional AI services should be low friction
- Lightweight to self-host
- Avoiding native dependencies and Docker to be easy for non-technical people to install and run

## For Developers

### Recommended Development Tooling

I'd highly recommend using [VSCode](https://code.visualstudio.com/) with the following extensions:

- `Prettier - Code formatter`: For auto-formatting
- `Tailwind CSS Intellisense`: For auto-completion and intellisense with Tailwind CSS classes
- And adding `"editor.formatOnSave": true` to your VSCode `settings.json` to auto-format with Prettier

When using `pnpm start`, the Node.JS server is run using `--inspect`. This means you can use various [Inspector Clients](https://nodejs.org/en/docs/guides/debugging-getting-started/#inspector-clients) for debugging.

### Tech Stack

The important parts of the stack are:

- [MongoDB](https://www.mongodb.com/docs/manual/installation/) for persistence
- [SolidJS](https://www.solidjs.com/) for interactivity
- [TailwindCSS](https://tailwindcss.com/) for styling
- [pnpm](https://pnpm.io/) for dependency management

### Quick Start

If you have Node and `pnpm` installed and working, you can start the development server with:

```bash
# Install dependencies
> pnpm install --lockfile

# Run MongoDB using Docker
> pnpm run up

# Start the frontend, backend, and python service
# Mac/Linux
> pnpm start

# Windows
> pnpm start:win
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
