/**
 * Microsoft Clarity (session recordings + heatmaps), requested by the SEM
 * agency. The project id is public by design (visible in page source). Not a
 * secret.
 *
 * Same bootstrap as Microsoft's install snippet, with two changes:
 * - Production hostname gate, so local/preview never record real sessions.
 * - Injection deferred until after window load (plus idle), so the tag does not
 *   compete with first paint / LCP (see GTM_HEAD_SCRIPT in gtm.ts).
 *
 * `window.clarity` is still defined synchronously, so later clarity() calls
 * queue and replay. Do not call clarity("identify", ...) or set custom tags
 * with name, email, or any other PHI. Set masking to Strict in the Clarity
 * dashboard (Settings > Masking).
 */

export const CLARITY_PROJECT_ID = "zd5hkqhqhq" as const;

export const CLARITY_PRODUCTION_HOSTNAME = "beemahealth.com" as const;

/** Origins the tag, its runtime script, and its collect endpoints use. */
export const CLARITY_SCRIPT_ORIGINS = [
  "https://www.clarity.ms",
  "https://scripts.clarity.ms",
] as const;

export const CLARITY_CONNECT_ORIGINS = [
  "https://*.clarity.ms",
  "https://c.bing.com",
] as const;

export const CLARITY_FALLBACK_DELAY_MS = 1500;

export const CLARITY_EMBED_SCRIPT = `
if (window.location.hostname === '${CLARITY_PRODUCTION_HOSTNAME}') {
(function(c,l,a,r,i){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
function start(){var t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
var y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);}
function idle(){if(c.requestIdleCallback){c.requestIdleCallback(start,{timeout:${CLARITY_FALLBACK_DELAY_MS}});}
else{c.setTimeout(start,${CLARITY_FALLBACK_DELAY_MS});}}
if(l.readyState==='complete'){idle();}else{c.addEventListener('load',idle,{once:true});}
})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");
}
`.trim();
