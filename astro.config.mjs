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
        title: 'Compute',
		    favicon: './src/assets/hv_main_logo_light.svg',	
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
                href: '/guides/getting-started',
              },
              {
                label: 'Server',
                href: '/server',
              },
            ],
            })],
          social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
          sidebar: [
              {
                  label: 'Guides',
                  items: [
                      // Each item here is one entry in the navigation menu.
                      { label: 'Example Guide', slug: 'guides/example' },
                  ],
              },
              {
                  label: 'Reference',
                  autogenerate: { directory: 'reference' },
              },
          ],
      }),
	],

  vite: {
    plugins: [tailwindcss()],
  },
});