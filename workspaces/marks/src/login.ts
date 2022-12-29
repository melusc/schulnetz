import {load} from 'cheerio';
import {CookieJar} from './cookie-jar.js';

class IncorrectCredentials extends Error {
	constructor() {
		super('Incorrect credentials.');
	}
}

const cookieJar = new CookieJar();
async function proxyFetch(
	url: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	init ??= {};
	const headers = new Headers(init.headers);
	init.headers = headers;
	headers.set('User-Agent', userAgent);
	headers.set('Cookie', cookieJar.toString());

	const request = await fetch(url, init);

	const cookie = request.headers.get('Set-Cookie');
	if (cookie) {
		cookieJar.add(cookie);
	}

	return request;
}

const userAgent
	= 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';

export async function login({
	username,
	password,
}: {
	username: string;
	password: string;
}): Promise<{rows: cheerio.Cheerio[]; $: cheerio.Root}> {
	const loginhashRequest = await proxyFetch(
		'https://www.schul-netz.com/ausserschwyz/loginto.php?pageid=21311&mode=0&lang=',
	);

	if (!loginhashRequest.ok) {
		throw new Error(loginhashRequest.statusText);
	}

	const loginhashText = await loginhashRequest.text();

	const $loginhash = load(loginhashText);
	const loginhash = $loginhash('input[name="loginhash"]').val();

	if (!loginhash) {
		throw new Error('Failed to get loginhash input');
	}

	const loginRequestBody = new URLSearchParams({
		login: username,
		passwort: password,
		loginhash,
	}).toString();

	const marksPageRequest = await proxyFetch(
		'https://www.schul-netz.com/ausserschwyz/index.php?pageid=21311',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: loginRequestBody,
		},
	);

	if (!marksPageRequest.ok) {
		throw new Error(marksPageRequest.statusText);
	}

	const marksPageUrl = new URL(marksPageRequest.url);

	if (marksPageUrl.pathname !== '/ausserschwyz/index.php') {
		throw new IncorrectCredentials();
	}

	const marksPageText = await marksPageRequest.text();
	const $marksPage = load(marksPageText);
	const marksTable = $marksPage('h3:contains("Aktuelle Noten") ~ div > table');

	if (marksTable.length === 0) {
		throw new Error('Could not find table of marks.');
	}

	const logoutUrl = $marksPage('a[href^="index.php?pageid=9999"]').attr('href');

	if (logoutUrl) {
		const fullLogoutUrl = `https://www.schul-netz.com/ausserschwyz/${logoutUrl}`;

		try {
			await proxyFetch(fullLogoutUrl, {
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
