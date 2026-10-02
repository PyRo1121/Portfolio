import { build } from 'esbuild';
await build({
	entryPoints: ['cinematic/scene.js'],
	bundle: true,
	minify: true,
	format: 'esm',
	target: 'es2022',
	outfile: 'static/orbit/scene.js',
	legalComments: 'linked'
});
