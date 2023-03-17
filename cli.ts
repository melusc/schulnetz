/* eslint-disable import/no-unassigned-import */

import {program} from 'commander';

import './workspaces/marks/src/index.ts';
import './workspaces/upcoming-tests/src/index.ts';

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
