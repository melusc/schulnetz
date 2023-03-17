// eslint-disable-next-line import/no-extraneous-dependencies
import {program} from 'commander';
import kleur from 'kleur';
import {table} from 'table';

import {calculate} from './calculate.ts';
import {filter} from './filter.ts';
import {getMarks} from './get-marks.ts';
import {group} from './group.ts';
import {login} from './login.ts';

program.command('marks').action(async () => {
	const {rows, $} = await login();

	const marks = getMarks(rows, $);
	const filtered = await filter(marks);
	const grouped = group(filtered);
	const result = calculate(grouped);

	const coursesTable: string[][] = [];

	for (const {group, courses, mark} of result.marks) {
		coursesTable.push([
			[kleur.blue(group), ...courses.map(s => `  ${s}`)].join('\n'),
			kleur.yellow(mark.toFixed(1)),
		]);
	}

	const summary: string[][] = [];

	for (const {key, pretty} of [
		{key: 'average', pretty: 'Average'},
		{key: 'compensateDouble', pretty: 'Compensate double'},
		{key: 'amountFailing', pretty: 'Amount failing'},
	] as const) {
		const value = result[key];

		summary.push([
			kleur.blue(pretty),
			kleur.yellow(key === 'average' ? value.toFixed(2) : value),
		]);
	}

	console.log(table(coursesTable));
	console.log(table(summary));
});
