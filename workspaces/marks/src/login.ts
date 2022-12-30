import {SchulNetz} from '#utils/schulnetz-api.js';

export async function login(): Promise<{
	rows: cheerio.Cheerio[];
	$: cheerio.Root;
}> {
	const schulNetz = new SchulNetz();
	await schulNetz.login();

	const $ = await schulNetz.page('21311');

	const marksTable = $('h3:contains("Aktuelle Noten") ~ div > table');

	if (marksTable.length === 0) {
		throw new Error('Could not find table of marks.');
	}

	await schulNetz.logout();

	const result: cheerio.Cheerio[] = [];

	for (const row of marksTable.find('> * > tr')) {
		const $row = $(row);

		if ($row.css('display') === 'none') {
			continue;
		}

		// Number(undefined) is NaN...
		const mark = Number(
			$row.find('> :nth-child(2)').text().trim().replace(/\*$/, ''),
		);

		// ... and NaN is not finite
		if (Number.isFinite(mark)) {
			result.push($row);
		}
	}

	return {rows: result, $};
}
