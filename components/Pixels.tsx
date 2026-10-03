"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { leerConsentimiento, EVENTO_CONSENTIMIENTO } from "@/lib/consent";

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

/**
 * Carga los píxeles de Meta/TikTok SOLO si el visitante aceptó cookies y hay
 * un ID configurado. Sin consentimiento aceptado, no se inserta ni un script.
 */
export function Pixels() {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    const comprobar = () => setActivo(leerConsentimiento() === "aceptado");
    comprobar();
    function onCambio(e: Event) {
      setActivo((e as CustomEvent<string>).detail === "aceptado");
    }
    window.addEventListener(EVENTO_CONSENTIMIENTO, onCambio);
    return () => window.removeEventListener(EVENTO_CONSENTIMIENTO, onCambio);
  }, []);

  if (!activo || (!META_ID && !TIKTOK_ID)) return null;

  return (
    <>
      {META_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_ID}');
fbq('track', 'PageView');`}
        </Script>
      )}
      {TIKTOK_ID && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<e.length;n++)ttq.setAndDefer(e,e.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var s=document.createElement("script");s.type="text/javascript",s.async=!0,s.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};
  ttq.load('${TIKTOK_ID}');
  ttq.page();
}(window, document, 'ttq');`}
        </Script>
      )}
    </>
  );
}
