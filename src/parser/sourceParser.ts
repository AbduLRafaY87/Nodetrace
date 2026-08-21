import ts from 'typescript';

import {
	CodebaseFile,
	ParsedFile,
	ParsedFunction,
	ParsedComponent,
	ParsedClass,
	ParsedInterface,
	ParsedType,
	ParsedVariable,
	ParsedImport,
	ParsedExport,
} from '../types/codebase';

export function parseSourceFile(
	file: CodebaseFile,
	content: string
): ParsedFile {
	const sourceFile = ts.createSourceFile(
		file.path,
		content,
		ts.ScriptTarget.Latest,
		true,
		getScriptKind(file.extension)
	);

	const functions: ParsedFunction[] = [];
	const components: ParsedComponent[] = [];
	const classes: ParsedClass[] = [];
	const interfaces: ParsedInterface[] = [];
	const types: ParsedType[] = [];
	const variables: ParsedVariable[] = [];
	const imports: ParsedImport[] = [];
	const exports: ParsedExport[] = [];

	const identifierUsages: Record<string, number> = {};

	let defaultExportName: string | undefined;

	// Depth counter for `declare global { ... }` blocks
	// so declarations inside one can be flagged as
	// global augmentations rather than ordinary symbols.
	let globalAugmentationDepth = 0;

	// ----------------------------------------
	// Helpers
	// ----------------------------------------

	function getLine(
		node: ts.Node
	): number {
		return (
			sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			).line + 1
		);
	}

	function isUppercaseName(
		name: string
	): boolean {
		return /^[A-Z]/.test(name);
	}

	function isReactComponentName(
		name: string
	): boolean {
		return (
			isUppercaseName(name) &&
			![
				'GET',
				'POST',
				'PUT',
				'PATCH',
				'DELETE',
				'HEAD',
				'OPTIONS',
			].includes(name)
		);
	}

	// ----------------------------------------
	// React component detection
	// ----------------------------------------

	function isReactComponentFunction(
		name: string,
		node: ts.Node
	): boolean {
		if (!isReactComponentName(name)) {
			return false;
		}

		return (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node)
		);
	}

	// ----------------------------------------
	// Imports
	// ----------------------------------------

	function processImport(
		node: ts.ImportDeclaration
	) {
		const moduleSpecifier =
			node.moduleSpecifier;

		if (
			!ts.isStringLiteral(
				moduleSpecifier
			)
		) {
			return;
		}

		imports.push({
			source: moduleSpecifier.text,
			line: getLine(node),
		});
	}

	// ----------------------------------------
	// Exports
	// ----------------------------------------

	function processExport(
		node: ts.ExportDeclaration
	) {
		// export * from './something'
		if (
			node.moduleSpecifier &&
			ts.isStringLiteral(
				node.moduleSpecifier
			)
		) {
			// export * from ...
			if (!node.exportClause) {
				exports.push({
					name: '*',
					line: getLine(node),
					source:
						node.moduleSpecifier.text,
				});

				return;
			}

			// export { foo, bar } from ...
			if (
				ts.isNamedExports(
					node.exportClause
				)
			) {
				for (const element of node.exportClause.elements) {
					exports.push({
						name:
							element.name.text,
						line: getLine(node),
						source:
							node.moduleSpecifier
								.text,
					});
				}

				return;
			}

			// export * as namespace from ...
			if (
				ts.isNamespaceExport(
					node.exportClause
				)
			) {
				exports.push({
					name:
						node.exportClause.name
							.text,
					line: getLine(node),
					source:
						node.moduleSpecifier
							.text,
				});

				return;
			}
		}

		// export { foo, bar }
		if (
			node.exportClause &&
			ts.isNamedExports(
				node.exportClause
			)
		) {
			for (const element of node.exportClause.elements) {
				exports.push({
					name:
						element.name.text,
					line: getLine(node),
				});
			}
		}
	}

	// ----------------------------------------
	// Exported declarations
	// ----------------------------------------

	function processExportedDeclaration(
		node: ts.Node
	) {
		if (
			ts.isFunctionDeclaration(node) &&
			node.name
		) {
			exports.push({
				name: node.name.text,
				line: getLine(node),
			});

			return;
		}

		if (
			ts.isClassDeclaration(node) &&
			node.name
		) {
			exports.push({
				name: node.name.text,
				line: getLine(node),
			});

			return;
		}

		if (
			ts.isInterfaceDeclaration(node)
		) {
			exports.push({
				name: node.name.text,
				line: getLine(node),
			});

			return;
		}

		if (
			ts.isTypeAliasDeclaration(node)
		) {
			exports.push({
				name: node.name.text,
				line: getLine(node),
			});

			return;
		}

		if (
			ts.isVariableStatement(node)
		) {
			for (const declaration of node.declarationList.declarations) {
				if (
					ts.isIdentifier(
						declaration.name
					)
				) {
					exports.push({
						name:
							declaration.name
								.text,
						line:
							getLine(
								declaration
							),
					});
				}
			}
		}
	}

	// ----------------------------------------
	// Variables
	// ----------------------------------------

	function processVariable(
		node: ts.VariableDeclaration
	) {
		if (
			!ts.isIdentifier(node.name)
		) {
			return;
		}

		const name = node.name.text;

		const initializer =
			node.initializer;

		// Detect:
		// const Component = () => {}
		// const Component = function () {}
		if (
			initializer &&
			isReactComponentFunction(
				name,
				initializer
			)
		) {
			components.push({
				name,
				line: getLine(node),
			});

			return;
		}

		variables.push({
			name,
			line: getLine(node),
		});
	}

	// ----------------------------------------
	// Functions
	// ----------------------------------------

	function processFunction(
		node: ts.FunctionDeclaration
	) {
		const name =
			node.name?.text;

		if (!name) {
			return;
		}

		if (
			isReactComponentName(name)
		) {
			components.push({
				name,
				line: getLine(node),
			});

			return;
		}

		functions.push({
			name,
			line: getLine(node),
		});
	}

	// ----------------------------------------
	// Classes
	// ----------------------------------------

	function processClass(
		node: ts.ClassDeclaration
	) {
		const name =
			node.name?.text;

		if (!name) {
			return;
		}

		classes.push({
			name,
			line: getLine(node),
		});
	}

	// ----------------------------------------
	// Interfaces
	// ----------------------------------------

	function processInterface(
		node: ts.InterfaceDeclaration
	) {
		interfaces.push({
			name: node.name.text,
			line: getLine(node),
			isGlobalAugmentation:
				globalAugmentationDepth > 0,
		});
	}

	// ----------------------------------------
	// Type aliases
	// ----------------------------------------

	function processType(
		node: ts.TypeAliasDeclaration
	) {
		types.push({
			name: node.name.text,
			line: getLine(node),
			isGlobalAugmentation:
				globalAugmentationDepth > 0,
		});
	}

	// ----------------------------------------
	// Default exports
	// ----------------------------------------

	// Covers:
	//   export default function Foo() {}
	//   export default class Foo {}
	//   const Foo = () => {}; export default Foo;
	//   function Foo() {}; export default Foo;
	// A file can only have one default export, so the
	// last one found wins (there should only ever be one).
	function processPossibleDefaultExport(
		node: ts.Node
	) {
		const modifierFlags =
			ts.getCombinedModifierFlags(
				node as ts.Declaration
			);

		const isDefaultDeclaration =
			(modifierFlags &
				ts.ModifierFlags.Export) !==
				0 &&
			(modifierFlags &
				ts.ModifierFlags.Default) !==
				0;

		if (
			isDefaultDeclaration &&
			(ts.isFunctionDeclaration(node) ||
				ts.isClassDeclaration(node)) &&
			node.name
		) {
			defaultExportName = node.name.text;

			return;
		}

		// export default someIdentifier;
		if (
			ts.isExportAssignment(node) &&
			!node.isExportEquals &&
			ts.isIdentifier(node.expression)
		) {
			defaultExportName =
				node.expression.text;
		}
	}

	// ----------------------------------------
	// Identifier usage tracking
	// ----------------------------------------

	// Returns true when `node` is an identifier that
	// merely *names* a declaration (a function's name,
	// a variable's name, an object key, a JSX prop
	// name, a property-access member, etc.) rather than
	// a reference *to* something declared elsewhere.
	// Everything that isn't excluded here is treated as
	// a usage/reference of a symbol with that name.
	function isDeclarationOrMemberName(
		node: ts.Identifier
	): boolean {
		const parent = node.parent;

		if (!parent) {
			return false;
		}

		// Names of declarations: function foo(),
		// class Foo, interface Foo, type Foo,
		// const foo, function params, class/interface
		// members, enum members, namespaces.
		if (
			(ts.isFunctionDeclaration(parent) ||
				ts.isFunctionExpression(parent) ||
				ts.isArrowFunction(parent) ||
				ts.isClassDeclaration(parent) ||
				ts.isClassExpression(parent) ||
				ts.isInterfaceDeclaration(parent) ||
				ts.isTypeAliasDeclaration(parent) ||
				ts.isVariableDeclaration(parent) ||
				ts.isParameter(parent) ||
				ts.isPropertyDeclaration(parent) ||
				ts.isPropertySignature(parent) ||
				ts.isMethodDeclaration(parent) ||
				ts.isMethodSignature(parent) ||
				ts.isGetAccessorDeclaration(parent) ||
				ts.isSetAccessorDeclaration(parent) ||
				ts.isEnumDeclaration(parent) ||
				ts.isEnumMember(parent) ||
				ts.isModuleDeclaration(parent)) &&
			(parent as ts.NamedDeclaration).name ===
				node
		) {
			return true;
		}

		// Object literal keys: { foo: 1 }
		// (shorthand `{ foo }` is NOT excluded —
		// there the identifier is also referencing
		// an outer binding named `foo`.)
		if (
			ts.isPropertyAssignment(parent) &&
			parent.name === node
		) {
			return true;
		}

		// Member access: obj.foo — `foo` here names
		// a property, not a standalone symbol.
		if (
			ts.isPropertyAccessExpression(
				parent
			) &&
			parent.name === node
		) {
			return true;
		}

		// JSX prop names: <Foo bar="x" />
		if (
			ts.isJsxAttribute(parent) &&
			parent.name === node
		) {
			return true;
		}

		// Local binding names introduced by an
		// import: import Foo from 'x',
		// import { Foo } from 'x',
		// import * as Foo from 'x'.
		if (
			(ts.isImportClause(parent) ||
				ts.isImportSpecifier(parent) ||
				ts.isNamespaceImport(parent)) &&
			(parent as ts.NamedDeclaration).name ===
				node
		) {
			return true;
		}

		// Labels: label: for (...) {}, break label,
		// continue label.
		if (
			ts.isLabeledStatement(parent) &&
			parent.label === node
		) {
			return true;
		}

		if (
			(ts.isBreakStatement(parent) ||
				ts.isContinueStatement(parent)) &&
			parent.label === node
		) {
			return true;
		}

		return false;
	}

	function trackIdentifierUsage(
		node: ts.Node
	) {
		if (!ts.isIdentifier(node)) {
			return;
		}

		if (
			isDeclarationOrMemberName(node)
		) {
			return;
		}

		identifierUsages[node.text] =
			(identifierUsages[node.text] ??
				0) + 1;
	}

	// ----------------------------------------
	// AST traversal
	// ----------------------------------------

	function visit(node: ts.Node) {
		const entersGlobalAugmentation =
			ts.isModuleDeclaration(node) &&
			(node.flags &
				ts.NodeFlags.GlobalAugmentation) !==
				0;

		if (entersGlobalAugmentation) {
			globalAugmentationDepth++;
		}

		// Imports
		if (
			ts.isImportDeclaration(node)
		) {
			processImport(node);
		}

		// Default exports
		processPossibleDefaultExport(node);

		// export { ... } / export * from ...
		if (
			ts.isExportDeclaration(node)
		) {
			processExport(node);
		}

		// export function / export class /
		// export interface / export type /
		// export const
		if (
			ts.getCombinedModifierFlags(
				node as ts.Declaration
			) &
			ts.ModifierFlags.Export
		) {
			processExportedDeclaration(
				node
			);
		}

		// Functions
		if (
			ts.isFunctionDeclaration(node)
		) {
			processFunction(node);
		}

		// Classes
		if (
			ts.isClassDeclaration(node)
		) {
			processClass(node);
		}

		// Interfaces
		if (
			ts.isInterfaceDeclaration(node)
		) {
			processInterface(node);
		}

		// Types
		if (
			ts.isTypeAliasDeclaration(node)
		) {
			processType(node);
		}

		// Variables
		if (
			ts.isVariableDeclaration(node)
		) {
			processVariable(node);
		}

		// Dead code analysis: track every
		// identifier reference as we go.
		trackIdentifierUsage(node);

		ts.forEachChild(
			node,
			visit
		);

		if (entersGlobalAugmentation) {
			globalAugmentationDepth--;
		}
	}

	visit(sourceFile);

	return {
		file,
		functions,
		components,
		classes,
		interfaces,
		types,
		variables,
		imports,
		exports,
		identifierUsages,
		defaultExportName,
	};
}

// ----------------------------------------
// TypeScript script kind
// ----------------------------------------

function getScriptKind(
	extension: string
): ts.ScriptKind {
	switch (extension) {
		case '.tsx':
			return ts.ScriptKind.TSX;

		case '.jsx':
			return ts.ScriptKind.JSX;

		case '.js':
			return ts.ScriptKind.JS;

		case '.ts':
		default:
			return ts.ScriptKind.TS;
	}
}