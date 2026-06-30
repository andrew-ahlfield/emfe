// Prerender the whole app to static HTML at build time. The explorer is a single client-rendered
// route with no server data, so a static shell (with its SEO <head> meta + JSON-LD) is exactly
// what crawlers and the Netlify CDN want; the interactive SVG hydrates on the client.
export const prerender = true;
