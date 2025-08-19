// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt'
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://computesdk.com/',
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
		    favicon: '/hv_main_logo_light.svg',	
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
          {
            label: 'Docs',
            href: '/start/introduction',
          },
          {
            label:'Contact',
            href: '/contact'
          },
          {
            label:'Blog',
            href: '/blog'
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
              paths: ['start/**']
            },
            {
              label: 'SDK Reference',
              description: 'Complete API reference and technical documentation',
              paths: ['reference/**']
            },
            {
              label: 'Provider Integration',
              description: 'Documentation for supported cloud providers',
              paths: ['providers/**']
            },
            {
              label: 'Framework Guides',
              description: 'Integration guides for popular frameworks',
              paths: ['frameworks/**']
            }
          ],
          promote: ['start/introduction*', 'start/quick-start*', 'reference/index*'],
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
          { label: 'LLM Documentation', link: '/llm-docs' },
          // { label: 'Server', link: '/server' },
          {
              label: 'Getting Started',
              autogenerate: { directory: 'start' },
          },
          {
              label: 'Providers',
              autogenerate: { directory: 'providers' },
          },
          {
              label: 'Frameworks',
              autogenerate: { directory: 'frameworks' },
          },
          {
              label: 'SDK Reference',
              items: [
                  { label: 'Overview', link: '/reference/' },
                  { label: 'UI Package', link: '/reference/ui' },
                  { label: 'Configuration', link: '/reference/configuration' },
                  { label: 'Code Execution', link: '/reference/code-execution' },
                  { label: 'Sandbox Management', link: '/reference/sandbox-management' },
                  { label: 'Filesystem', link: '/reference/filesystem' },
                  { label: 'Terminal', link: '/reference/terminal' },
                  { label: 'API Integration', link: '/reference/api-integration' },
              ],
          },
      ],
  }), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});