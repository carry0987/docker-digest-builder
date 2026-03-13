import * as core from '@actions/core';

function run(): void {
    try {
        const name = core.getInput('name', { required: true });

        core.info(`Hello, ${name}!`);

        const result = greet(name);
        core.setOutput('result', result);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unexpected error occurred');
        }
    }
}

export function greet(name: string): string {
    return `Hello, ${name}!`;
}

run();
