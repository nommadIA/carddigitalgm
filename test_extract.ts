import fs from 'fs';

const filePath = 'mobile_view.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const extractSection = (regex: RegExp) => {
  const match = content.match(regex);
  return match ? match[1] : 'NOT FOUND';
};

const personalizacao = extractSection(/\{index === 0 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);

console.log(personalizacao.substring(0, 100) + '...');
console.log('Length:', personalizacao.length);
