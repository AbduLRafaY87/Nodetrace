import { ParsedFile, UnusedSymbolKind } from '../types/codebase';

// ----------------------------------------
// Framework conventions
// ----------------------------------------
//
// Some files and export names are invoked by a
// framework via naming or location convention rather
// than a normal JS reference — a Next.js App Router
// page.tsx's default export is rendered because of
// where the file sits in app/, not because anything
// imports it by name. Symbols that exist only for this
// purpose will always show 0 identifier references, so
// dead code analysis excludes them entirely instead of
// flagging them.
//
// This currently only recognizes the Next.js App
// Router. Other file-based-routing frameworks (Remix,
// SvelteKit, Nuxt, etc.) aren't covered yet — their
// special files will still show up as ordinary flagged
// symbols until support is added here.

const SPECIAL_FILE_BASENAMES = new Set([
	'page',
	'layout',
	'template',
	'loading',
	'error',
	'global-error',
	'not-found',
	'default',
	'route',
	'middleware',
	'instrumentation',
]);

const ROUTE_HANDLER_NAMES = new Set([
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
]);

// Names Next.js reads directly off a page/layout/route
// module rather than something importing them.
const CONVENTION_EXPORT_NAMES = new Set([
	'metadata',
	'generateMetadata',
	'generateStaticParams',
	'generateViewport',
	'viewport',
	'revalidate',
	'dynamic',
	'dynamicParams',
	'fetchCache',
	'runtime',
	'preferredRegion',
	'maxDuration',
]);

function getSpecialFileBasename(
	filePath: string
): string | null {
	const fileName =
		filePath.split('/').pop() ?? filePath;

	const withoutExtension = fileName.replace(
		/\.(tsx|ts|jsx|js)$/,
		''
	);

	return SPECIAL_FILE_BASENAMES.has(
		withoutExtension
	)
		? withoutExtension
		: null;
}

export function isFrameworkConventionSymbol(
	symbolName: string,
	kind: UnusedSymbolKind,
	parsedFile: ParsedFile
): boolean {
	const specialFile = getSpecialFileBasename(
		parsedFile.file.path
	);

	if (!specialFile) {
		return false;
	}

	// route.ts: GET/POST/etc. are invoked by the
	// framework based on their exact export name.
	if (
		specialFile === 'route' &&
		(kind === 'function' ||
			kind === 'variable') &&
		ROUTE_HANDLER_NAMES.has(symbolName)
	) {
		return true;
	}

	// The default export of a special file is
	// rendered/invoked by virtue of the file's
	// location, not referenced by name elsewhere.
	if (
		parsedFile.defaultExportName ===
		symbolName
	) {
		return true;
	}

	// metadata, generateStaticParams, etc. are read
	// directly by the framework rather than imported.
	if (
		CONVENTION_EXPORT_NAMES.has(symbolName)
	) {
		return true;
	}

	return false;
}