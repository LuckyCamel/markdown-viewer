const path = require('path');
const fs = require('fs');
const { _electron: electron } = require('@playwright/test');

async function testApp(desc, content) {
  const appPath = path.join(__dirname, 'src/renderer/App.tsx');
  fs.writeFileSync(appPath, content);
  
  // build (skip if we can)
  require('child_process').execSync('pnpm run build 2>&1', { cwd: __dirname, stdio: 'pipe' });
  
  const electronApp = await electron.launch({ args: ['.'] });
  const page = await electronApp.firstWindow();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.waitForTimeout(3000);
  await electronApp.close();
  
  console.log(`${desc}: ${errors.length === 0 ? 'PASS' : 'FAIL ' + errors[0]}`);
  return errors.length === 0;
}

async function main() {
  // Clean slate - no feature imports, just placeholder divs
  const base = fs.readFileSync(path.join(__dirname, 'src/renderer/App.testA.tsx'), 'utf-8').replace('//REMOVED', '');
  
  // Test: add ALL imports but NO JSX references
  const allImports = `import { FileTree } from './features/file-tree/FileTree'\nimport { TabBar } from './features/tabs/TabBar'\nimport { MarkdownViewer } from './features/markdown-viewer/MarkdownViewer'\nimport { Outline } from './features/outline/Outline'\nimport { FileSearch } from './features/search/FileSearch'\nimport { ContentSearch } from './features/search/ContentSearch'\nimport { SettingsPanel } from './features/settings/SettingsPanel'`;
  const withImports = base.replace('import type { FileChangeEvent }', `${allImports}\nimport type { FileChangeEvent }`);
  await testApp('All imports, no JSX refs', withImports);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
