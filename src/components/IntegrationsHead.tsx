import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Dynamically injects Google Analytics, GTM, AdSense, Facebook Pixel,
 * and Microsoft Clarity scripts based on admin settings.
 */
const IntegrationsHead = () => {
  const { data: settings } = useSiteSettings();
  const integrations = settings?.integrations || {};

  useEffect(() => {
    // Cleanup previous injected scripts
    document.querySelectorAll("[data-integration]").forEach((el) => el.remove());

    // Google Analytics (gtag.js)
    const ga = integrations.google_analytics;
    if (ga?.enabled && ga?.measurement_id) {
      const script1 = document.createElement("script");
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${ga.measurement_id}`;
      script1.setAttribute("data-integration", "ga");
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.setAttribute("data-integration", "ga-init");
      script2.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga.measurement_id}');
      `;
      document.head.appendChild(script2);
    }

    // Google Tag Manager
    const gtm = integrations.google_tag_manager;
    if (gtm?.enabled && gtm?.container_id) {
      const script = document.createElement("script");
      script.setAttribute("data-integration", "gtm");
      script.textContent = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtm.container_id}');
      `;
      document.head.appendChild(script);
    }

    // Google AdSense
    const adsense = integrations.google_adsense;
    if (adsense?.enabled && adsense?.publisher_id) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.publisher_id}`;
      script.setAttribute("data-integration", "adsense");
      document.head.appendChild(script);
    }

    // Facebook Pixel
    const fbPixel = integrations.facebook_pixel;
    if (fbPixel?.enabled && fbPixel?.pixel_id) {
      const script = document.createElement("script");
      script.setAttribute("data-integration", "fb-pixel");
      script.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fbPixel.pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }

    // Microsoft Clarity
    const clarity = integrations.microsoft_clarity;
    if (clarity?.enabled && clarity?.project_id) {
      const script = document.createElement("script");
      script.setAttribute("data-integration", "clarity");
      script.textContent = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarity.project_id}");
      `;
      document.head.appendChild(script);
    }

    // Google Search Console verification (meta tag)
    const gsc = integrations.google_search_console;
    if (gsc?.enabled && gsc?.property_url && gsc.property_url.startsWith("google-site-verification=")) {
      const verificationCode = gsc.property_url.replace("google-site-verification=", "");
      const meta = document.createElement("meta");
      meta.name = "google-site-verification";
      meta.content = verificationCode;
      meta.setAttribute("data-integration", "gsc");
      document.head.appendChild(meta);
    }

    return () => {
      document.querySelectorAll("[data-integration]").forEach((el) => el.remove());
    };
  }, [integrations]);

  return null;
};

export default IntegrationsHead;
