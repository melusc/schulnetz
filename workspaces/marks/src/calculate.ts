import {type Mark} from './get-marks.js';

export type GroupedMark = {
	mark: number;
	group: string;
	courses: string[];
};

export function calculate(grouped: ReadonlyMap<string, Mark[]>): {
	compensateDouble: number;
	average: number;
	amountFailing: number;
	marks: GroupedMark[];
} {
	const marksResult: GroupedMark[] = [];

	let average = 0;
	let amountFailing = 0;
	let compensateDouble = 0;

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
			compensateDouble += (rounded - 4) * 2;
		} else {
			compensateDouble += rounded - 4;
		}
	}

	return {
		compensateDouble,
		average: average / marksResult.length,
		amountFailing,
		marks: marksResult,
	};
}
