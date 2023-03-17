import ow from 'ow';

import {type Mark} from './get-marks.ts';

import {getConfig} from '#utils/config.ts';

export async function filter(marks: readonly Mark[]): Promise<Mark[]> {
	const config = await getConfig('marks');
	ow(
		config,
		ow.object.exactShape({
			filter: ow.array.ofType(ow.string.nonBlank),
		}),
	);
	const filtersSet = new Set(config.filter.map(s => s.toLowerCase()));

	return marks.filter(({name}) => !filtersSet.has(name.toLowerCase()));
}
