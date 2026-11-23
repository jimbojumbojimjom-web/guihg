// Backrooms online server. No dependencies: just run  node server.js
// Serves the game at / and relays multiplayer over a WebSocket at /ws (rooms of up to 10, 4-digit codes).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,MAXP=10,GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const HTML=path.join(__dirname,'index.html');

const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url.startsWith('/?')||req.url==='/index.html'){
    fs.readFile(HTML,(e,b)=>{if(e){res.writeHead(500);res.end('index.html missing');return}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(b)});
  }else if(req.url==='/health'){res.writeHead(200);res.end('ok')}
  else{res.writeHead(404);res.end('Not found')}
});

/* ---------- minimal RFC 6455 websocket ---------- */
function frame(op,data){const p=Buffer.isBuffer(data)?data:Buffer.from(data),n=p.length;let h;
  if(n<126)h=Buffer.from([0x80|op,n]);else if(n<65536){h=Buffer.alloc(4);h[0]=0x80|op;h[1]=126;h.writeUInt16BE(n,2)}
  else{h=Buffer.alloc(10);h[0]=0x80|op;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}return Buffer.concat([h,p])}
class Sock{constructor(s){this.s=s;this.buf=Buffer.alloc(0);this.open=true;this.alive=true;this.onmsg=()=>{};this.onclose=()=>{};
  s.on('data',d=>{this.buf=Buffer.concat([this.buf,d]);if(this.buf.length>200000){this.kill();return}this.parse()});
  s.on('close',()=>this.kill());s.on('error',()=>this.kill())}
 parse(){for(;;){const b=this.buf;if(b.length<2)return;const op=b[0]&15,masked=!!(b[1]&128);let len=b[1]&127,o=2;
   if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);o=4}else if(len===127){this.kill();return}
   if(len>65536||!masked){this.kill();return}if(b.length<o+4+len)return;
   const mk=b.slice(o,o+4),pl=Buffer.from(b.slice(o+4,o+4+len));for(let i=0;i<len;i++)pl[i]^=mk[i&3];this.buf=b.slice(o+4+len);
   if(op===8){this.kill();return}else if(op===9)this.raw(frame(10,pl));else if(op===10)this.alive=true;else if(op===1)this.onmsg(pl.toString('utf8'))}}
 raw(b){if(this.open)try{this.s.write(b)}catch(e){}}
 send(o){this.raw(frame(1,JSON.stringify(o)))}
 kill(){if(!this.open)return;this.open=false;try{this.s.destroy()}catch(e){}this.onclose()}}
server.on('upgrade',(req,socket)=>{
  if(req.url.split('?')[0]!=='/ws'||!req.headers['sec-websocket-key']){socket.destroy();return}
  const acc=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  socket.setNoDelay(true);handle(new Sock(socket))});
setInterval(()=>{for(const r of rooms.values())for(const c of r.c.values()){if(!c.ws.alive){c.ws.kill();continue}c.ws.alive=false;c.ws.raw(frame(9,Buffer.alloc(0)))}},25000);

/* ---------- rooms ---------- */
const rooms=new Map();
const clean=n=>String(n==null?'':n).replace(/[^\p{L}\p{N} _.\-!?]/gu,'').trim().slice(0,14)||'Player';
const col=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c.toLowerCase():'#e2d17d';
const int=(v,a,b)=>Math.max(a,Math.min(b,v|0));
const num=(v,a,b,d=0)=>{v=+v;return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d};
// same hash the game uses for the admin password, so only the admin can spawn entities on people
const h53=(s,seed=0)=>{let a=0xdeadbeef^seed,b=0x41c6ce57^seed;for(let i=0,c;i<s.length;i++){c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}
  a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return 4294967296*(2097151&b)+(a>>>0)};
const ADMIN=8126508826356420;
const roster=r=>{const l=[...r.c.entries()].map(([id,c])=>({id,n:c.n,c:c.c}));for(const c of r.c.values())c.ws.send({t:'roster',list:l})};
const others=(r,id,o)=>{for(const [i,c] of r.c)if(i!==id)c.ws.send(o)};

function handle(ws){
  let room=null,id=-1;
  const leave=()=>{if(!room)return;const r=room;room=null;r.c.delete(id);
    if(id===0){for(const c of r.c.values())c.ws.send({t:'closed'});rooms.delete(r.code)}
    else{roster(r);if(!r.c.size)rooms.delete(r.code)}};
  ws.onclose=leave;
  ws.onmsg=raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}if(!m||typeof m.t!=='string')return;
    if(m.t==='host'&&!room){let code;for(let k=0;k<200;k++){const c=String(1000+Math.floor(Math.random()*9000));if(!rooms.has(c)){code=c;break}}
      if(!code){ws.send({t:'err',m:'No free room codes right now.'});return}
      room={code,c:new Map(),started:false};rooms.set(code,room);id=0;room.c.set(0,{ws,n:clean(m.n),c:col(m.c)});
      ws.send({t:'hosted',code,id:0});roster(room);return}
    if(m.t==='join'&&!room){const r=rooms.get(String(m.code));
      if(!r){ws.send({t:'err',m:'No room with that code.'});return}
      if(r.c.size>=MAXP){ws.send({t:'err',m:'That room is full ('+MAXP+' players).'});return}
      if(r.started){ws.send({t:'err',m:'That game already started.'});return}
      let n=1;while(r.c.has(n))n++;room=r;id=n;r.c.set(id,{ws,n:clean(m.n),c:col(m.c)});
      ws.send({t:'joined',code:r.code,id});roster(r);return}
    if(!room)return;
    switch(m.t){
      case 'start':if(id!==0||!m.cfg||typeof m.cfg!=='object')return;room.started=true;
        others(room,0,{t:'start',seed:(+m.seed)>>>0,mode:m.mode==='race'?'race':'coop',cfg:{mz:int(m.cfg.mz,0,2),sz:int(m.cfg.sz,0,2),coin:int(m.cfg.coin,0,2),gm:String(m.cfg.gm||'coop').slice(0,8),ts:int(m.cfg.ts,2,4)}});break;
      case 'p':others(room,id,{t:'p',id,x:num(m.x,-1e4,1e4),y:num(m.y,-1e4,1e4),r:num(m.r,-100,100),c:num(m.c,0,1)});break;
      case 'shot':others(room,id,{t:'shot',id,x:num(m.x,-1e4,1e4),y:num(m.y,-1e4,1e4),dx:num(m.dx,-1,1),dz:num(m.dz,-1,1),d:num(m.d,0,120,20)});break;
      case 'ev':others(room,id,{t:'ev',id,e:m.e==='dead'?'dead':'win'});break;
      // shared / team entities: host sends snapshots, teammates send hits back
      case 'ms':if(!Array.isArray(m.m)||m.m.length>3)return;others(room,id,{t:'ms',id,f:id,g:int(m.g,-1,9),m:m.m.map(a=>Array.isArray(a)?a.slice(0,9).map(v=>num(v,-1e5,1e5)):[0,0,0,0,0,0,0,0])});break;
      case 'mh':{const to=int(m.to,0,99),c=room.c.get(to);if(c&&to!==id)c.ws.send({t:'mh',id,f:id,to,i:int(m.i,0,2),d:num(m.d,0,3000),st:num(m.st,0,4),r:m.r?1:0});break}
      // admin gives/takes coins, free upgrades, medkits, flashlight or a gun on a chosen player (password checked here)
      case 'agive':{if(h53(String(m.pw||''))!==ADMIN)return;const c=room.c.get(int(m.to,0,99)),W=['coins','upg','med','fl','gun'];
        const me=room.c.get(id);if(c&&W.includes(m.what))c.ws.send({t:'agive',what:m.what,n:int(m.n,-999999999,999999999),gi:int(m.gi,0,200),from:me?me.n:'Admin'});break}
      case 'admin':{if(h53(String(m.pw||''))!==ADMIN)return;const c=room.c.get(int(m.to,0,99));if(c)c.ws.send({t:'admin',type:int(m.type,0,2),name:clean(m.name)});break}
    }};
}
server.listen(PORT,()=>console.log('Backrooms online: http://localhost:'+PORT+'  (players open this address, no setup needed)'));
