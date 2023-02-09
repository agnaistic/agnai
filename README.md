# galatea-ui

The official UI for interacting with the Pygmalion models.

Very early work in progress.

## Contributing

If you wish to contribute, this section has some relevant information.

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

By default, it expects the back-end to be running locally at `http://localhost:3000`. If that's not the case, you can override this with the `CORE_API_SERVER` environment variable.

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
