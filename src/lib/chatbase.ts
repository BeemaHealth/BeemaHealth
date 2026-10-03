/**
 * Chatbase website widget. The agent id is public (visible in page source).
 * Not a secret.
 *
 * Official bootstrap: queue calls until embed.min.js arrives, then inject that
 * script after window load so it does not compete with first paint.
 * Do not pass name, email, or other visitor identity into chatbase().
 */

export const CHATBASE_AGENT_ID = "ox-c-qDv7gBmQt5fjOHcQ" as const;

export const CHATBASE_EMBED_SRC =
  "https://www.chatbase.co/embed.min.js" as const;

/** Origins the embed script and its iframe / API calls use. */
export const CHATBASE_SCRIPT_ORIGINS = ["https://www.chatbase.co"] as const;

export const CHATBASE_CONNECT_ORIGINS = [
  "https://www.chatbase.co",
  "https://backend.chatbase.co",
] as const;

export const CHATBASE_FRAME_ORIGINS = [
  "https://www.chatbase.co",
  "https://backend.chatbase.co",
] as const;

export const CHATBASE_EMBED_SCRIPT = `
(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="${CHATBASE_EMBED_SRC}";script.id="${CHATBASE_AGENT_ID}";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();
`.trim();
