"""Bake seamless surface maps without requiring an installed art application."""
import math
from pathlib import Path
from PIL import Image

OUT=Path(__file__).resolve().parents[1]/'src/assets/blender'
OUT.mkdir(parents=True,exist_ok=True)
SIZE=512
images={name:Image.new('RGB',(SIZE,SIZE)) for name in ['wood-color','wood-height','earth-height','stone-height']}
pixels={name:image.load() for name,image in images.items()}

def noise(x,y,period):
    ix,iy=math.floor(x),math.floor(y)
    fx,fy=x-ix,y-iy
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
    def hash(a,b):
        n=((a%period)*374761393+(b%period)*668265263)&0xffffffff
        n=((n^(n>>13))*1274126177)&0xffffffff
        return (n^(n>>16))/4294967295
    return ((1-fx)*hash(ix,iy)+fx*hash(ix+1,iy))*(1-fy)+((1-fx)*hash(ix,iy+1)+fx*hash(ix+1,iy+1))*fy

for y in range(SIZE):
    v=y/SIZE*math.tau
    for x in range(SIZE):
        u=x/SIZE*math.tau
        mineral=sum(noise(x/SIZE*p,y/SIZE*p,p)*w for p,w in [(8,.5),(32,.28),(128,.16),(256,.06)])
        grain=(.5+.5*math.sin(u*37+math.sin(v)*2+math.sin(u*3)*3))**9
        fine=.5+.5*math.sin(u*119+math.sin(v*2)*1.5)
        tone=.76-grain*.24+fine*.025
        pixels['wood-color'][x,y]=tuple(round(255*tone*c) for c in [1,.78,.56])
        height=round(255*(.65-grain*.28+fine*.035))
        pixels['wood-height'][x,y]=(height,)*3
        pixels['earth-height'][x,y]=(round(255*mineral),)*3
        pixels['stone-height'][x,y]=(round(255*(.3+mineral*.65)),)*3
for name,image in images.items():
    image.save(OUT/(name+'.png'),optimize=True)
print('Baked four seamless surface maps.')
