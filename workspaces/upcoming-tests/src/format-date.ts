const padStart = (n: number) => n.toString().padStart(2, '0');

export const formatDate = (date: Date) => {
	const day = padStart(date.getDate());
	const month = padStart(date.getMonth() + 1);
	const year = date.getFullYear().toString();

	return `${year}-${month}-${day}`;
};
