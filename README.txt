BACKROOMS ONLINE
================
Needs Node.js 16 or newer (https://nodejs.org). No npm install needed.

PLAY WITH FRIENDS ON YOUR WIFI / LAN
  1. Open a terminal in this folder and run:   node server.js
  2. You open  http://localhost:3000
     Friends on the same network open  http://YOUR-PC-IP:3000
  3. Multiplayer > Create room, give friends the 4 digit code.

PLAY OVER THE INTERNET
  Upload this folder to any Node host (Render, Railway, Fly.io, a VPS...).
  Start command: node server.js   (it uses the PORT the host gives it).
  Everyone opens your site's address. HTTPS works automatically (the game uses wss://).
  If you only open index.html straight from your disk instead, type your server address in
  the "Server" box in the Multiplayer screen.

MODES (host picks in the lobby): Co-op, Online Co-op (shared entities), Teams 2v2 / 4v4, Race.
Rooms hold up to 10 players. Admin spawn tools are checked on the server too.

ITEMS (12 total) - rarity = how often it shows up on the floor
  Common     Flashlight, Medkit, Map, Almond Water (+25 HP)
  Uncommon   Energy Drink (+3s sprint), Coin Pouch (+30-80 coins), Hammer
  Rare       Adrenaline Shot (8s +30% speed, free sprint)
  Epic       Flashbang (stuns nearby entities 5s), Entity Mask (10s invisible, mask view)
  Legendary  Guardian Charm (can't be hurt 10s), Armor (+100 armor HP)
LOADOUT: bought items are kept in a stash. Open the shop (Items tab) outside a run and
press Equip on what you want to bring. You have 5 boxes and your gun uses 1.
Spawn chances live in the ODDS table near the top of index.html.

MUSIC + SFX (Settings)
  General tab > Music: Off, Fluorescent Drone, Music Box, Dark Piano, Heartbeat, Elevator
  (synthesized in the browser, plays during a run, picking one plays a short preview)
  General tab > Music Volume: Low / Medium / High
  SFX tab: every sound effect in the game with a Play button, a search box and Stop all
