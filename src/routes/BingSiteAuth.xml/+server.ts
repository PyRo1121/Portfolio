import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const verification = `<?xml version="1.0"?>
<users>
	<user>A871A646CAD94557036F1E34D341AC4E</user>
</users>
`;

export const GET: RequestHandler = ({ setHeaders }) => {
	setHeaders({
		'cache-control': 'public, max-age=3600',
		'content-type': 'application/xml; charset=utf-8',
		'x-content-type-options': 'nosniff'
	});
	return text(verification);
};
