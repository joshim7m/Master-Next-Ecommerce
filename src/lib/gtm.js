export function pushDataLayer(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  console.log(`[GTM] ${event}`, data);
}
