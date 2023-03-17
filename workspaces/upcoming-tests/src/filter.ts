import ow from 'ow';

import {type TableRow} from './get-data.ts';

import {getConfig} from '#utils/config.ts';

export async function filter(table: readonly TableRow[]): Promise<TableRow[]> {
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

	return table.filter(row => !regExps.some(regExp => regExp.test(row.text)));
}
