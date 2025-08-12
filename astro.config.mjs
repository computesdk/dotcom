// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    },
  },
  integrations: [
      starlight({
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
        plugins: [starlightThemeNova({
          nav: [
              {
                label: 'Docs',
                href: '/start/introduction',
              },
              // {
              //   label: 'Server',
              //   href: '/server',
              {
                label:'Providers',
                href: '/providers/daytona'
              },
              {
                label:'Frameworks',
                href: '/frameworks/next'
              },
              {
                label:'SDK Reference',
                href: '/reference/'
              },
            ],
             })],
          social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/computesdk/computesdk' }],
          sidebar: [
              { label: 'Examples', link: 'https://github.com/computesdk/computesdk/tree/main/examples', attrs: { target: '_blank' } },
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
                  autogenerate: { directory: 'reference' },
              },
          ],
      }),
	],

  vite: {
    plugins: [tailwindcss()],
  },
});