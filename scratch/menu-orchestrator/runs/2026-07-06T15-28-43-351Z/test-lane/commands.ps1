$env:FF_CDP_URL="http://127.0.0.1:9331"
$env:FF_LANE_ID="test-lane"
node scratch\wait-lane-logins.cjs --lane=test-lane --port=9331 --timeout-min=1
node scratch\set-extension-lane.cjs --lane=test-lane --port=9331
node scratch\collect-menu-with-extension-verification.mjs --ids-file="C:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\scratch\menu-orchestrator\runs\2026-07-06T15-28-43-351Z\test-lane\ids.txt" --lane=test-lane --limit=5 --apply
