import * as vscode from 'vscode';
import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';

import { createIgnoreFilter } from './fileFilter';
import { parseSourceFile } from '../parser/sourceParser';

import {
	CodebaseFile,
	CodebaseStats,
	ParsedFile,
} from '../types/codebase';

export async function scanWorkspace(): Promise<CodebaseStats | null> {
	const workspaceFolder =
		vscode.workspace.workspaceFolders?.[0];

	if (!workspaceFolder) {
		return null;
	}

	const rootPath = workspaceFolder.uri.fsPath;

	// ----------------------------------------
	// Read .gitignore
	// ----------------------------------------

	const gitignorePath = path.join(
		rootPath,
		'.gitignore'
	);

	let gitignore = '';

	try {
		gitignore = await fs.readFile(
			gitignorePath,
			'utf8'
		);
	} catch {
		// No .gitignore — that's okay.
	}

	const ignoreFilter =
		createIgnoreFilter(gitignore);

	// ----------------------------------------
	// Find all files
	// ----------------------------------------

	const filePaths = await fg('**/*', {
		cwd: rootPath,
		absolute: false,
		dot: true,
		onlyFiles: true,
	});

	const files: CodebaseFile[] = [];

	for (const relativePath of filePaths) {
		const normalizedPath =
			relativePath.replace(/\\/g, '/');

		if (
			ignoreFilter.ignores(
				normalizedPath
			)
		) {
			continue;
		}

		const absolutePath = path.join(
			rootPath,
			relativePath
		);

		try {
			const stats = await fs.stat(
				absolutePath
			);

			files.push({
				name: path.basename(
					relativePath
				),

				path: normalizedPath,

				extension:
					path.extname(
						relativePath
					).toLowerCase() ||
					'[no extension]',

				size: stats.size,
			});
		} catch {
			// Ignore files that cannot be accessed.
		}
	}

	// ----------------------------------------
	// Count file extensions
	// ----------------------------------------

	const filesByExtension:
		Record<string, number> = {};

	for (const file of files) {
		filesByExtension[file.extension] =
			(filesByExtension[file.extension] ?? 0) + 1;
	}

	// ----------------------------------------
	// Parse source files
	// ----------------------------------------

	const parsedFiles: ParsedFile[] = [];

	for (const file of files) {
		// We only want files our parser understands.
		const supportedExtensions = new Set([
			'.ts',
			'.tsx',
			'.js',
			'.jsx',
		]);

		if (
			!supportedExtensions.has(
				file.extension
			)
		) {
			continue;
		}

		try {
			const absolutePath = path.join(
				rootPath,
				file.path
			);

			const content =
				await fs.readFile(
					absolutePath,
					'utf8'
				);

			const parsed =
				parseSourceFile(
					file,
					content
				);

			if (parsed) {
				parsedFiles.push(parsed);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: String(error);

			console.error(
				`Nodetrace could not parse ${file.path}: ${message}`,
				error
			);
		}
	}

	// ----------------------------------------
	// Return complete codebase information
	// ----------------------------------------

	return {
		rootPath,
		totalFiles: files.length,
		filesByExtension,
		files,
		parsedFiles,
	};
}