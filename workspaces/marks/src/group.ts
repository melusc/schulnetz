import {type Mark} from './get-marks.js';

export function group(marks: readonly Mark[]): Map<string, Mark[]> {
	const grouped = new Map<string, Mark[]>();

	for (const mark of marks) {
		if (!grouped.has(mark.group)) {
			grouped.set(mark.group, []);
		}

		grouped.get(mark.group)!.push(mark);
	}

	return grouped;
}
