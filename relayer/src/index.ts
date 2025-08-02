#!/usr/bin/env node

import { program } from './cli';

// Run the CLI
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}

export { TonRelayer } from './relayer';
export * from './types';
export * from './utils';