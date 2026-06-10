const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');

// Replace "</button>" with "</Button>" when it follows a "<Button" block
// In React, standard shadcn <Button> should be closed with </Button>
// Let's do a replace of all "</button>" with "</Button>" first, because we don't have standard HTML <button> in this file, we only use shadcn <Button>!
// Wait! Let's check if there are any standard HTML <button> tags.
// Let's check the matches
const matches = content.match(/<\/button>/g);
console.log(`Found ${matches ? matches.length : 0} occurrences of </button>`);

const updated = content.replace(/<\/button>/g, '</Button>');
fs.writeFileSync('src/pages/admin/ExportedRestaurants.tsx', updated);
console.log("Replaced </button> with </Button>.");
