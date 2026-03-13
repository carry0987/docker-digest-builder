# TS Action Starter

<!-- TODO: Replace with your action's description -->

A GitHub Action that does something useful.

## Usage

```yaml
- uses: your-org/your-action@v1
  with:
    name: 'World'
```

## Inputs

<!-- TODO: Update inputs to match your action.yml -->

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | Yes | — | TODO: Describe this input |

## Outputs

<!-- TODO: Update outputs to match your action.yml -->

| Output | Description |
|--------|-------------|
| `result` | TODO: Describe this output |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Commands

```bash
pnpm build      # Bundle the action
pnpm test       # Run tests
pnpm lint       # Check code style
pnpm lint:fix   # Auto-fix code style
pnpm typecheck  # Type check
```

### Release

This template uses [Release Please](https://github.com/googleapis/release-please) for automated releases. Use [Conventional Commits](https://www.conventionalcommits.org/) to trigger version bumps:

- `feat: ...` — minor version bump
- `fix: ...` — patch version bump
- `feat!: ...` or `BREAKING CHANGE:` — major version bump

Push to `main` and Release Please will create a release PR automatically.

## License

[MIT](LICENSE)
