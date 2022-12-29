import {readFile} from 'node:fs/promises';

// eslint-disable-next-line import/no-extraneous-dependencies
import {type Command} from 'commander';
import {parse} from 'dotenv';
import kleur from 'kleur';
import ow from 'ow';
import {table} from 'table';

import {calculate} from './calculate.js';
import {filter} from './filter.js';
import {getMarks} from './get-marks.js';
import {group} from './group.js';
import {login} from './login.js';

export function register(program: Command) {
	program.command('marks').action(async () => {
		const envFile = await readFile(new URL('../.env', import.meta.url));
		const config = parse(envFile);

		ow(
			config,
			ow.object.partialShape({
				snUsername: ow.string,
				snPassword: ow.string,
			}),
		);

		const {rows, $} = await login({
			username: config.snUsername,
			password: config.snPassword,
		});

		const marks = getMarks(rows, $);
		const filtered = filter(marks);
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
}
