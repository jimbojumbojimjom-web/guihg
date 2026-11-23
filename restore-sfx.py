# Puts all the sound-effect clips back into index.html (run: python3 restore-sfx.py)
import re
s=open('index.html',encoding='utf8').read()
block=open('sfx-backup/sfx-block.js',encoding='utf8').read().rstrip('\n')
s=re.sub(r"/\*SFX_REMOVED:.*?\*/const SFXU=\{\},SFXA=\{\};const SFX_MUTED=true; /\*SFX_MUTED_FLAG\*/",lambda m:block,s,count=1,flags=re.S)
s=s.replace("  if(SFX_MUTED)return null; /*SFX_MUTED_FLAG*/\n","")
open('index.html','w',encoding='utf8').write(s)
print('restored')
