import {readFile} from 'node:fs/promises';

import {load} from 'cheerio';
import {parse} from 'dotenv';
import ow from 'ow';

import {CookieJar} from './cookie-jar.ts';

class IncorrectCredentialsError extends Error {
	constructor() {
		super('Incorrect credentials.');
	}
}

class LoggedOutError extends Error {
	constructor(info: string) {
		super(`Logged out: ${info}`);
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

	baseUrl: undefined | string;

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
				snSchool: ow.string.matches(/^[\w-]+$/i),
			}),
		);
		const {snUsername: username, snPassword: password, snSchool} = config;

		this.baseUrl = `https://www.schul-netz.com/${snSchool}/`;

		const {response: loginHashResponse, text: loginHashText} = await this.fetch(
			'loginto.php?pageid=21311&mode=0&lang=',
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
			'index.php?pageid=1',
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

		if (!startPageUrl.pathname.endsWith('/index.php')) {
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
			throw new LoggedOutError(`Redirected to ${responseUrl.href}`);
		}

		return load(text);
	}

	async fetch(
		path: string,
		init?: RequestInit,
	): Promise<{
		response: Response;
		text: string;
	}> {
		if (!this.baseUrl) {
			throw new LoggedOutError('Did not call SchulNetz#login');
		}

		const urlParsed = new URL(path, this.baseUrl);
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
