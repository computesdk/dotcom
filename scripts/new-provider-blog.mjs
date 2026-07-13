// scripts/new-provider-blog.mjs
//
// Scaffolds a new "How to run a <Provider> sandbox" post from
// src/content/blog/_template-provider-sandbox.md.
//
// Usage:
//   npm run new-blog-post -- --config scripts/provider-posts/railway.json
//   npm run new-blog-post            (interactive prompts)
//
// A JSON config looks like:
// {
//   "name": "Railway",
//   "slug": "railway",
//   "factory": "railway",
//   "website": "https://railway.com",
//   "description": "Railway is a cloud platform for deploying and running applications and infrastructure.",
//   "why": [
//     "Railway provides ephemeral sandboxes backed by its existing deploy infrastructure.",
//     "They offer simple, predictable pricing for compute.",
//     "Railway sandboxes are easy to network alongside services you already run there."
//   ],
//   "envVars": [{ "name": "RAILWAY_API_TOKEN", "placeholder": "your_railway_api_token" }],
//   "configFields": [{ "field": "token", "envVar": "RAILWAY_API_TOKEN" }],
//   "accountSteps": "Once you have created an account, create a token at Account Settings -> Tokens.",
//   "dashboardName": "Railway dashboard",
//   "otherProvider1": { "name": "E2B", "slug": "e2b" },
//   "otherProvider2": { "name": "Daytona", "slug": "daytona" },
//   "allowedHostsDomain": ".railway.app",
//   "previewUrlNote": "The URL returned is Railway's own preview domain for the sandbox.",
//   "needsPorts": false,
//   "supportsFilesystem": true,
//   "supportsGetUrl": true
// }
//
// If supportsFilesystem or supportsGetUrl is false, this script swaps the
// "Making changes within the sandbox" + "Testing Vite app inside sandbox"
// sections for a short callout instead of code that would throw at runtime.
// Always read computesdk/docs/providers/<slug>.md yourself before publishing
// — this script fills in what you tell it, it doesn't fact-check you.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'src/content/blog/_template-provider-sandbox.md');

const UNSUPPORTED_SECTION = (name) => `## A note on this provider's sandbox

${name} sandboxes don't currently support both filesystem operations and exposed preview URLs through ComputeSDK. That means the writeFile + getUrl + "view it in your browser" workflow the other provider guides use doesn't apply here as written.

You can still use \`runCommand\` for everything else — installing dependencies, running builds, executing scripts, checking process output. Confirm the current support matrix for this provider at [computesdk/docs/providers/${'{{PROVIDER_SLUG}}'}.md](https://docs.computesdk.com) before designing a demo around filesystem or preview-URL access.

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a {{PROVIDER_NAME}} sandbox with ComputeSDK
- used our runCommand method (this works with every provider)

ComputeSDK makes it easy to standardize this process across providers.\\
So now that you've written this code for {{PROVIDER_NAME}}, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\\
Want to be added as a provider?\\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
`;

async function promptForConfig() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => rl.question(q);

  const name = await ask('Provider display name (e.g. Railway): ');
  const slug = await ask('Provider slug / npm package suffix (e.g. railway): ');
  const factory = (await ask(`Factory function name [${slug}]: `)) || slug;
  const website = await ask('Provider signup URL: ');
  const description = await ask('One-line "what is this provider" description: ');
  const why1 = await ask('Why bullet 1: ');
  const why2 = await ask('Why bullet 2: ');
  const why3 = await ask('Why bullet 3: ');
  const envVarsRaw = await ask('Required env vars, comma-separated (e.g. RAILWAY_API_TOKEN,RAILWAY_ENVIRONMENT_ID): ');
  const envVars = envVarsRaw.split(',').map((v) => v.trim()).filter(Boolean).map((v) => ({
    name: v,
    placeholder: `your_${v.toLowerCase()}`,
  }));
  const configFieldsRaw = await ask('Config field:envVar pairs, comma-separated (e.g. token:RAILWAY_API_TOKEN): ');
  const configFields = configFieldsRaw.split(',').map((v) => v.trim()).filter(Boolean).map((pair) => {
    const [field, envVar] = pair.split(':').map((s) => s.trim());
    return { field, envVar };
  });
  const accountSteps = await ask('Prose: where to find/create the API key: ');
  const dashboardName = await ask(`Dashboard name [${name} dashboard]: `) || `${name} dashboard`;
  const other1Name = await ask('Other provider example #1 name (e.g. E2B): ');
  const other1Slug = await ask('Other provider example #1 slug (e.g. e2b): ');
  const other2Name = await ask('Other provider example #2 name (e.g. Daytona): ');
  const other2Slug = await ask('Other provider example #2 slug (e.g. daytona): ');
  const allowedHostsDomain = await ask('allowedHosts domain suffix (e.g. .railway.app): ');
  const previewUrlNote = await ask('Accurate note describing the preview URL domain behavior: ');
  const needsPorts = (await ask('Does this provider require ports declared at create() time? (y/N): ')).toLowerCase() === 'y';
  const supportsFilesystem = (await ask('Does this provider support filesystem operations? (Y/n): ')).toLowerCase() !== 'n';
  const supportsGetUrl = (await ask('Does this provider support getUrl()? (Y/n): ')).toLowerCase() !== 'n';

  rl.close();

  return {
    name, slug, factory, website, description,
    why: [why1, why2, why3],
    envVars, configFields, accountSteps, dashboardName,
    otherProvider1: { name: other1Name, slug: other1Slug },
    otherProvider2: { name: other2Name, slug: other2Slug },
    allowedHostsDomain, previewUrlNote, needsPorts, supportsFilesystem, supportsGetUrl,
  };
}

function render(template, config) {
  const date = new Date().toISOString().slice(0, 10);
  const envVarsBlock = config.envVars.map((v) => `${v.name}=${v.placeholder}`).join('\n');
  const configBlock = config.configFields.map((f) => `  ${f.field}: process.env.${f.envVar},`).join('\n');
  const createOptions = config.needsPorts ? '{ ports: [5173] }' : '';

  let out = template
    .replace(/\{\{PROVIDER_NAME\}\}/g, config.name)
    .replace(/\{\{PROVIDER_SLUG\}\}/g, config.slug)
    .replace(/\{\{PROVIDER_FACTORY\}\}/g, config.factory)
    .replace(/\{\{PROVIDER_WEBSITE\}\}/g, config.website)
    .replace(/\{\{PROVIDER_DESCRIPTION\}\}/g, config.description)
    .replace(/\{\{WHY_BULLET_1\}\}/g, config.why[0])
    .replace(/\{\{WHY_BULLET_2\}\}/g, config.why[1])
    .replace(/\{\{WHY_BULLET_3\}\}/g, config.why[2])
    .replace(/\{\{ENV_VARS_BLOCK\}\}/g, envVarsBlock)
    .replace(/\{\{ACCOUNT_STEPS\}\}/g, config.accountSteps)
    .replace(/\{\{CONFIG_BLOCK\}\}/g, configBlock)
    .replace(/\{\{DASHBOARD_NAME\}\}/g, config.dashboardName)
    .replace(/\{\{OTHER_PROVIDER_1\}\}/g, config.otherProvider1.name)
    .replace(/\{\{OTHER_PROVIDER_1_SLUG\}\}/g, config.otherProvider1.slug)
    .replace(/\{\{OTHER_PROVIDER_2\}\}/g, config.otherProvider2.name)
    .replace(/\{\{ALLOWED_HOSTS_DOMAIN\}\}/g, config.allowedHostsDomain)
    .replace(/\{\{PREVIEW_URL_NOTE\}\}/g, config.previewUrlNote)
    .replace(/\{\{CREATE_OPTIONS\}\}/g, createOptions)
    .replace(/\{\{DATE\}\}/g, date);

  // Strip the template's leading HTML-comment authoring instructions.
  out = out.replace(/^<!--[\s\S]*?-->\n/, '');

  if (!config.supportsFilesystem || !config.supportsGetUrl) {
    out = out.replace(
      /## Making changes within the sandbox[\s\S]*$/,
      UNSUPPORTED_SECTION(config.name).replace(/\{\{PROVIDER_NAME\}\}/g, config.name).replace(/\{\{PROVIDER_SLUG\}\}/g, config.slug)
    );

    // Don't promise methods this provider doesn't actually support in the
    // "switch providers" blurb that appears earlier in the post.
    const supportedMethods = ['`runCommand`'];
    if (config.supportsFilesystem) supportedMethods.push('`filesystem`');
    if (config.supportsGetUrl) supportedMethods.push('`getUrl`');
    out = out.replace(
      /The rest of your code \(`runCommand`, `filesystem`, `getUrl`\) stays the same/,
      `The rest of your code (${supportedMethods.join(', ')}) stays the same`
    );
  }

  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const configFlagIndex = args.indexOf('--config');

  let config;
  if (configFlagIndex !== -1 && args[configFlagIndex + 1]) {
    const configPath = path.resolve(process.cwd(), args[configFlagIndex + 1]);
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    config = await promptForConfig();
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const rendered = render(template, config);

  const outPath = path.join(ROOT, 'src/content/blog', `how-to-run-a-${config.slug}-sandbox.md`);
  if (fs.existsSync(outPath)) {
    console.error(`Refusing to overwrite existing post: ${outPath}`);
    process.exit(1);
  }

  fs.writeFileSync(outPath, rendered, 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log(`Next steps:`);
  console.log(`  1. Verify getUrl()/filesystem/ports behavior against computesdk/docs/providers/${config.slug}.md and packages/${config.slug}/src/index.ts.`);
  console.log(`  2. Add screenshots under public/blog/${config.slug}/ (naming: ${config.slug}-<what-it-shows>-screenshot.png).`);
  console.log(`  3. Read through the generated post once end-to-end before publishing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
