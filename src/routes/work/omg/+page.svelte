<script lang="ts">
	import PublicCaseStudy from '$lib/components/PublicCaseStudy.svelte';
	import { publicCaseStudyFor } from '$lib/domain/public-case-study';

	const study = publicCaseStudyFor('omg');
</script>

<PublicCaseStudy {study} />
