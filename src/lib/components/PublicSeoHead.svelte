<script lang="ts">
	import {
		jsonLdScriptTag,
		PUBLIC_GITHUB_URL,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_SITE_ORIGIN,
		type PublicSeoPage
	} from '$lib/domain/public-seo';

	let { seo }: { readonly seo: PublicSeoPage } = $props();
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<link rel="canonical" href={seo.canonical} />
	<link rel="me" href={PUBLIC_GITHUB_URL} />
	<link rel="me" href={PUBLIC_LINKEDIN_URL} />
	<meta property="og:type" content={seo.kind} />
	<meta property="og:site_name" content="Olen Latham" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:url" content={seo.canonical} />
	<meta property="og:image" content={seo.image.url} />
	<meta property="og:image:type" content={seo.image.type} />
	<meta property="og:image:width" content={seo.image.width.toString()} />
	<meta property="og:image:height" content={seo.image.height.toString()} />
	<meta property="og:image:alt" content={seo.image.alt} />
	{#if seo.kind === 'article'}
		<meta property="article:author" content={`${PUBLIC_SITE_ORIGIN}/about`} />
		<meta property="article:modified_time" content={seo.modified} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image.url} />
	<meta name="twitter:image:alt" content={seo.image.alt} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(seo.jsonLd)}
</svelte:head>
