import {readFile} from 'node:fs/promises';

import ow from 'ow';
import {type JsonObject} from 'type-fest';

export async function getConfig(key: string): Promise<JsonObject> {
	const raw = await readFile(
		new URL('../config.json', import.meta.url),
		'utf8',
	);
	const parsed = (await JSON.parse(raw)) as unknown;
	ow(
		parsed,
		ow.object.partialShape({
			[key]: ow.object,
		}),
	);
	const result = parsed[key]!;
	return result as JsonObject;
}
