import {readFile} from 'node:fs/promises';

import {load} from 'cheerio';
import {parse} from 'dotenv';
import ow from 'ow';

import {CookieJar} from './cookie-jar.js';

class IncorrectCredentials extends Error {
	constructor() {
		super('Incorrect credentials.');
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

		const loginhashRequest = await this.fetch(
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

		const startPageRequest = await this.fetch(
			'https://www.schul-netz.com/ausserschwyz/index.php?pageid=1',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: loginRequestBody,
			},
		);

		if (!startPageRequest.ok) {
			throw new Error(startPageRequest.statusText);
		}

		const startPageUrl = new URL(startPageRequest.url);

		if (startPageUrl.pathname !== '/ausserschwyz/index.php') {
			throw new IncorrectCredentials();
		}

		const startPageText = await startPageRequest.text();
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
		await this.fetch('index.php?pageid=9999', {method: 'head'});
	}

	async fetch(url: string, init?: RequestInit): Promise<Response> {
		const urlParsed = new URL(url, this.baseUrl);
		if (this.#id) {
			urlParsed.searchParams.set('id', this.#id);
		}

		init ??= {};
		const headers = new Headers(init.headers);
		init.headers = headers;
		headers.set('User-Agent', this.userAgent);
		headers.set('Cookie', this.#cookieJar.toString());

		const request = await fetch(urlParsed, init);

		const cookie = request.headers.get('Set-Cookie');
		if (cookie) {
			this.#cookieJar.add(cookie);
		}

		return request;
	}
}
