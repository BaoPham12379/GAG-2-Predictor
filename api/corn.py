import os, random, requests, datetime
from http.server import BaseHTTPRequestHandler
WEBHOOK=os.getenv("WEBHOOK_URL")
SEEDS=[("Dragon Fruit","Legendary"),("Cherry","Legendary"),("Poison Apple","Mythic")]
class handler(BaseHTTPRequestHandler):
 def do_get(self):
  pick=random.choice(SEEDS)
  embed={"title":f"[RESTOCK] {datetime.datetime.now().strftime('%H:%M')}","description":f"**{pick[0]}** `{pick[1]}` - In stock x1","color":0x57F287}
  if WEBHOOK: requests.post(WEBHOOK,json={"embeds":[embed]},timeout=10)
  self.send_response(200);self.end_headers();self.wfile.write(b"OK")