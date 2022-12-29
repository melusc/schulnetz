import ow from 'ow';

export class CookieJar {
	#cookies = new Map<string, string>();

	add(cookies: string): void {
		for (const cookie of cookies.split(',')) {
			const match = /^\s*(?<key>[^=;]+)=(?<value>[^=;]+)/.exec(cookie);

			if (!match) {
				continue;
			}

			ow(
				match.groups,
				ow.object.partialShape({
					key: ow.string,
					value: ow.string,
				}),
			);

			const {key, value} = match.groups;
			this.#cookies.set(key, value);
		}
	}

	toString(): string {
		const result: string[] = [];
		for (const [key, value] of this.#cookies) {
			result.push(`${key}=${value}`);
		}

		return result.join('; ');
	}
}
