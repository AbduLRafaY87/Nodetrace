const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify') || production;

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		platform: 'node',
		target: 'node18',
		outfile: 'out/extension.js',
		// The vscode module is provided by the extension
		// host at runtime, not a real npm package — it
		// must never be bundled.
		external: ['vscode'],
		sourcemap: !production,
		minify,
		logLevel: 'info',
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});