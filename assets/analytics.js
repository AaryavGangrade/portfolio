/* Cloudflare Web Analytics — one site tag for all three GitHub Pages pages.
 * Activation: enter the token from Cloudflare -> Web Analytics -> Manage site
 * for hostname aaryavgangrade.github.io. No cookies or visitor profiles.
 * In Cloudflare filter by Path to see each of the three projects.
 */
(() => {
  'use strict';
  // Leave empty until the Cloudflare site tag has been created.
  const SITE_TOKEN = '';

  // A missing token must never trigger a network request or break the website.
  if (!/^[a-f0-9]{32}$/i.test(SITE_TOKEN)) return;
  // Exclude local previews, forks, and unintended hosts.
  if (location.hostname !== 'aaryavgangrade.github.io') return;
  if (!location.pathname.startsWith('/portfolio/')) return;

  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: SITE_TOKEN }));
  document.head.appendChild(beacon);
})();
