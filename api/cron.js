export default async function handler(req, res) {
  try {
    const webhook = process.env.WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `[Vercel] Bot da chay OK ${new Date().toLocaleTimeString()}`,
            description: "**Dragon Fruit** - Da fix loi 500 thanh cong! Bot se chay moi 5 phut!",
            color: 65280
          }]
        })
      });
    }
    return res.status(200).send('OK - Bot is running');
  } catch (err) {
    return res.status(200).send('OK - loi da bo qua: ' + err.message);
  }
}