import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_TITLE = 'BibleAI — AI-Powered Scripture & Prayer';
const SEO_DESCRIPTION = 'Chat with the Bible, track your prayers, read daily devotionals, and grow your faith with AI-powered insights.';
const DEFAULT_OG_IMAGE = 'https://bible-ai-initial-build.vercel.app/og-default.png';
const TWITTER_HANDLE = '@BibleAIApp';

interface MetaConfig {
  title: string;
  description: string;
  image: string;
  type: string;
}

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

function getPageMeta(pathname: string): MetaConfig {
  if (pathname === '/' || pathname === '/landing') {
    return {
      title: 'BibleAI — AI-Powered Scripture & Prayer',
      description: 'Discover scripture, track your prayers, and grow your faith with AI-powered Bible study. Join thousands of believers.',
      image: DEFAULT_OG_IMAGE,
      type: 'website',
    };
  }
  if (pathname.startsWith('/share/')) {
    return {
      title: 'A Scripture Verse — Shared via BibleAI',
      description: 'Someone shared a beautiful Bible verse with you. Open BibleAI to discover more scripture and grow your faith.',
      image: DEFAULT_OG_IMAGE,
      type: 'article',
    };
  }
  if (pathname.startsWith('/dashboard/bible-chat')) {
    return {
      title: 'Bible Chat — BibleAI',
      description: 'Ask questions about scripture and get AI-powered insights from the Bible.',
      image: DEFAULT_OG_IMAGE,
      type: 'website',
    };
  }
  if (pathname.startsWith('/dashboard/prayer-journal')) {
    return {
      title: 'Prayer Journal — BibleAI',
      description: 'Track your prayers, record answers, and build a lasting prayer habit.',
      image: DEFAULT_OG_IMAGE,
      type: 'website',
    };
  }
  if (pathname.startsWith('/dashboard/community')) {
    return {
      title: 'Community Feed — BibleAI',
      description: 'Join believers sharing scripture, reflections, and testimonies.',
      image: DEFAULT_OG_IMAGE,
      type: 'website',
    };
  }
  return {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    image: DEFAULT_OG_IMAGE,
    type: 'website',
  };
}

export default function SeoMeta() {
  const location = useLocation();

  useEffect(() => {
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const canonicalUrl = `${siteUrl}${location.pathname}`;
    const meta = getPageMeta(location.pathname);

    document.title = meta.title;

    // Basic meta
    upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
    upsertMeta('meta[name="theme-color"]', 'name', 'theme-color', '#fbbf24');

    // Open Graph
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', meta.type);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', meta.image);
    upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
    upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'BibleAI');

    // Twitter Card
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:site"]', 'name', 'twitter:site', TWITTER_HANDLE);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', meta.image);

    // PWA / Mobile
    upsertMeta('meta[name="apple-mobile-web-app-capable"]', 'name', 'apple-mobile-web-app-capable', 'yes');
    upsertMeta('meta[name="apple-mobile-web-app-status-bar-style"]', 'name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');
    upsertMeta('meta[name="apple-mobile-web-app-title"]', 'name', 'apple-mobile-web-app-title', 'BibleAI');

    upsertCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
}
