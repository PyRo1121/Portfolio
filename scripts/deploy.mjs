import { spawnSync } from 'node:child_process';

function run(command, args) {
	const result = spawnSync(command, args, { stdio: 'inherit' });
	if (result.error !== undefined) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with status ${String(result.status)}.`);
	}
}

function output(command, args) {
	const result = spawnSync(command, args, { encoding: 'utf8' });
	if (result.error !== undefined) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with status ${String(result.status)}.`);
	}
	return result.stdout.trim();
}

const status = output('git', ['status', '--porcelain']);
if (status.length > 0) {
	throw new Error('Refusing to deploy from a working tree with uncommitted changes.');
}
const sha = output('git', ['rev-parse', 'HEAD']);
if (!/^[0-9a-f]{40}$/u.test(sha)) {
	throw new Error('Git did not return an exact 40-character commit SHA.');
}
const shortSha = sha.slice(0, 12);

run('npm', ['run', 'ci']);
run('npm', ['run', 'db:migrate:career:remote']);
run('npm', ['run', 'db:migrate:owner:remote']);
run('npx', [
	'wrangler',
	'deploy',
	'--strict',
	'--message',
	`git:${sha}`,
	'--tag',
	`git-${shortSha}`
]);
