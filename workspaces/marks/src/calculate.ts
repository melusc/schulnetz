import {type Mark} from './get-marks.ts';

export type GroupedMark = {
	mark: number;
	group: string;
	courses: string[];
};

export function calculate(grouped: ReadonlyMap<string, Mark[]>): {
	plus: number;
	minus: number;
	compensateDouble: number;
	average: number;
	amountFailing: number;
	marks: GroupedMark[];
} {
	const marksResult: GroupedMark[] = [];

	let average = 0;
	let amountFailing = 0;
	let plus = 0;
	let minus = 0;

	for (const [groupName, group] of grouped) {
		let sum = 0;

		const courses: string[] = [];
		for (const {mark, name} of group) {
			sum += mark;
			courses.push(name);
		}

		const mark = sum / group.length;
		const rounded = Math.round(mark * 2) / 2;

		marksResult.push({
			group: groupName,
			courses,
			mark: rounded,
		});

		average += rounded;
		if (rounded < 4) {
			++amountFailing;
			minus += 4 - rounded;
		} else {
			plus += rounded - 4;
		}
	}

	return {
		plus,
		minus,
		// prettier-ignore
		compensateDouble: plus - (2 * minus),
		average: average / marksResult.length,
		amountFailing,
		marks: marksResult,
	};
}
