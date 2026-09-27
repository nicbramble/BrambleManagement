"""Optional asset preparation: python3 scripts/prepare-assets.py (requires Pillow)."""
import json, textwrap
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
resources=json.loads((ROOT/'data/resources.json').read_text())
assets=ROOT/'assets'; (assets/'optimized').mkdir(exist_ok=True); (assets/'social').mkdir(exist_ok=True)
font_path='/System/Library/Fonts/Helvetica.ttc'
def font(size):
    try: return ImageFont.truetype(font_path,size)
    except OSError: return ImageFont.load_default(size=size)
manifest={}
for rel in sorted(set(['/assets/nic-bramble.jpg']+[r['image_url'] for r in resources if r.get('image_url','').startswith('/assets/')])):
    source=ROOT/rel.lstrip('/')
    if not source.exists(): continue
    image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    stem=source.stem
    sizes=[]
    for width in [160,400,800]:
        copy=image.copy();copy.thumbnail((width,width));dest=f'/assets/optimized/{stem}-{width}.webp';copy.save(ROOT/dest.lstrip('/'),'WEBP',quality=82);sizes.append({'url':dest,'width':copy.width})
    manifest[rel]=sizes
(ROOT/'data/asset-variants.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'asset-variants.js').write_text('window.BRAMBLE_ASSET_VARIANTS = '+json.dumps(manifest)+';\n')
# Original artwork is reused without changing its meaning. Cards use native text.
for item in [{'slug':'home','title':'Useful systems. Free resources.','category':'PROMPTS · PLAYBOOKS · PRACTICAL BREAKDOWNS'}]+resources:
    card=Image.new('RGB',(1200,630),'#f4efe5');d=ImageDraw.Draw(card);d.rectangle((0,0,16,630),fill='#e75836')
    d.text((58,48),'NIC.BUILDZ',font=font(33),fill='#171512');d.text((58,125),item['category'].upper(),font=font(21),fill='#b7351e')
    words=item['title'].split();lines=[];line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if d.textbbox((0,0),candidate,font=font(58))[2]>690 and line: lines.append(line);line=word
        else: line=candidate
    if line: lines.append(line)
    for i,line in enumerate(lines[:5]): d.text((58,192+i*67),line,font=font(58),fill='#171512')
    d.text((58,561),'GET SOMETHING USEFUL',font=font(21),fill='#b7351e')
    d.line((348,580,365,563),fill='#b7351e',width=3);d.line((351,563,365,563,365,577),fill='#b7351e',width=3)
    src=ROOT/item.get('image_url','/assets/nic-bramble.jpg').lstrip('/')
    if src.exists():
        im=ImageOps.fit(ImageOps.exif_transpose(Image.open(src)).convert('RGB'),(330,420));card.paste(im,(826,151))
    destination=assets/'social-preview.jpg' if item['slug']=='home' else assets/'social'/f"{item['slug']}.jpg"
    card.save(destination,quality=88,optimize=True)
icon=Image.new('RGB',(180,180),'#171512');d=ImageDraw.Draw(icon);d.text((21,37),'NB',font=font(92),fill='#f4efe5');d.rectangle((20,148,160,156),fill='#e75836');icon.save(assets/'touch-icon.png')
