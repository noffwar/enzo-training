const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

const regex = /    const viewDeps = \{[\s\S]*?const LoginView = createLoginView\(viewDeps\);/m;
const match = html.match(regex);

if (match) {
  const block = match[0];
  html = html.replace(block, ''); // Remove from original position

  // Re-insert before const App
  html = html.replace('    const App = () => {', block + '\n\n    const App = () => {');
  
  fs.writeFileSync('index.html', html, 'utf-8');
  console.log('Moved viewDeps successfully!');
} else {
  console.log('viewDeps block not found.');
}
