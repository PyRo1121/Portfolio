import type { PageServerLoad } from './$types';
import { loadPublicDashboardPageData } from '$lib/server/public-dashboard-page';

export const load: PageServerLoad = (event) => loadPublicDashboardPageData(event);
