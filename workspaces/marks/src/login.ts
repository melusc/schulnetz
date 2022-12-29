import {load} from 'cheerio';

import {SchulNetz} from '#utils/schulnetz-api.js';

export async function login(): Promise<{
	rows: cheerio.Cheerio[];
	$: cheerio.Root;
}> {
	const schulNetz = new SchulNetz();
	await schulNetz.login();

	const marksPageRequest = await schulNetz.fetch('index.php?pageid=21311', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	const marksPageText = await marksPageRequest.text();
	const $marksPage = load(marksPageText);
	const marksTable = $marksPage('h3:contains("Aktuelle Noten") ~ div > table');

	if (marksTable.length === 0) {
		throw new Error('Could not find table of marks.');
	}

	const logoutUrl = $marksPage('a[href^="index.php?pageid=9999"]').attr('href');

	if (logoutUrl) {
		const fullLogoutUrl = `${logoutUrl}`;

		try {
			await schulNetz.fetch(fullLogoutUrl, {
				method: 'HEAD',
			});
		} catch {}
	}

	const result: cheerio.Cheerio[] = [];

	for (const row of marksTable.find('> * > tr')) {
		const $row = $marksPage(row);

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

	return {rows: result, $: $marksPage};
}
