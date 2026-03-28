/**
 * Convert a platform string (e.g. "linux/amd64") to a slug (e.g. "linux-amd64").
 */
export function platformToSlug(platform: string): string {
    return platform.replace(/\//g, '-');
}

/**
 * Resolve the cache scope: use custom scope if provided, otherwise fall back to slug.
 */
export function resolveCacheScope(cacheScope: string, slug: string): string {
    return cacheScope || slug;
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
        '--cache-from',
        `type=gha,scope=${opts.scope}`,
        '--cache-to',
        `type=gha,mode=max,scope=${opts.scope}`,
        '--metadata-file',
        opts.metadataFile,
        '--provenance',
        opts.provenance,
        '--sbom',
        opts.sbom,
        ...(opts.pull === 'true' ? ['--pull'] : []),
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
