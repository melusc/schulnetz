import {writeFile} from 'node:fs/promises';

import {load} from 'cheerio';
import ow from 'ow';

import {SchulNetz} from '#utils/schulnetz-api.ts';

import {tableKeys} from './consts.ts';
import {formatDate} from './format-date.ts';

export type TableRow = {
	start_date: string;
	end_date: string;
	text: string;
	kommentar: string;
	markierung: string;
};

export async function getData(from: Date, to: Date) {
	const schulNetz = new SchulNetz();
	await schulNetz.login();

	/*
			This step is necessary (for some reason)
			It requests the scheduler page and that
			permits us to use the scheduler-api
		*/
	await schulNetz.page('21312');

	const fromDateString = formatDate(from);
	const toDateString = formatDate(to);
	/* eslint-disable @typescript-eslint/naming-convention */
	const parameters = new URLSearchParams({
		curr_date: fromDateString,
		min_date: fromDateString,
		max_date: toDateString,
		ansicht: 'klassenuebersicht',
	});
	/* eslint-enable @typescript-eslint/naming-convention */

	const {text: schedulerApiBody} = await schulNetz.fetch(
		`scheduler_processor.php?${parameters.toString()}&pageid=1`,
	);

	await schulNetz.logout();

	ow(schedulerApiBody, ow.string.not.includes('Kein gültiges Scheduler-Item'));

	await writeFile(new URL('out.xml', import.meta.url), schedulerApiBody);

	const xmlDom = load(schedulerApiBody, {
		xmlMode: true,
	});

	const events = xmlDom('data > event');

	const tableArray: TableRow[] = [];

	for (const item of events) {
		const row: Partial<TableRow> = {};

		for (const {key} of tableKeys) {
			// eslint-disable-next-line unicorn/no-array-callback-reference
			const child = xmlDom(item).find(key);

			const text: string = child?.text() ?? '';

			row[key] = text.trim();
		}

		tableArray.push(row as TableRow);
	}

	return tableArray;
}
