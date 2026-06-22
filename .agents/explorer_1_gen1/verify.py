import re
from html.parser import HTMLParser

class InstagramBioParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current_tag = None
        self.in_button = False
        self.in_span = False
        self.button_text = []
        self.links = []
        self.buttons = []
        
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        attrs_dict = dict(attrs)
        
        if tag == 'a':
            href = attrs_dict.get('href', '')
            self.links.append({'href': href, 'text': ''})
        elif tag == 'button':
            self.in_button = True
            self.buttons.append({'text': '', 'attrs': attrs_dict})
            
    def handle_endtag(self, tag):
        if tag == 'button':
            self.in_button = False
            
    def handle_data(self, data):
        if self.current_tag == 'a' and self.links:
            self.links[-1]['text'] += data
        if self.in_button and self.buttons:
            self.buttons[-1]['text'] += data

# Load HTML
html_path = r"c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\scratch\alain_bio.html"
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

parser = InstagramBioParser()
parser.feed(html_content)

print("--- EXAMINING LINKS (<a> tags) ---")
for link in parser.links:
    print(f"Href: {link['href']}, Text: {link['text'].strip()}")

print("\n--- EXAMINING BUTTONS ---")
for btn in parser.buttons:
    print(f"Text: {btn['text'].strip()}, Attrs: {btn['attrs']}")

# Apply current/existing logic check
print("\n--- APPLYING ORIGINAL LOGIC ---")
target_keywords = ['linktr.ee', 'bio.link', 'goomer', 'anota.ai', 'livemenu', 'saipos', 'wa.me', 'ola.menu']
found_by_orig = False
for link in parser.links:
    href = link['href']
    if any(kw in href for kw in target_keywords):
        print(f"SUCCESS (Original): Found {href}")
        found_by_orig = True
        break
if not found_by_orig:
    print("FAILED (Original): No matching link found in <a> tags.")

# Apply proposed logic check
print("\n--- APPLYING PROPOSED FALLBACK LOGIC (Text Parsing) ---")
found_by_proposed = False
for btn in parser.buttons:
    text = btn['text']
    # Check if target domain/keyword matches in text
    if any(kw in text for kw in target_keywords):
        print(f"Found button with matching keyword in text: '{text}'")
        # Extract domain using regex
        domain_match = re.search(r'([a-z0-9-]+\.[a-z0-9-.]+)', text, re.IGNORECASE)
        if domain_match:
            domain = domain_match.group(1).split(' ')[0]
            url = f"https://{domain}"
            print(f"SUCCESS (Proposed Text Fallback): Extracted URL -> {url}")
            found_by_proposed = True
            break

if not found_by_proposed:
    print("FAILED (Proposed Fallback): No matching URL extracted from buttons.")
