import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('diga ao auditor que esse chat')) {
      try {
        const obj = JSON.parse(line);
        // Find content
        let content = obj.content || '';
        // Extract the svg tag
        const start = content.indexOf('<svg');
        const end = content.lastIndexOf('</svg>') + 6;
        if (start !== -1 && end !== -1) {
          const svg = content.substring(start, end);
          fs.writeFileSync('scratch/mockup_chat.svg', svg);
          console.log('Successfully saved to scratch/mockup_chat.svg');
        } else {
          fs.writeFileSync('scratch/mockup_chat_content.txt', content);
          console.log('No SVG tag found, saved full content to scratch/mockup_chat_content.txt');
        }
      } catch (err) {
        console.error('Error parsing line:', err);
      }
      break;
    }
  }
}

main().catch(console.error);
