import toFilter from '../filter.json' assert {type: 'json'};
import {type Mark} from './get-marks.js';

function assertStringArray(input: string[]): void {
	void input;
}

assertStringArray(toFilter);
export function filter(marks: readonly Mark[]): Mark[] {
	const filtersSet = new Set(toFilter.map(s => s.toLowerCase()));

	return marks.filter(({name}) => !filtersSet.has(name.toLowerCase()));
}
