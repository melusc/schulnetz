import toFilter from '../filter.json' assert {type: 'json'};

import type {TableRow} from './index.d.js';

export const filterTableInPlace = (table: TableRow[]): void => {
	const regExps: RegExp[] = [];

	for (const item of toFilter) {
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
