// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt'
import tailwindcss from '@tailwindcss/vite';

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
  integrations: [starlight({
    title: 'ComputeSDK',
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
    plugins: 
    [starlightThemeNova({
      nav: [
          // {
          //   label:'Features',
          //   href: '/features'
          // },  
          // {
          //   label:'Pricing',
          //   href: '/pricing'
          // },
          {
            label: 'Docs',
            href: '/docs/start/introduction',
          },
          {
            label:'Blog',
            href: '/blog'
          },
          {
            label:'Contact',
            href: '/contact'
          },
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
               paths: ['docs/start/**']
             },
             {
               label: 'SDK Reference',
               description: 'Complete API reference and technical documentation',
               paths: ['docs/reference/**']
             },
             {
               label: 'Provider Integration',
               description: 'Documentation for supported cloud providers',
               paths: ['docs/providers/**']
             },
             {
               label: 'Framework Guides',
               description: 'Integration guides for popular frameworks',
               paths: ['docs/frameworks/**']
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
              autogenerate: { directory: 'docs/start' },
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
                  { label: 'Overview', link: '/docs/reference/' },
                  { label: 'UI Package', link: '/docs/reference/ui' },
                  { label: 'Configuration', link: '/docs/reference/configuration' },
                  { label: 'Code Execution', link: '/docs/reference/code-execution' },
                  { label: 'Sandbox Management', link: '/docs/reference/sandbox-management' },
                  { label: 'Filesystem', link: '/docs/reference/filesystem' },
                  { label: 'Terminal', link: '/docs/reference/terminal' },
                  { label: 'API Integration', link: '/docs/reference/api-integration' },
              ],
          },
      ],
  }), sitemap()],

  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
    },
    preview: {
      allowedHosts: ['com-production-86d3.up.railway.app', '.railway.app'],
    },
  },
});
