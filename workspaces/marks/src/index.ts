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

	const summary: string[][] = [
		[
			kleur.blue('Average'),
			(result.average < 4 ? kleur.red : kleur.yellow)(
				result.average.toFixed(2),
			),
		],
		[
			kleur.blue('Compensate double'),
			`${kleur.green(result.plus)} - 2 * ${kleur.red(
				result.minus,
			)} = ${(result.compensateDouble < 0 ? kleur.red : kleur.yellow)(
				result.compensateDouble,
			)}`,
		],
		[
			kleur.blue('Amount failing'),
			(result.amountFailing > 3 ? kleur.red : kleur.yellow)(
				result.amountFailing,
			),
		],
	];

	console.log(table(coursesTable));
	console.log(table(summary));
});
