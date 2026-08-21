import ignore from 'ignore';

const DEFAULT_IGNORES = [
	'node_modules',
	'.git',
	'dist',
	'build',
	'out',
	'coverage',
	'.next',
	'.nuxt',
	'.turbo',
	'.cache',
];

export function createIgnoreFilter(gitignore?: string): ReturnType<typeof ignore> {
	const filter = ignore();

	filter.add(DEFAULT_IGNORES);

	if (gitignore) {
		filter.add(gitignore);
	}

	return filter;
}