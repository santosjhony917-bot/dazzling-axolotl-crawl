import vm from 'node:vm';

const url = 'https://cardapiodigitalmp.com.br/cardapio.php?s=vitamina-de-acai-974';
const html = await (await fetch(url)).text();
const needle = 'openItemModal(';
const pos = html.indexOf(needle);
let index = pos + needle.length;
let depth = 1;
let quote = null;
let escaped = false;

for (; index < html.length; index += 1) {
  const ch = html[index];
  if (escaped) {
    escaped = false;
    continue;
  }
  if (quote) {
    if (ch === '\\') escaped = true;
    else if (ch === quote) quote = null;
    continue;
  }
  if (ch === '"' || ch === "'") {
    quote = ch;
    continue;
  }
  if (ch === '(') depth += 1;
  else if (ch === ')') {
    depth -= 1;
    if (depth === 0) break;
  }
}

const call = html.slice(pos + needle.length, index);
console.log(JSON.stringify({
  htmlLength: html.length,
  callCount: (html.match(/openItemModal/g) || []).length,
  callStart: call.slice(0, 2500),
}, null, 2));

try {
  const value = vm.runInNewContext(`[${call}]`, Object.create(null), { timeout: 1000 });
  console.log(JSON.stringify({
    argCount: value.length,
    argTypes: value.map((item) => item && typeof item === 'object' ? Object.keys(item).slice(0, 30) : typeof item),
    valuePreview: value.slice(0, 5),
  }, null, 2));
} catch (error) {
  console.error(error.message);
}
