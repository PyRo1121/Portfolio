import type { PageServerLoad } from './$types';
import { loadPublicPortfolioPageData } from '$lib/server/public-dashboard-page';

export const load: PageServerLoad = (event) => loadPublicPortfolioPageData(event);
