const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../vite.config.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Variáveis locais no endpoint
content = content.replace(
  "let instagramHighlights = null;",
  "let instagramHighlights = null;\n                let instagramLogoUrl = '';\n                let instagramFeedPhotoUrl = '';\n                let bioLinkUrl = '';"
);

// 2. Parsed body extractions
content = content.replace(
  "if (parsed.instagramHighlights) {\n                      instagramHighlights = parsed.instagramHighlights;\n                    }",
  "if (parsed.instagramHighlights) {\n                      instagramHighlights = parsed.instagramHighlights;\n                    }\n                    if (parsed.instagramLogoUrl) {\n                      instagramLogoUrl = parsed.instagramLogoUrl;\n                    }\n                    if (parsed.instagramFeedPhotoUrl) {\n                      instagramFeedPhotoUrl = parsed.instagramFeedPhotoUrl;\n                    }\n                    if (parsed.bioLinkUrl) {\n                      bioLinkUrl = parsed.bioLinkUrl;\n                    }"
);

// 3. Command arguments for phase 5
content = content.replace(
  "valArgs.push(\"--google-context-file\", tempGoogleFile);\n                  }",
  "valArgs.push(\"--google-context-file\", tempGoogleFile);\n                  }\n                  if (instagramLogoUrl) {\n                    valArgs.push(\"--instagram-logo-url\", instagramLogoUrl);\n                  }\n                  if (instagramFeedPhotoUrl) {\n                    valArgs.push(\"--instagram-feed-photo-url\", instagramFeedPhotoUrl);\n                  }\n                  if (bioLinkUrl) {\n                    valArgs.push(\"--bio-link-url\", bioLinkUrl);\n                  }"
);

fs.writeFileSync(filePath, content);
console.log("vite.config.ts atualizado com sucesso!");
