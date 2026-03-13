# Docker Digest Builder

A GitHub Action that builds a Docker image for a single platform, pushes it by digest (tagless), and uploads the digest as an artifact. Designed to work with a matrix strategy so each platform builds in parallel, then a separate job merges all digests into a multi-arch manifest.

## Usage

```yaml
- uses: carry0987/docker-digest-builder@v1
  with:
    image: ghcr.io/my-org/my-app
    platform: linux/amd64
```

### Full example with matrix strategy

```yaml
jobs:
  build:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: carry0987/docker-digest-builder@v1
        with:
          image: ghcr.io/${{ github.repository }}
          platform: ${{ matrix.platform }}

  manifest:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: carry0987/docker-multi-arch-manifest@v1
        with:
          image: ghcr.io/${{ github.repository }}
          tags: |
            latest
            1.0.0
```

## Inputs

| Name | Required | Default | Description |
|------|:--------:|---------|-------------|
| `image` | Yes | — | Full image name (e.g. `ghcr.io/org/app`) |
| `platform` | Yes | — | Target platform (e.g. `linux/amd64`) |
| `file` | No | `./Dockerfile` | Path to Dockerfile |
| `context` | No | `.` | Build context path |
| `build-args` | No | `''` | Build arguments (multi-line, one per line) |
| `provenance` | No | `true` | Whether to embed provenance attestation |
| `sbom` | No | `false` | Whether to embed SBOM attestation |
| `cache-scope` | No | Platform slug | GitHub Actions cache scope |
| `artifact-name-prefix` | No | `digests` | Artifact name prefix for the digest upload |
| `retention-days` | No | `1` | Number of days to retain the digest artifact |

## Outputs

| Name | Description |
|------|-------------|
| `digest` | The `sha256` digest of the pushed image |

## How it works

1. Creates a Docker Buildx builder with the `docker-container` driver
2. Runs `docker buildx build` with `push-by-digest=true` — the image is pushed to the registry without a tag, identified only by its content digest
3. Extracts the `sha256` digest from the build metadata
4. Writes the digest to a file and uploads it as a GitHub Actions artifact (named `{prefix}-{platform-slug}`)

The uploaded artifact is intended to be consumed by a subsequent job that downloads all platform digests and creates a multi-arch manifest using [`docker buildx imagetools create`](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/).

## Caching

This action uses [GitHub Actions cache](https://docs.docker.com/build/cache/backends/gha/) (`type=gha`) for Docker layer caching. Each platform gets its own cache scope (derived from the platform slug, e.g. `linux-amd64`). You can override this with the `cache-scope` input.

## License

[MIT](LICENSE)
