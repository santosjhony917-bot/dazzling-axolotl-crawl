const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  // Types and basic props
  { pattern: /visit_status\?\:\s*string\s*\|\s*null;/g, replace: 'is_published?: boolean;' },
  { pattern: /visit_status\?\:\s*string;/g, replace: 'is_published?: boolean;' },
  
  // Specific literal string comparisons
  { pattern: /visit_status\s*===\s*'Visitado'/g, replace: 'is_published === true' },
  { pattern: /visit_status\s*!==\s*'Visitado'/g, replace: 'is_published !== true' },
  { pattern: /visit_status\s*===\s*'Pendente'/g, replace: 'is_published === false' },
  { pattern: /visit_status\s*!==\s*'Pendente'/g, replace: 'is_published === true' },
  
  // Supabase queries
  { pattern: /\.eq\('visit_status',\s*'Visitado'\)/g, replace: ".eq('is_published', true)" },
  { pattern: /\.neq\('visit_status',\s*'Pendente'\)/g, replace: ".eq('is_published', true)" },
  
  // Hardcoded assignments
  { pattern: /visit_status:\s*'Visitado'/g, replace: 'is_published: true' },
  { pattern: /visit_status:\s*'Pendente'/g, replace: 'is_published: false' },
  { pattern: /visit_status:\s*'Interessado'/g, replace: 'is_published: false' },
  { pattern: /visit_status:\s*'Contatado'/g, replace: 'is_published: false' },
  
  // Variable replacements (best effort)
  { pattern: /visit_status/g, replace: 'is_published' },
];

walkDir(directory, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Custom fix for filters in AdminRestaurants
    if (filePath.includes('AdminRestaurants.tsx') || filePath.includes('useAdminRestaurants.ts')) {
       // Filter status string to boolean logic handled manually below
       content = content.replace(/'Visitado'/g, 'true');
       content = content.replace(/'Pendente'/g, 'false');
    }

    replacements.forEach(({ pattern, replace }) => {
      content = content.replace(pattern, replace);
    });

    if (content !== original) {
      console.log('Updated', filePath);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
