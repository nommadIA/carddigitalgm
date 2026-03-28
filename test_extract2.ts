import fs from 'fs';

const filePath = 'mobile_view.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const extractSection = (regex: RegExp) => {
  const match = content.match(regex);
  return match ? match[1] : 'NOT FOUND';
};

const s0 = extractSection(/\{index === 0 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s1 = extractSection(/\{index === 1 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s2 = extractSection(/\{index === 2 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s3 = extractSection(/\{index === 3 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s4 = extractSection(/\{index === 4 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s5 = extractSection(/\{index === 5 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
const s6 = extractSection(/\{index === 6 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);

console.log('s0:', s0.length);
console.log('s1:', s1.length);
console.log('s2:', s2.length);
console.log('s3:', s3.length);
console.log('s4:', s4.length);
console.log('s5:', s5.length);
console.log('s6:', s6.length);
