export type TimeRange = 'month' | 'this-week' | 'next-week';
const timeRanges = new Set<TimeRange>(['month', 'this-week', 'next-week']);

export function getTimeRange(key: string): {
	from: Date;
	to: Date;
} {
	const to = new Date();
	const from = new Date();

	from.setHours(0, 0, 0, 0);
	to.setHours(0, 0, 0, 0);

	if (key === 'month') {
		to.setMonth(to.getMonth() + 1);
		return {from, to};
	}

	if (key === 'next-week') {
		const {from, to} = getTimeRange('this-week');
		from.setDate(from.getDate() + 7);
		to.setDate(to.getDate() + 7);
		return {from, to};
	}

	if (key === 'this-week') {
		from.setDate(from.getDate() - from.getDay() + 1);
		to.setDate(from.getDate() + 6);
		return {from, to};
	}

	throw new Error(
		`Unknown option passed to --time, should be in [${[...timeRanges].join(
			', ',
		)}]`,
	);
}
