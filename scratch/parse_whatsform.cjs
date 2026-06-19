const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'whatsform.html');
if (!fs.existsSync(htmlPath)) {
  console.error('whatsform.html not found!');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf-8');

// Use regex to extract window.wfForm = <json>;
const match = html.match(/window\.wfForm\s*=\s*(\{[\s\S]+?\});\s*\n/);
if (match) {
  try {
    const jsonStr = match[1];
    const data = JSON.parse(jsonStr);
    console.log('Successfully parsed window.wfForm!');
    console.log('Form Name:', data.name);
    console.log('Questions Count:', data.formQuestions ? data.formQuestions.length : 0);
    
    // Save to file
    fs.writeFileSync(path.join(__dirname, 'whatsform_parsed.json'), JSON.stringify(data, null, 2), 'utf-8');
    console.log('Saved whatsform_parsed.json');
  } catch (err) {
    console.error('Failed to parse JSON:', err.message);
  }
} else {
  console.error('Could not find window.wfForm in HTML!');
}
