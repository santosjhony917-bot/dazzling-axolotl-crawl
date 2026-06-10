import fs from 'fs';

const svg = fs.readFileSync('scratch/mockup_chat.svg', 'utf8');

// Find all <text> elements
const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
let match;
const textContents = [];
while ((match = textRegex.exec(svg)) !== null) {
  textContents.push(match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim());
}

console.log('--- Text elements in mockup SVG ---');
console.log(textContents.filter(t => t.length > 0).join('\n'));
console.log('----------------------------------');

// Let's also check if there are images, symbols, or fonts mentioned
console.log('SVG length:', svg.length);
