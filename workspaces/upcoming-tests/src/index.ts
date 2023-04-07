import {stdout} from 'node:process';

// eslint-disable-next-line import/no-extraneous-dependencies
import {program} from 'commander';
import kleur from 'kleur';
import {table} from 'table';

import {tableKeys} from './consts.ts';
import {filter} from './filter.ts';
import {getData} from './get-data.ts';
import {getTimeRange, type TimeRange} from './time-range.ts';

const ut = program
	.command('upcoming-tests')
	.alias('ut')
	.option('--no-filter', 'filter tests', true)
	.option('-t, --time <range>', 'Time range', 'month' satisfies TimeRange)
	.action(async () => {
		const {from, to} = getTimeRange(ut.getOptionValue('time') as string);
		const unfiltered = await getData(from, to);

		const shouldFilter = ut.getOptionValue('filter') !== false;
		const filtered = shouldFilter ? await filter(unfiltered) : unfiltered;

		const collator = new Intl.Collator(undefined, {
			sensitivity: 'base',
			numeric: true,
		});

		filtered.sort(
			(
				{start_date: start_dateA, text: textA},
				{start_date: start_dateB, text: textB},
			) =>
				new Date(start_dateA).getTime() - new Date(start_dateB).getTime()
				|| collator.compare(textA, textB),
		);

		if (filtered.length > 0) {
			const finalTable = [
				tableKeys.map(({title}) => kleur.bold(kleur.blue(title))),
				...filtered.map(row => {
					const result: string[] = [];

					for (const {key} of tableKeys) {
						result.push(row[key]);
					}

					return result;
				}),
			];

			console.log(
				table(finalTable, {
					columnDefault: {
						width: Math.trunc(stdout.columns / tableKeys.length) - 4,
					},
				}),
			);
		} else {
			console.log('No tests in the next month');
		}
	});
