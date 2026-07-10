from http.server import BaseHTTPRequestHandler
import os, json, random, datetime, urllib.request

class handler(BaseHTTPRequestHandler):
    def do_get(self):
        url = os.environ.get("WEBHOOK_URL")
        # nếu chưa add webhook thì vẫn trả về OK để Vercel không báo lỗi
        if url:
            try:
                seeds = ["Dragon Fruit","Cherry","Moon Bloom","Poison Apple","Candy Blossom"]
                name = random.choice(seeds)
                data = {
                    "embeds": [{
                        "title": f"[RESTOCK TEST] {datetime.datetime.now().strftime('%H:%M')}",
                        "description": f"**{name}** - Test tu Vercel - Da Fix Loi 500 OK!",
                        "color": 0x00ff88
                    }]
                }
                req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
                urllib.request.urlopen(req, timeout=10)
            except Exception as e:
                pass

        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        self.wfile.write(b'OK - Bot is running')
        return