import assert from 'node:assert/strict';

import type {Cheerio, CheerioAPI, Element} from 'cheerio';
import ow from 'ow';

export type Mark = {
	mark: number;
	name: string;
	group: string;
};

export function getMarks(
	rows: ReadonlyArray<Cheerio<Element>>,
	$: CheerioAPI,
): Mark[] {
	const marks: Mark[] = [];
	const names: string[] = [];

	for (const $row of rows) {
		const get = (n: number) => $row.children().eq(n).contents().toArray();

		const name = $(get(0)[0]).text();
		ow(name, ow.string.nonBlank);
		const group = get(0)
			.filter(element => element.type === 'text')
			.map(element => $(element).text())
			.join('');
		ow(group, ow.string.nonBlank);
		const mark = Number.parseFloat(
			get(1)
				.map(element => $(element).text())
				.join('')
				.replace(/^\s*\*/, ''),
		);

		names.push(name);

		marks.push({
			name,
			mark,
			group,
		});
	}

	assert.equal(names.length, new Set(names).size, 'Got duplicate names');
	return marks;
}
