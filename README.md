# Docker Digest Builder

A GitHub Action that builds a Docker image for a single platform, pushes it by digest (tagless), and uploads the digest as an artifact. Designed to work with a matrix strategy so each platform builds in parallel, then a separate job merges all digests into a multi-arch manifest.

## Usage

```yaml
- uses: carry0987/docker-digest-builder@v1
  with:
    image: ghcr.io/my-org/my-app
    normalize: true
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
          normalize: true
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

| Name                   | Required | Default           | Description                                                                                                                         |
| ---------------------- | :------: | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `image`                |   Yes    | —                 | Repository name only (e.g. `ghcr.io/org/app`, without tag or digest)                                                                |
| `normalize`            |    No    | `false`           | Lowercase the repository name before validation                                                                                     |
| `platform`             |   Yes    | —                 | Target platform (e.g. `linux/amd64`)                                                                                                |
| `file`                 |    No    | `./Dockerfile`    | Path to Dockerfile                                                                                                                  |
| `context`              |    No    | `.`               | Build context path                                                                                                                  |
| `build-args`           |    No    | `''`              | Build arguments (multi-line, one per line)                                                                                          |
| `provenance`           |    No    | `true`            | Whether to embed provenance attestation                                                                                             |
| `sbom`                 |    No    | `false`           | Whether to embed SBOM attestation                                                                                                   |
| `cache-from`           |    No    | type=gha          | [External cache source](https://docs.docker.com/engine/reference/commandline/buildx_build/#cache-from). Set to `false` to disable.  |
| `cache-to`             |    No    | type=gha,mode=max | [Cache export destination](https://docs.docker.com/engine/reference/commandline/buildx_build/#cache-to). Set to `false` to disable. |
| `cache-scope`          |    No    | Platform slug     | GitHub Actions cache scope (gets automatically added to `cache-from` and `cache-to`)                                                |
| `artifact-name-prefix` |    No    | `digests`         | Artifact name prefix for the digest upload                                                                                          |
| `retention-days`       |    No    | `1`               | Number of days to retain the digest artifact                                                                                        |

## Outputs

| Name     | Description                             |
| -------- | --------------------------------------- |
| `digest` | The `sha256` digest of the pushed image |

## How it works

1. Creates a Docker Buildx builder with the `docker-container` driver
2. Runs `docker buildx build` with `push-by-digest=true` — the image is pushed to the registry without a tag, identified only by its content digest
3. Extracts the `sha256` digest from the build metadata
4. Writes the digest to a file and uploads it as a GitHub Actions artifact (named `{prefix}-{platform-slug}`)

## Image validation

The `image` input must be a valid Docker/OCI repository name. Tags (`:tag`) and digests (`@sha256:...`) are rejected.

When `normalize` is `true`, the action lowercases the repository name before validation. It does not rewrite separators such as `_`, `-`, or `.`, and it does not strip tags or digests.

The uploaded artifact is intended to be consumed by a subsequent job that downloads all platform digests and creates a multi-arch manifest using [`docker buildx imagetools create`](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/).

## Caching

This action uses [GitHub Actions cache](https://docs.docker.com/build/cache/backends/gha/) (`type=gha`) for Docker layer caching by default. Each platform gets its own cache scope (derived from the platform slug, e.g. `linux-amd64`). You can customize this behavior with `cache-from` and `cache-to` or just the scope with the `cache-scope` input.

## License

[MIT](LICENSE)
