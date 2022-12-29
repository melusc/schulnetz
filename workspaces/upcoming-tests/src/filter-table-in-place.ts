import ow from 'ow';

import type {TableRow} from './index.d.js';
import {getConfig} from '#utils/config.js';

export const filterTableInPlace = async (table: TableRow[]): Promise<void> => {
	const config = await getConfig('upcoming-tests');
	ow(
		config,
		ow.object.exactShape({
			filter: ow.array.ofType(ow.string.nonBlank),
		}),
	);
	const regExps: RegExp[] = [];

	for (const item of config.filter) {
		regExps.push(new RegExp(item, 'i'));
	}

	for (const regExp of regExps) {
		for (let i = table.length - 1; i >= 0; --i) {
			for (const cell of Object.values(table[i]!)) {
				if (regExp.test(cell)) {
					table.splice(i, 1);
					break;
				}
			}
		}
	}
};
