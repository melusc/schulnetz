import {readFile} from 'node:fs/promises';

import {load} from 'cheerio';
import {parse} from 'dotenv';
import ow from 'ow';

import {CookieJar} from './cookie-jar.js';

class IncorrectCredentialsError extends Error {
	constructor() {
		super('Incorrect credentials.');
	}
}

class LoggedOutError extends Error {
	constructor(redirectUrl: URL) {
		super('Logged out, redirected to ' + redirectUrl.href);
	}
}

class StatusError extends Error {
	constructor(status: number, statusText: string) {
		super(`${status}: ${statusText}`);
	}
}

export class SchulNetz {
	userAgent
		= 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';

	baseUrl = 'https://www.schul-netz.com/ausserschwyz/';

	#cookieJar = new CookieJar();
	#id: string | undefined;

	async login(): Promise<void> {
		const envFile = await readFile(new URL('../.env', import.meta.url));
		const config = parse(envFile);

		ow(
			config,
			ow.object.partialShape({
				snUsername: ow.string,
				snPassword: ow.string,
			}),
		);
		const {snUsername: username, snPassword: password} = config;

		const {response: loginHashResponse, text: loginHashText} = await this.fetch(
			'https://www.schul-netz.com/ausserschwyz/loginto.php?pageid=21311&mode=0&lang=',
		);

		if (!loginHashResponse.ok) {
			throw new Error(loginHashResponse.statusText);
		}

		const $loginhash = load(loginHashText);
		const loginhash = $loginhash('input[name="loginhash"]').val();

		if (!loginhash) {
			throw new Error('Failed to get loginhash input');
		}

		const loginRequestBody = new URLSearchParams({
			login: username,
			passwort: password,
			loginhash,
		}).toString();

		const {response: startPageResponse, text: startPageText} = await this.fetch(
			'https://www.schul-netz.com/ausserschwyz/index.php?pageid=1',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: loginRequestBody,
			},
		);

		if (!startPageResponse.ok) {
			throw new Error(startPageResponse.statusText);
		}

		const startPageUrl = new URL(startPageResponse.url);

		if (startPageUrl.pathname !== '/ausserschwyz/index.php') {
			throw new IncorrectCredentialsError();
		}

		const $startPage = load(startPageText);
		const $startPageAnchor = $startPage('a[href*="?pageid=1&"]');
		if ($startPageAnchor.length === 0) {
			throw new Error('Could not find startPageAnchor');
		}

		const id = new URL(
			$startPageAnchor.attr('href')!,
			this.baseUrl,
		).searchParams.get('id');
		if (!id) {
			throw new Error('Could not find id');
		}

		this.#id = id;
	}

	async logout(): Promise<void> {
		await this.page('9999');
	}

	async page(pageId: string | number): Promise<cheerio.Root> {
		const {response, text} = await this.fetch(`index.php?pageid=${pageId}`);

		const responseUrl = new URL(response.url);
		if (
			// 9999 is for logout
			String(pageId) !== '9999'
			&& (!responseUrl.pathname.endsWith('index.php')
				|| responseUrl.searchParams.get('pageid') !== String(pageId))
		) {
			throw new LoggedOutError(responseUrl);
		}

		return load(text);
	}

	async fetch(
		url: string,
		init?: RequestInit,
	): Promise<{
		response: Response;
		text: string;
	}> {
		const urlParsed = new URL(url, this.baseUrl);
		if (this.#id) {
			urlParsed.searchParams.set('id', this.#id);
		}

		init ??= {};
		const headers = new Headers(init.headers);
		init.headers = headers;
		headers.set('User-Agent', this.userAgent);
		headers.set('Cookie', this.#cookieJar.toString());

		const response = await fetch(urlParsed, init);

		if (!response.ok) {
			throw new StatusError(response.status, response.statusText);
		}

		const cookie = response.headers.get('Set-Cookie');
		if (cookie) {
			this.#cookieJar.add(cookie);
		}

		const text = await response.text();

		return {
			response,
			text,
		};
	}
}
