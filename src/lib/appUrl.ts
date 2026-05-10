export function getAppUrl() {
  const envUrl = import.meta.env.VITE_SITE_URL;
  const base = envUrl || window.location.origin;
  return base.replace(/\/$/, '');
}
