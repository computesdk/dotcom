// @ts-nocheck
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt'
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.computesdk.com/',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    },
  },
  redirects: {
    '/docs': '/docs/getting-started/introduction',
    '/docs/reference': '/docs/reference/overview',
  },
  integrations: [
    react({
      include: ['**/CalScheduler.tsx', '**/CalScheduler.jsx', '**/components/**/*.tsx', '**/components/**/*.jsx'],
    }),
    starlight({
      title: 'ComputeSDK',
      description: 'ComputeSDK: The Universal Sandbox Interface.',
		    favicon: '/favicon.ico',
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/x-icon',
            href: '/favicon.ico',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/svg+xml',
            href: '/hv_main_logo_light.svg',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/png',
            sizes: '16x16',
            href: '/favicon-16x16.png',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/png',
            sizes: '32x32',
            href: '/favicon-32x32.png',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/png',
            sizes: '96x96',
            href: '/favicon-96x96.png',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            sizes: '96x96',
            href: '/favicon-96x96.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'apple-mobile-web-app-title',
            content: 'ComputeSDK',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'application-name',
            content: 'ComputeSDK',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'google-site-verification',
            content: 'VEcg5NwgU_sHsQHc78Qeho6-F54Zv1oQTqJSGgISOkc',
          },
        },
        {
          tag: 'script',
          attrs: {
            async: true,
            src: 'https://www.googletagmanager.com/gtag/js?id=G-CDJE5R5B1N'
          }
        },
        {
          tag: 'script',
          content: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CDJE5R5B1N');
          `
        },
        {
          tag: 'script',
          content: `
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Rr Mr fi Cr Ar ci Tr Fr capture Mi calculateEventProperties Lr register register_once register_for_session unregister unregister_for_session Hr getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Ur jr createPersonProfile zr kr Br opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Dr debug M Nr getPageViewId captureTraceFeedback captureTraceMetric $r".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('phc_Ai0WDj7xVec7QI2uxiDHRRFzeRNQhiYpfnqrNTWcl6k', {
                api_host: 'https://us.i.posthog.com',
                defaults: '2025-05-24',
                person_profiles: 'identified_only',
            })
          `
        },
      ],	
      logo: {
            light: './src/assets/hv_main_logo_light.svg',
            dark: './src/assets/hv_main_logo_dark.svg',
        },
		    customCss: [
              './src/styles/global.css',
              './src/styles/custom.css',
		    ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/computesdk/computesdk' }],
      components: {
        Header: './src/components/Header.astro',
        SocialIcons: './src/components/SocialIcons.astro',
      },
      plugins: 
      [starlightThemeNova({
        nav: [
            {
              label:'Features',
              href: '/features'
            },
            {
              label:'Use Cases',
              href: '/use-cases'
            },
            {
              label:'Pricing',
              href: '/pricing'
            },
            {
              label: 'Docs',
              href: '/docs/getting-started/introduction',
            },
            {
              label:'Blog',
              href: '/blog'
            },
            // {
            //   label:'Contact',
            //   href: '/contact'
            // },
          ],
           }),
           starlightLlmsTxt({
            projectName: 'ComputeSDK',
            description: 'A secure, local-first SDK that allows you to run code in isolated sandbox environments',
            details: 'ComputeSDK provides a unified interface for executing code across multiple cloud providers and local environments. Perfect for AI applications, educational platforms, and any system requiring secure code execution.',
            customSets: [
               {
                 label: 'Getting Started',
                 description: 'Essential documentation for new users',
                 paths: ['docs/docs/getting-started/**']
               },
               {
                 label: 'SDK Reference',
                 description: 'Complete API reference and technical documentation',
                 paths: ['docs/docs/reference/**']
               },
               {
                 label: 'Provider Integration',
                 description: 'Documentation for supported cloud providers',
                 paths: ['docs/docs/providers/**']
               },
               {
                 label: 'Framework Guides',
                 description: 'Integration guides for popular frameworks',
                 paths: ['docs/docs/frameworks/**']
               }
            ],
             promote: ['docs/start/introduction*', 'docs/start/quick-start*', 'docs/reference/index*'],
            exclude: ['contact*'],
            minify: {
              note: true,
              tip: false,
              details: true,
              whitespace: true
            }
          })],
        sidebar: [
            { label: 'Examples', link: 'https://github.com/computesdk/computesdk/tree/main/examples', attrs: { target: '_blank' } },
            { label: 'LLM Documentation', link: '/docs/llm-docs' },
            // { label: 'Server', link: '/server' },
            {
                label: 'Getting Started',
                autogenerate: { directory: 'docs/getting-started' },
            },
            {
                label: 'Providers',
                autogenerate: { directory: 'docs/providers' },
            },
            {
                label: 'Frameworks',
                autogenerate: { directory: 'docs/frameworks' },
            },
            {
                label: 'SDK Reference',
                items: [
                    { label: 'Overview', link: '/docs/reference/overview' },
                    { label: 'CLI', link: '/docs/reference/cli' },
                    { label: 'UI Package', link: '/docs/reference/ui-package' },
                    { label: 'Configuration', link: '/docs/reference/configuration' },
                    { label: 'Code Execution', link: '/docs/reference/code-execution' },
                    { label: 'Sandbox Management', link: '/docs/reference/sandbox-management' },
                    { label: 'Filesystem', link: '/docs/reference/filesystem' },
                    { label: 'Client', link: '/docs/reference/client' },
                    { label: 'API Integration', link: '/docs/reference/api-integration' },
                ],
            },
        ],
    }), 
    sitemap({
      filter: (page) =>
        page !== 'https://www.computesdk.com/sidekick/' &&
        page !== 'https://www.computesdk.com/features/sandboxes/' &&
        page !== 'https://www.computesdk.com/old-index/' &&
        page !== 'https://www.computesdk.com/refund/' &&
        page !== 'https://www.computesdk.com/providers/blaxel'
    }),
  ],

  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      allowedHosts: ['.hartley-wahoo.ts.net'],
    },
    preview: {
      allowedHosts: ['com-production-86d3.up.railway.app', '.railway.app', ],
    },
  },
});