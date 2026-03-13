import { describe, expect, it } from 'vitest';
import {
    buildBuildxArgs,
    extractDigest,
    getArtifactName,
    parseBuildArgs,
    platformToSlug,
    resolveCacheScope
} from '../src/helpers';

describe('platformToSlug', () => {
    it('converts linux/amd64 to linux-amd64', () => {
        expect(platformToSlug('linux/amd64')).toBe('linux-amd64');
    });

    it('converts linux/arm/v7 to linux-arm-v7', () => {
        expect(platformToSlug('linux/arm/v7')).toBe('linux-arm-v7');
    });

    it('returns string as-is when no slashes', () => {
        expect(platformToSlug('linux')).toBe('linux');
    });
});

describe('resolveCacheScope', () => {
    it('returns custom scope when provided', () => {
        expect(resolveCacheScope('my-scope', 'linux-amd64')).toBe('my-scope');
    });

    it('falls back to slug when scope is empty', () => {
        expect(resolveCacheScope('', 'linux-amd64')).toBe('linux-amd64');
    });
});

describe('parseBuildArgs', () => {
    it('returns empty array for empty string', () => {
        expect(parseBuildArgs('')).toEqual([]);
    });

    it('parses a single build arg', () => {
        expect(parseBuildArgs('FOO=bar')).toEqual(['--build-arg', 'FOO=bar']);
    });

    it('parses multiple build args separated by newlines', () => {
        expect(parseBuildArgs('FOO=bar\nBAZ=qux')).toEqual(['--build-arg', 'FOO=bar', '--build-arg', 'BAZ=qux']);
    });

    it('trims whitespace and skips empty lines', () => {
        expect(parseBuildArgs('  FOO=bar  \n\n  BAZ=qux\n  ')).toEqual([
            '--build-arg',
            'FOO=bar',
            '--build-arg',
            'BAZ=qux'
        ]);
    });
});

describe('buildBuildxArgs', () => {
    const baseOpts = {
        platform: 'linux/amd64',
        file: './Dockerfile',
        image: 'ghcr.io/org/app',
        scope: 'linux-amd64',
        provenance: 'true',
        sbom: 'false',
        pull: 'false',
        buildArgs: '',
        context: '.',
        metadataFile: '/tmp/build-metadata.json'
    };

    it('builds correct args without build args', () => {
        const args = buildBuildxArgs(baseOpts);
        expect(args).toEqual([
            'buildx',
            'build',
            '--platform',
            'linux/amd64',
            '--file',
            './Dockerfile',
            '--output',
            'type=image,name=ghcr.io/org/app,push-by-digest=true,name-canonical=true,push=true',
            '--cache-from',
            'type=gha,scope=linux-amd64',
            '--cache-to',
            'type=gha,mode=max,scope=linux-amd64',
            '--metadata-file',
            '/tmp/build-metadata.json',
            '--provenance',
            'true',
            '--sbom',
            'false',
            '.'
        ]);
    });

    it('includes build args when provided', () => {
        const args = buildBuildxArgs({ ...baseOpts, buildArgs: 'VERSION=1.0\nDEBUG=true' });
        expect(args).toContain('--build-arg');
        expect(args).toContain('VERSION=1.0');
        expect(args).toContain('DEBUG=true');
    });

    it('ends with context', () => {
        const args = buildBuildxArgs(baseOpts);
        expect(args[args.length - 1]).toBe('.');
    });

    it('includes --pull when pull is true', () => {
        const args = buildBuildxArgs({ ...baseOpts, pull: 'true' });
        expect(args).toContain('--pull');
    });

    it('does not include --pull when pull is false', () => {
        const args = buildBuildxArgs(baseOpts);
        expect(args).not.toContain('--pull');
    });
});

describe('extractDigest', () => {
    it('extracts digest from valid metadata', () => {
        const metadata = { 'containerimage.digest': 'sha256:abc123' };
        expect(extractDigest(metadata)).toBe('sha256:abc123');
    });

    it('throws when digest is missing', () => {
        expect(() => extractDigest({})).toThrow('Failed to extract digest from build metadata');
    });

    it('throws when digest is empty string', () => {
        expect(() => extractDigest({ 'containerimage.digest': '' })).toThrow(
            'Failed to extract digest from build metadata'
        );
    });

    it('throws when digest is not a string', () => {
        expect(() => extractDigest({ 'containerimage.digest': 123 })).toThrow(
            'Failed to extract digest from build metadata'
        );
    });
});

describe('getArtifactName', () => {
    it('combines prefix and slug', () => {
        expect(getArtifactName('digests', 'linux-amd64')).toBe('digests-linux-amd64');
    });

    it('works with custom prefix', () => {
        expect(getArtifactName('my-prefix', 'linux-arm-v7')).toBe('my-prefix-linux-arm-v7');
    });
});
