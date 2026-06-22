const fs = require('fs');
const content = fs.readFileSync('dist/chrome-extension/background.js', 'utf8');

// Mock chrome
global.chrome = {
  runtime: {
    onMessageExternal: {
      addListener: () => {}
    }
  }
};
global.fetch = () => {};

try {
  eval(content);
  console.log("No top-level runtime errors!");
} catch (e) {
  console.error("Top-level runtime error:", e);
}
