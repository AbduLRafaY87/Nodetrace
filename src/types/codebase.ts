export interface CodebaseFile {
	name: string;
	path: string;
	extension: string;
	size: number;
}

export interface ParsedFunction {
	name: string;
	line: number;
}

export interface ParsedComponent {
	name: string;
	line: number;
}

export interface ParsedClass {
	name: string;
	line: number;
}

export interface ParsedInterface {
	name: string;
	line: number;

	// True when declared inside `declare global { ... }`.
	// This patches an existing global type (e.g.
	// `interface Window`) rather than introducing a new
	// symbol that code elsewhere would import or
	// reference by name, so it shouldn't be treated as
	// "unused" just because nothing refers to it.
	isGlobalAugmentation?: boolean;
}

export interface ParsedType {
	name: string;
	line: number;
	isGlobalAugmentation?: boolean;
}

export interface ParsedVariable {
	name: string;
	line: number;
}

export interface ParsedImport {
	source: string;
	line: number;
}

export interface ParsedExport {
	name: string;
	line: number;
	source?: string;
}

export interface ParsedFile {
	file: CodebaseFile;

	functions: ParsedFunction[];
	components: ParsedComponent[];
	classes: ParsedClass[];
	interfaces: ParsedInterface[];
	types: ParsedType[];
	variables: ParsedVariable[];

	imports: ParsedImport[];
	exports: ParsedExport[];

	// ----------------------------------------
	// Dead code analysis support
	// ----------------------------------------

	// Count of how many times each identifier
	// name is *referenced* in this file, i.e.
	// used somewhere other than as the name of
	// its own declaration. Summing this map
	// across every parsed file gives a
	// codebase-wide reference count for a name.
	identifierUsages: Record<string, number>;

	// The name of this file's default export, if it
	// has one and that export resolves to a plain
	// identifier (a function/class declared `export
	// default`, or `export default someName`). Used to
	// recognize framework conventions — e.g. a Next.js
	// `page.tsx`'s default export is used by virtue of
	// the file's location, not by anything importing it
	// by name.
	defaultExportName?: string;
}

export interface CodebaseStats {
	rootPath: string;

	totalFiles: number;

	filesByExtension: Record<
		string,
		number
	>;

	files: CodebaseFile[];

	parsedFiles: ParsedFile[];
}

// ----------------------------------------
// Dead code analysis
// ----------------------------------------

export type UnusedSymbolKind =
	| 'function'
	| 'component'
	| 'class'
	| 'interface'
	| 'type'
	| 'variable';

export interface UnusedSymbol {
	name: string;
	line: number;
	filePath: string;
	kind: UnusedSymbolKind;

	// Always 0 for now — a symbol only ends up
	// here when the analyzer found no references
	// to its name anywhere else in the codebase.
	// Kept as a field (rather than just a boolean)
	// so future versions can report low-but-nonzero
	// counts too.
	referenceCount: number;
}