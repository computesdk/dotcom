// scripts/fetchDocs.js
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// === CONFIG for computesdk/computesdk ===
const owner = "computesdk";
const repo = "computesdk";
const repoDocsPath = "docs"; // GitHub repo folder
const localDocsPath = path.resolve("src/content/docs/docs"); // Local Astro docs folder

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // required if repo is private
});

// Ensure frontmatter exists and remove duplicate title heading
function ensureFrontmatter(markdown, fileName, repoPath, orderIndex = null) {
  if (markdown.startsWith("---")) {
    return markdown; // already has frontmatter
  }

  // Use first heading if available, else fallback to filename
  const headingMatch = markdown.match(/^#\s+(.*)/m);
  const title = headingMatch ? headingMatch[1].trim() : fileName.replace(/\.md$/, "");

  // Remove the first heading from markdown content to avoid duplication
  let content = markdown;
  if (headingMatch) {
    content = markdown.replace(/^#\s+.*$/m, '').trim();
  }

  let frontmatter = `---\ntitle: "${title}"\ndescription: ""`;
  
// Add sidebar order for providers and getting-started
if ((repoPath.includes('providers') || repoPath.includes('getting-started')) && orderIndex !== null) {
  frontmatter += `\nsidebar:\n  order: ${orderIndex}`;
}
  
  frontmatter += `\n---\n\n`;
  return frontmatter + content;
}

// Recursive function to sync files
async function fetchFolder(repoPath, localPath) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: repoPath,
    ref: "main", // branch
  });

  // Sort getting-started alphabetically, but keep introduction.md first
  if (repoPath.includes('getting-started')) {
    data.sort((a, b) => {
      if (a.name === 'introduction.md') return -1;
      if (b.name === 'introduction.md') return 1;
      return a.name.localeCompare(b.name);
    });
  }
  

  // Sort providers alphabetically, but keep more.md last
  if (repoPath.includes('providers')) {
    data.sort((a, b) => {
      if (a.name === 'more.md') return 1;
      if (b.name === 'more.md') return -1;
      return a.name.localeCompare(b.name);
    });
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    if (item.type === "dir") {
      const subFolder = path.join(localPath, item.name);
      fs.mkdirSync(subFolder, { recursive: true });
      await fetchFolder(item.path, subFolder);
    }

    if (item.type === "file" && item.name.endsWith(".md")) {
      const response = await fetch(item.download_url);
      let markdown = await response.text();

      let orderIndex = null;

      if (repoPath.includes('getting-started')) {
        // introduction.md = 1, others follow alphabetical order from your earlier sort
        orderIndex = item.name === 'introduction.md' ? 1 : i + 1;
      }
      
      if (repoPath.includes('providers')) {
        // alphabetical from earlier sort, but more.md last (give it a high order)
        orderIndex = item.name === 'more.md' ? 30 : i + 1;
      }
      
      // Ensure Astro frontmatter exists
      markdown = ensureFrontmatter(markdown, item.name, item.path, orderIndex);

      const outPath = path.join(localPath, item.name);
      fs.writeFileSync(outPath, markdown, "utf-8");
      console.log(`📄 Synced: ${item.path}`);
    }
  }
}

async function main() {
  // 1. Remove existing docs folder
  if (fs.existsSync(localDocsPath)) {
    fs.rmSync(localDocsPath, { recursive: true, force: true });
    console.log("🗑️ Removed old docs");
  }

  // 2. Recreate docs folder
  fs.mkdirSync(localDocsPath, { recursive: true });

  // 3. Fetch fresh docs
  await fetchFolder(repoDocsPath, localDocsPath);

  console.log("🎉 Docs synced successfully from GitHub (with frontmatter)!");

  // Build site to update llm.txt files
  console.log("🔧 Building site to update llm.txt files...");
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log("✅ Site built successfully! llm.txt files updated.");
  } catch (buildError) {
    console.warn("⚠️ Build failed, but docs were synced:", buildError.message);
  }
}

main().catch(err => {
  console.error("❌ Error syncing docs:", err);
  process.exit(1);
});
