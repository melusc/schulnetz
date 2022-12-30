import {writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
import ow from 'ow';
import {tableKeys} from './consts.js';
import {formatDate} from './format-date.js';
import {SchulNetz} from '#utils/schulnetz-api.js';

export type TableRow = {
	start_date: string;
	end_date: string;
	text: string;
	kommentar: string;
	markierung: string;
};

export async function getData() {
	const schulNetz = new SchulNetz();
	await schulNetz.login();

	/*
			This step is necessary (for some reason)
			It requests the scheduler page and that
			permits us to use the scheduler-api
		*/
	await schulNetz.page('21312');

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
