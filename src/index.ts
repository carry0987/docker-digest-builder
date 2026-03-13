import * as fs from 'node:fs';
import * as path from 'node:path';
import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run(): Promise<void> {
    try {
        // --- Read inputs ---
        const image = core.getInput('image', { required: true });
        const platform = core.getInput('platform', { required: true });
        const file = core.getInput('file');
        const context = core.getInput('context');
        const buildArgs = core.getInput('build-args');
        const provenance = core.getInput('provenance');
        const sbom = core.getInput('sbom');
        const cacheScope = core.getInput('cache-scope');
        const artifactNamePrefix = core.getInput('artifact-name-prefix');
        const retentionDays = parseInt(core.getInput('retention-days'), 10);

        // --- Prepare platform slug ---
        const slug = platform.replace(/\//g, '-');
        const scope = cacheScope || slug;

        core.info(`Platform: ${platform} → slug: ${slug}, cache scope: ${scope}`);

        // --- Set up Docker Buildx ---
        core.startGroup('Set up Docker Buildx');
        await exec.exec('docker', ['buildx', 'create', '--use', '--driver', 'docker-container']).catch(() => {
            core.info('Buildx builder already exists or creation failed, attempting to use default');
            return exec.exec('docker', ['buildx', 'use', 'default']);
        });
        core.endGroup();

        // --- Build & push by digest ---
        core.startGroup('Build and push by digest');
        const buildxArgs = [
            'buildx',
            'build',
            '--platform',
            platform,
            '--file',
            file,
            '--output',
            `type=image,name=${image},push-by-digest=true,name-canonical=true,push=true`,
            '--cache-from',
            `type=gha,scope=${scope}`,
            '--cache-to',
            `type=gha,mode=max,scope=${scope}`,
            '--metadata-file',
            '/tmp/build-metadata.json',
            '--provenance',
            provenance,
            '--sbom',
            sbom
        ];

        // Add build args
        if (buildArgs) {
            for (const arg of buildArgs.split('\n')) {
                const trimmed = arg.trim();
                if (trimmed) {
                    buildxArgs.push('--build-arg', trimmed);
                }
            }
        }

        // Add context
        buildxArgs.push(context);

        await exec.exec('docker', buildxArgs);
        core.endGroup();

        // --- Extract digest from metadata ---
        core.startGroup('Extract digest');
        const metadata = JSON.parse(fs.readFileSync('/tmp/build-metadata.json', 'utf8'));
        const digest: string = metadata['containerimage.digest'];
        if (!digest) {
            throw new Error('Failed to extract digest from build metadata');
        }
        core.info(`Digest: ${digest}`);
        core.setOutput('digest', digest);
        core.endGroup();

        // --- Write digest to file ---
        const digestDir = '/tmp/digests';
        fs.mkdirSync(digestDir, { recursive: true });
        const digestFile = path.join(digestDir, digest.replace('sha256:', ''));
        fs.writeFileSync(digestFile, '');

        // --- Upload digest artifact ---
        core.startGroup('Upload digest artifact');
        const artifactName = `${artifactNamePrefix}-${slug}`;
        const artifact = new DefaultArtifactClient();
        await artifact.uploadArtifact(artifactName, [digestFile], digestDir, { retentionDays });
        core.info(`Uploaded artifact: ${artifactName}`);
        core.endGroup();
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unexpected error occurred');
        }
    }
}

run();
