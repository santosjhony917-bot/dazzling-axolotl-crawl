import fs from 'fs';

const data = fs.readFileSync('C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\.system_generated\\logs\\transcript.jsonl', 'utf8');

// Find step 10113
const index = data.indexOf('"step_index":10113');
if (index === -1) {
  console.log('Step 10113 not found');
} else {
  console.log('Found step 10113 at index', index);
  // Get content around it, say 1,000,000 characters
  const chunk = data.substring(index, index + 800000);
  
  // Find "content" value
  const contentStart = chunk.indexOf('"content":"');
  if (contentStart !== -1) {
    // Let's find the closing quote of "content"
    // Since it's a JSON string, we should parse it or extract it.
    // Let's parse the JSON block
    const lineStart = data.lastIndexOf('\n', index);
    let lineEnd = data.indexOf('\n', index);
    if (lineEnd === -1) lineEnd = data.length;
    
    const line = data.substring(lineStart + 1, lineEnd);
    try {
      const obj = JSON.parse(line);
      const content = obj.content;
      console.log('Content length:', content.length);
      fs.writeFileSync('scratch/user_request_10113.txt', content);
      
      const svgStart = content.indexOf('<svg');
      const svgEnd = content.lastIndexOf('</svg>');
      if (svgStart !== -1 && svgEnd !== -1) {
        const svg = content.substring(svgStart, svgEnd + 6);
        fs.writeFileSync('scratch/mockup_chat.svg', svg);
        console.log('Saved SVG of length', svg.length);
      } else {
        console.log('SVG not found in content');
      }
    } catch (err) {
      console.error('Error parsing JSON line:', err);
    }
  }
}
