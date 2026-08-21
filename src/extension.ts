import * as vscode from 'vscode';

import { scanWorkspace } from './scanner/workspaceScanner';
import { findUnusedSymbols } from './analyzer/deadCodeAnalyzer';
import { UnusedSymbolKind } from './types/codebase';

export function activate(context: vscode.ExtensionContext) {
	const outputChannel =
		vscode.window.createOutputChannel('Nodetrace');

	const analyzeCommand =
		vscode.commands.registerCommand(
			'nodetrace.analyzeCodebase',
			async () => {
				await vscode.window.withProgress(
					{
						location:
							vscode.ProgressLocation.Notification,
						title:
							'Nodetrace is analyzing your codebase...',
						cancellable: false,
					},
					async () => {
						const result =
							await scanWorkspace();

						if (!result) {
							vscode.window.showWarningMessage(
								'Nodetrace: Open a workspace before analyzing the codebase.'
							);

							return;
						}

						// ----------------------------------------
						// Aggregate parsed symbols
						// ----------------------------------------

						const functions =
							result.parsedFiles.flatMap(
								(file) =>
									file.functions
							);

						const components =
							result.parsedFiles.flatMap(
								(file) =>
									file.components
							);

						const classes =
							result.parsedFiles.flatMap(
								(file) =>
									file.classes
							);

						const interfaces =
							result.parsedFiles.flatMap(
								(file) =>
									file.interfaces
							);

						const types =
							result.parsedFiles.flatMap(
								(file) =>
									file.types
							);

						const variables =
							result.parsedFiles.flatMap(
								(file) =>
									file.variables
							);

						const totalImports =
							result.parsedFiles.reduce(
								(total, file) =>
									total +
									file.imports.length,
								0
							);

						const totalExports =
							result.parsedFiles.reduce(
								(total, file) =>
									total +
									file.exports.length,
								0
							);

						// ----------------------------------------
						// Output
						// ----------------------------------------

						outputChannel.clear();

						outputChannel.show(true);

						const log = (
							message = ''
						) => {
							outputChannel.appendLine(
								message
							);
						};

						log(
							'=========================================='
						);
						log(
							'             NODETRACE ANALYSIS'
						);
						log(
							'=========================================='
						);

						// ----------------------------------------
						// CODEBASE
						// ----------------------------------------

						log();
						log('CODEBASE');
						log(
							'------------------------------------------'
						);

						log(
							`Root:   ${result.rootPath}`
						);

						log(
							`Files:  ${result.totalFiles}`
						);

						log(
							`Parsed: ${result.parsedFiles.length}`
						);

						// ----------------------------------------
						// FILE TYPES
						// ----------------------------------------

						log();
						log('FILE TYPES');
						log(
							'------------------------------------------'
						);

						const sortedExtensions =
							Object.entries(
								result.filesByExtension
							).sort(
								([, a], [, b]) =>
									b - a
							);

						for (const [
							extension,
							count,
						] of sortedExtensions) {
							log(
								`${extension.padEnd(
									15
								)} ${count}`
							);
						}

						// ----------------------------------------
						// SYMBOLS
						// ----------------------------------------

						log();
						log('SYMBOLS');
						log(
							'------------------------------------------'
						);

						log(
							`Functions:    ${functions.length}`
						);

						log(
							`Components:   ${components.length}`
						);

						log(
							`Classes:      ${classes.length}`
						);

						log(
							`Interfaces:   ${interfaces.length}`
						);

						log(
							`Types:        ${types.length}`
						);

						log(
							`Variables:    ${variables.length}`
						);

						const totalSymbols =
							functions.length +
							components.length +
							classes.length +
							interfaces.length +
							types.length +
							variables.length;

						log(
							`Total:        ${totalSymbols}`
						);

						// ----------------------------------------
						// RELATIONSHIPS
						// ----------------------------------------

						log();
						log(
							'RELATIONSHIPS'
						);
						log(
							'------------------------------------------'
						);

						log(
							`Imports:      ${totalImports}`
						);

						log(
							`Exports:      ${totalExports}`
						);

						// ----------------------------------------
						// FUNCTIONS
						// ----------------------------------------

						log();
						log('FUNCTIONS');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.functions) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// COMPONENTS
						// ----------------------------------------

						log();
						log('COMPONENTS');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.components) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// CLASSES
						// ----------------------------------------

						log();
						log('CLASSES');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.classes) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// INTERFACES
						// ----------------------------------------

						log();
						log('INTERFACES');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.interfaces) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// TYPES
						// ----------------------------------------

						log();
						log('TYPES');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.types) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// VARIABLES
						// ----------------------------------------

						log();
						log('VARIABLES');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const symbol of parsedFile.variables) {
								log(
									`${symbol.name} → ${parsedFile.file.path}:${symbol.line}`
								);
							}
						}

						// ----------------------------------------
						// IMPORTS
						// ----------------------------------------

						log();
						log('IMPORTS');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const importInfo of parsedFile.imports) {
								log(
									`${parsedFile.file.path}:${importInfo.line} → ${importInfo.source}`
								);
							}
						}

						// ----------------------------------------
						// EXPORTS
						// ----------------------------------------

						log();
						log('EXPORTS');
						log(
							'------------------------------------------'
						);

						for (const parsedFile of result.parsedFiles) {
							for (const exportInfo of parsedFile.exports) {
								const source =
									exportInfo.source
										? ` → ${exportInfo.source}`
										: '';

								log(
									`${parsedFile.file.path}:${exportInfo.line} → ${exportInfo.name}${source}`
								);
							}
						}

						// ----------------------------------------
						// COMPLETE
						// ----------------------------------------

						log();
						log(
							'=========================================='
						);
						log(
							'        NODETRACE ANALYSIS COMPLETE'
						);
						log(
							'=========================================='
						);

						vscode.window.showInformationMessage(
							`Nodetrace analyzed ${result.totalFiles} files, discovered ${totalSymbols} symbols, ${totalImports} imports and ${totalExports} exports.`
						);
					}
				);
			}
		);

	// ----------------------------------------
	// Dead code analysis
	// ----------------------------------------

	const deadCodeCommand =
		vscode.commands.registerCommand(
			'nodetrace.findDeadCode',
			async () => {
				await vscode.window.withProgress(
					{
						location:
							vscode.ProgressLocation.Notification,
						title:
							'Nodetrace is checking for dead code...',
						cancellable: false,
					},
					async () => {
						const result =
							await scanWorkspace();

						if (!result) {
							vscode.window.showWarningMessage(
								'Nodetrace: Open a workspace before analyzing the codebase.'
							);

							return;
						}

						const unusedSymbols =
							findUnusedSymbols(
								result
							);

						outputChannel.clear();

						outputChannel.show(true);

						const log = (
							message = ''
						) => {
							outputChannel.appendLine(
								message
							);
						};

						log(
							'=========================================='
						);
						log(
							'            DEAD CODE ANALYSIS'
						);
						log(
							'=========================================='
						);

						if (
							unusedSymbols.length === 0
						) {
							log();
							log(
								'No potentially unused symbols found.'
							);
						} else {
							log();
							log(
								`⚠️ ${unusedSymbols.length} potentially unused symbols`
							);
							log(
								'------------------------------------------'
							);

							const kindLabels: Record<
								UnusedSymbolKind,
								string
							> = {
								function: 'Functions',
								component: 'Components',
								class: 'Classes',
								interface: 'Interfaces',
								type: 'Types',
								variable: 'Variables',
							};

							const kindOrder: UnusedSymbolKind[] =
								[
									'function',
									'component',
									'class',
									'interface',
									'type',
									'variable',
								];

							for (const kind of kindOrder) {
								const symbolsOfKind =
									unusedSymbols.filter(
										(symbol) =>
											symbol.kind ===
											kind
									);

								if (
									symbolsOfKind.length ===
									0
								) {
									continue;
								}

								log();
								log(
									kindLabels[kind]
								);

								for (const symbol of symbolsOfKind) {
									log(
										`  ⚠ ${symbol.name}`
									);
									log(
										`    ${symbol.filePath}:${symbol.line}`
									);
									log(
										`    References: ${symbol.referenceCount}`
									);
								}
							}

							log();
							log(
								'------------------------------------------'
							);
							log(
								'"No references found" does not mean this'
							);
							log(
								'code is definitely dead — it may be used'
							);
							log(
								'dynamically, exported for external'
							);
							log(
								'consumers, or referenced in ways this'
							);
							log(
								'analysis can\'t detect. Review each item'
							);
							log(
								'before removing it.'
							);
						}

						log();
						log(
							'=========================================='
						);
						log(
							'       DEAD CODE ANALYSIS COMPLETE'
						);
						log(
							'=========================================='
						);

						vscode.window.showInformationMessage(
							unusedSymbols.length === 0
								? 'Nodetrace found no potentially unused symbols.'
								: `Nodetrace found ${unusedSymbols.length} potentially unused symbols.`
						);
					}
				);
			}
		);

	context.subscriptions.push(
		analyzeCommand
	);

	context.subscriptions.push(
		deadCodeCommand
	);

	context.subscriptions.push(
		outputChannel
	);
}

export function deactivate() {}