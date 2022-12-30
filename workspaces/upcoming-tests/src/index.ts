import fs from 'node:fs/promises';
import process from 'node:process';

import {load as cheerio} from 'cheerio';
// eslint-disable-next-line import/no-extraneous-dependencies
import {program} from 'commander';
import kleur from 'kleur';
import ow from 'ow';
import {table} from 'table';

import {filter} from './filter.js';
import {formatDate} from './format-date.js';
import type {TableRow} from './index.d.js';

import {SchulNetz} from '#utils/schulnetz-api.js';

program
	.command('upcoming-tests')
	.alias('ut')
	.action(async () => {
		const schulNetz = new SchulNetz();
		await schulNetz.login();

		/*
			This step is necessary (for some reason)
			It requests the scheduler page and that
			permits us to use the scheduler-api
		*/
		await schulNetz.fetch('index.php?pageid=21312');

		const currentDate = new Date();

		const currentDateString = formatDate(currentDate);

		const maxDate = new Date();
		maxDate.setMonth(maxDate.getMonth() + 1);

		/* eslint-disable @typescript-eslint/naming-convention */
		const parameters = new URLSearchParams({
			curr_date: currentDateString,
			min_date: currentDateString,
			max_date: formatDate(maxDate),
			ansicht: 'klassenuebersicht',
		});
		/* eslint-enable @typescript-eslint/naming-convention */

		const schedulerApiRequest = await schulNetz.fetch(
			`scheduler_processor.php?${parameters.toString()}&pageid=1`,
		);
		const schedulerApiBody = await schedulerApiRequest.text();

		await schulNetz.logout();

		ow(
			schedulerApiBody,
			ow.string.not.includes('Kein gültiges Scheduler-Item'),
		);

		await fs.writeFile(new URL('out.xml', import.meta.url), schedulerApiBody);

		const xmlDom = cheerio(schedulerApiBody, {
			xmlMode: true,
		});

		const events = xmlDom('data > event');

		const keys = [
			{key: 'start_date', title: 'From'},
			{key: 'end_date', title: 'To'},
			{key: 'text', title: 'Class'},
			{key: 'kommentar', title: 'Title'},
			// {key: 'klasse', title: 'Class'},
			{key: 'markierung', title: 'Comment'},
		] as const;

		const tableArray: TableRow[] = [];

		for (const item of events) {
			const row: Partial<TableRow> = {};

			for (const {key} of keys) {
				// eslint-disable-next-line unicorn/no-array-callback-reference
				const child = xmlDom(item).find(key);

				const text: string = child?.text() ?? '';

				row[key] = text.trim();
			}

			tableArray.push(row as Required<TableRow>);
		}

		const filtered = await filter(tableArray);

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
				keys.map(({title}) => kleur.bold(kleur.blue(title))),
				...filtered.map(row => {
					const result: string[] = [];

					for (const {key} of keys) {
						result.push(row[key]);
					}

					return result;
				}),
			];

			console.log(
				table(finalTable, {
					columnDefault: {
						width: Math.trunc(process.stdout.columns / keys.length) - 4,
					},
				}),
			);
		} else {
			console.log('No tests in the next month');
		}
	});
