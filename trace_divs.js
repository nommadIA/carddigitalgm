const fs = require('fs');
const content = fs.readFileSync('/app/applet/pages/Configuracoes.tsx', 'utf8');

const lines = content.split('\n');
let stack = [];

lines.forEach((line, index) => {
  const openMatches = [...line.matchAll(/<div/g)];
  for (const match of openMatches) {
    stack.push({ type: 'div', line: index + 1 });
  }

  const closeMatches = [...line.matchAll(/<\/div>/g)];
  for (const match of closeMatches) {
    if (stack.length === 0) {
      console.log(`Extra closing div at line ${index + 1}`);
    } else {
      stack.pop();
    }
  }
});

console.log(`Remaining open tags: ${stack.length}`);
stack.forEach(tag => {
  console.log(`Unclosed ${tag.type} at line ${tag.line}`);
});
