import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_TITLE = 'BibleAI - Your AI Bible Companion';
const SEO_DESCRIPTION = 'Chat with the Bible, track your prayers and grow your faith with AI';
const DEFAULT_OG_IMAGE = 'https://bolt.new/static/og_default.png';

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

export default function SeoMeta() {
  const location = useLocation();

  useEffect(() => {
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    document.title = SEO_TITLE;

    upsertMeta('meta[name="description"]', 'name', 'description', SEO_DESCRIPTION);

    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', SEO_TITLE);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', SEO_DESCRIPTION);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', DEFAULT_OG_IMAGE);

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', SEO_TITLE);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', SEO_DESCRIPTION);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', DEFAULT_OG_IMAGE);

    upsertCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
}
