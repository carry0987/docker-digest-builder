/**
 * Convert a platform string (e.g. "linux/amd64") to a slug (e.g. "linux-amd64").
 */
export function platformToSlug(platform: string): string {
    return platform.replace(/\//g, '-');
}

const REPOSITORY_NAME_MAX_LENGTH = 255;
const REPOSITORY_ALPHANUMERIC = '[a-z0-9]+';
const REPOSITORY_SEPARATOR = '(?:[._]|__|[-]+)';
const REPOSITORY_PATH_COMPONENT = `${REPOSITORY_ALPHANUMERIC}(?:${REPOSITORY_SEPARATOR}${REPOSITORY_ALPHANUMERIC})*`;
const REPOSITORY_DOMAIN_COMPONENT = '(?:[a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])';
const REPOSITORY_DOMAIN_NAME = `${REPOSITORY_DOMAIN_COMPONENT}(?:\\.${REPOSITORY_DOMAIN_COMPONENT})*`;
const REPOSITORY_IPV6_ADDRESS = '\\[(?:[a-f0-9:]+)\\]';
const REPOSITORY_HOST = `(?:localhost|${REPOSITORY_DOMAIN_NAME}|${REPOSITORY_IPV6_ADDRESS})`;
const REPOSITORY_DOMAIN_AND_PORT = `${REPOSITORY_HOST}(?::[0-9]+)?`;
const REPOSITORY_REMOTE_NAME = `${REPOSITORY_PATH_COMPONENT}(?:/${REPOSITORY_PATH_COMPONENT})*`;
const REPOSITORY_NAME_REGEXP = new RegExp(`^(?:${REPOSITORY_DOMAIN_AND_PORT}/)?${REPOSITORY_REMOTE_NAME}$`);

/**
 * Normalize and validate an image repository name.
 *
 * This action only accepts repository names. Tags and digests are rejected.
 */
export function normalizeImageName(image: string, normalize: boolean): string {
    const trimmedImage = image.trim();

    if (!trimmedImage) {
        throw new Error('Input "image" must not be empty');
    }

    if (trimmedImage.includes('@')) {
        throw new Error('Input "image" must not include a digest; provide a repository name only');
    }

    const lastSlash = trimmedImage.lastIndexOf('/');
    const lastColon = trimmedImage.lastIndexOf(':');
    if (lastColon > lastSlash) {
        throw new Error('Input "image" must not include a tag; provide a repository name only');
    }

    const candidate = normalize ? trimmedImage.toLowerCase() : trimmedImage;

    if (candidate.length > REPOSITORY_NAME_MAX_LENGTH) {
        throw new Error(`Input "image" must not exceed ${REPOSITORY_NAME_MAX_LENGTH} characters`);
    }

    if (candidate !== candidate.toLowerCase()) {
        throw new Error('Input "image" must be lowercase or enable "normalize"');
    }

    if (!REPOSITORY_NAME_REGEXP.test(candidate)) {
        throw new Error('Input "image" must be a valid Docker/OCI repository name');
    }

    return candidate;
}

/**
 * Resolve the cache scope: use custom scope if provided, otherwise fall back to slug.
 */
export function resolveCacheScope(cacheScope: string, slug: string): string {
    return cacheScope || slug;
}

/**
 * Parse cache-from and cache-to arguments.
 */
export function parseCacheArgs(cacheFrom: string, cacheTo: string, cacheScope: string): string[] {
    const result: string[] = [];
    if (cacheFrom && cacheFrom !== 'false') {
        result.push('--cache-from', `${cacheFrom},scope=${cacheScope}`);
    }
    if (cacheTo && cacheTo !== 'false') {
        result.push('--cache-to', `${cacheTo},scope=${cacheScope}`);
    }
    return result;
}

/**
 * Parse multi-line build args into an array of `['--build-arg', 'ARG=val']` pairs.
 */
export function parseBuildArgs(buildArgs: string): string[] {
    if (!buildArgs) return [];
    const result: string[] = [];
    for (const arg of buildArgs.split('\n')) {
        const trimmed = arg.trim();
        if (trimmed) {
            result.push('--build-arg', trimmed);
        }
    }
    return result;
}

export interface BuildxOptions {
    platform: string;
    file: string;
    image: string;
    cacheFrom: string;
    cacheTo: string;
    scope: string;
    provenance: string;
    sbom: string;
    pull: string;
    buildArgs: string;
    context: string;
    metadataFile: string;
}

/**
 * Assemble the full list of arguments for `docker buildx build`.
 */
export function buildBuildxArgs(opts: BuildxOptions): string[] {
    const args = [
        'buildx',
        'build',
        '--platform',
        opts.platform,
        '--file',
        opts.file,
        '--output',
        `type=registry,name=${opts.image},push-by-digest=true,name-canonical=true`,
        '--metadata-file',
        opts.metadataFile,
        '--provenance',
        opts.provenance,
        '--sbom',
        opts.sbom,
        ...(opts.pull === 'true' ? ['--pull'] : []),
        ...parseCacheArgs(opts.cacheFrom, opts.cacheTo, opts.scope),
        ...parseBuildArgs(opts.buildArgs),
        opts.context
    ];
    return args;
}

/**
 * Extract the container image digest from build metadata.
 * Throws if the digest is missing.
 */
export function extractDigest(metadata: Record<string, unknown>): string {
    const digest = metadata['containerimage.digest'];
    if (typeof digest !== 'string' || !digest) {
        throw new Error('Failed to extract digest from build metadata');
    }
    return digest;
}

/**
 * Build the artifact name from prefix and platform slug.
 */
export function getArtifactName(prefix: string, slug: string): string {
    return `${prefix}-${slug}`;
}
