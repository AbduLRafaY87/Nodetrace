import {
	CodebaseStats,
	ParsedFile,
	UnusedSymbol,
	UnusedSymbolKind,
} from '../types/codebase';
import { isFrameworkConventionSymbol } from './frameworkConventions';

// ----------------------------------------
// Dead code analysis
// ----------------------------------------
//
// This is a heuristic, name-based check, not a full
// scope-aware analysis:
//
//   - It counts every identifier *reference* (see
//     sourceParser's isDeclarationOrMemberName) for a
//     given name across the whole codebase, and
//     compares that against each declared symbol's own
//     name.
//   - Two unrelated symbols that happen to share a name
//     (e.g. a local `id` variable in one file and a
//     top-level `id` type in another) will look "used"
//     even if the declaration we're checking isn't the
//     one actually referenced.
//   - Usages that aren't literal identifiers — dynamic
//     property access (obj['foo']), reflection, etc. —
//     won't be seen.
//
// Two categories of known false positive are filtered
// out before results are returned:
//   - Next.js App Router conventions (a page.tsx's
//     default export, a route.ts's GET/POST handlers,
//     `metadata`, etc.) — see frameworkConventions.ts.
//   - `declare global { interface Window { ... } }`
//     style global augmentations, which patch an
//     existing type rather than introduce a symbol
//     other code would reference by name.
//
// Even with those filtered out, a reference count of 0
// means "no evidence of use was found," not "this is
// dead code." Callers should present results as
// "potentially unused," never as a confident deletion
// recommendation.

const SYMBOL_KINDS: Array<{
	kind: UnusedSymbolKind;
	getSymbols: (
		parsedFile: ParsedFile
	) => Array<{
		name: string;
		line: number;
		isGlobalAugmentation?: boolean;
	}>;
}> = [
	{
		kind: 'function',
		getSymbols: (file) => file.functions,
	},
	{
		kind: 'component',
		getSymbols: (file) => file.components,
	},
	{
		kind: 'class',
		getSymbols: (file) => file.classes,
	},
	{
		kind: 'interface',
		getSymbols: (file) => file.interfaces,
	},
	{
		kind: 'type',
		getSymbols: (file) => file.types,
	},
	{
		kind: 'variable',
		getSymbols: (file) => file.variables,
	},
];

function buildGlobalUsageCounts(
	parsedFiles: ParsedFile[]
): Record<string, number> {
	const usageCounts: Record<string, number> = {};

	for (const parsedFile of parsedFiles) {
		for (const [name, count] of Object.entries(
			parsedFile.identifierUsages
		)) {
			usageCounts[name] =
				(usageCounts[name] ?? 0) + count;
		}
	}

	return usageCounts;
}

export function findUnusedSymbols(
	stats: CodebaseStats
): UnusedSymbol[] {
	const usageCounts = buildGlobalUsageCounts(
		stats.parsedFiles
	);

	const unusedSymbols: UnusedSymbol[] = [];

	for (const parsedFile of stats.parsedFiles) {
		for (const {
			kind,
			getSymbols,
		} of SYMBOL_KINDS) {
			for (const symbol of getSymbols(
				parsedFile
			)) {
				if (
					symbol.isGlobalAugmentation
				) {
					continue;
				}

				if (
					isFrameworkConventionSymbol(
						symbol.name,
						kind,
						parsedFile
					)
				) {
					continue;
				}

				const referenceCount =
					usageCounts[symbol.name] ?? 0;

				if (referenceCount === 0) {
					unusedSymbols.push({
						name: symbol.name,
						line: symbol.line,
						filePath:
							parsedFile.file.path,
						kind,
						referenceCount,
					});
				}
			}
		}
	}

	return unusedSymbols;
}