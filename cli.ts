/* eslint-disable import/no-unassigned-import */

import {program} from 'commander';

import './workspaces/marks/src/index.js';
import './workspaces/upcoming-tests/src/index.js';

program.name('schulnetz').allowExcessArguments().enablePositionalOptions();

try {
	await program.parseAsync();
} catch (error: unknown) {
	if (error instanceof Error) {
		console.error(error.message);
	} else {
		throw error;
	}
}
