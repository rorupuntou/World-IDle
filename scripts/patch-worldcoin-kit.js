const fs = require('fs');
const path = require('path');

const tailwindJsPath = path.resolve(__dirname, '../node_modules/@worldcoin/mini-apps-ui-kit-react/dist/tailwind.js');
const tailwindDir = path.resolve(__dirname, '../node_modules/@worldcoin/mini-apps-ui-kit-react/dist/tailwind');
const newTailwindJsPath = path.resolve(tailwindDir, 'index.js');

if (fs.existsSync(tailwindJsPath)) {
  if (!fs.existsSync(tailwindDir)) {
    fs.mkdirSync(tailwindDir, { recursive: true });
  }
  let content = fs.readFileSync(tailwindJsPath, 'utf8');
  content = content.replace('import plugin from "./_virtual/plugin.js";', 'import plugin from "../_virtual/plugin.js";');
  fs.writeFileSync(newTailwindJsPath, content);
  console.log('Successfully patched @worldcoin/mini-apps-ui-kit-react');
}
