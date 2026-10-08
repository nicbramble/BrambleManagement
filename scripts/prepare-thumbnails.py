#!/usr/bin/env python3
"""Render the NIC.BUILDZ cover system. Requires Pillow >= 10; no network calls.

python3 scripts/prepare-thumbnails.py --all
python3 scripts/prepare-thumbnails.py --slug better-ai-prompts
python3 scripts/prepare-thumbnails.py --all --attach

Without --attach, resources.json is unchanged. Existing original artwork is never deleted.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, SCALE = 1200, 630, 2
CREAM, PAPER, INK, RUST, SAND, LINE = '#f4efe5', '#fbf8f1', '#171512', '#b7351e', '#e5dac8', '#c9bead'
MOTIFS = ('prompts', 'planner', 'automation', 'email-savings', 'video', 'domains', 'learning', 'swaps', 'tree', 'marketplace', 'workbook', 'travel', 'study', 'styles', 'avatar', 'meal', 'resource')
CATEGORY_ALIASES = {'Travel Smarter':'Travel', 'Study Smarter':'Study', 'Free Prompt Pack':'Creator Tools'}
CATEGORY_MOTIFS = {'AI + Automation':'automation', 'Creator Tools':'styles', 'Online Business':'domains', 'Free Printable':'workbook', 'Travel':'travel', 'Study':'study', 'Lifestyle':'meal'}


def font(size, display=False, weight=500):
    path = ROOT / 'assets/thumbnail-fonts' / ('Oswald.ttf' if display else 'DMSans.ttf')
    f = ImageFont.truetype(str(path), round(size * SCALE))
    # Explicit variable-font axes make output independent of OS font defaults.
    f.set_variation_by_axes([weight] if display else [14, weight])
    return f


class Canvas:
    def __init__(self):
        self.image = Image.new('RGB', (WIDTH*SCALE, HEIGHT*SCALE), CREAM)
        self.d = ImageDraw.Draw(self.image)

    def box(self, box, fill=PAPER, stroke=INK, width=4, radius=12):
        self.d.rounded_rectangle(tuple(round(v*SCALE) for v in box), radius=radius*SCALE, fill=fill, outline=stroke, width=width*SCALE)

    def line(self, points, color=INK, width=5):
        self.d.line([(round(x*SCALE), round(y*SCALE)) for x,y in points], fill=color, width=width*SCALE, joint='curve')

    def ellipse(self, box, fill=None, stroke=INK, width=4):
        self.d.ellipse(tuple(round(v*SCALE) for v in box), fill=fill, outline=stroke, width=width*SCALE)

    def polygon(self, points, fill=RUST, stroke=INK, width=4):
        p=[(round(x*SCALE),round(y*SCALE)) for x,y in points]
        self.d.polygon(p,fill=fill)
        if stroke: self.d.line(p+[p[0]],fill=stroke,width=width*SCALE,joint='curve')

    def text(self, pos, text, size=24, color=INK, display=False, weight=500):
        self.d.text((pos[0]*SCALE,pos[1]*SCALE),text,font=font(size,display,weight),fill=color,anchor='lt')

    def check(self, x, y, size=22, color=RUST):
        self.line([(x,y+size*.5),(x+size*.35,y+size),(x+size,y)],color,5)

    def arrow(self, start, end, color=RUST, width=5):
        self.line([start,end],color,width)
        a=math.atan2(end[1]-start[1],end[0]-start[0]); length=16
        self.line([(end[0]-length*math.cos(a-.55),end[1]-length*math.sin(a-.55)),end,(end[0]-length*math.cos(a+.55),end[1]-length*math.sin(a+.55))],color,width)

    def spark(self, x, y, r=24):
        self.line([(x-r,y),(x+r,y)],RUST,4);self.line([(x,y-r),(x,y+r)],RUST,4)
        self.line([(x-r*.65,y-r*.65),(x+r*.65,y+r*.65)],RUST,4);self.line([(x-r*.65,y+r*.65),(x+r*.65,y-r*.65)],RUST,4)


def paper(c,x,y,w=290,h=255):
    c.box((x+13,y+13,x+w+13,y+h+13),fill=SAND,stroke=None)
    c.box((x,y,x+w,y+h))


def bars(c,x,y,width=180,rows=3):
    for i in range(rows): c.line([(x,y+i*25),(x+width-(i%2)*35,y+i*25)],LINE,5)


def draw_motif(c, motif):
    # Artwork has a fixed safe area at x=650..1110, y=160..500.
    c.ellipse((680,151,1102,533),fill=SAND,stroke=None)
    if motif == 'prompts':
        for i in (2,1,0):
            x,y=704+i*27,210-i*28
            paper(c,x,y,300,245)
        for i,label in enumerate(('ROLE','CONTEXT','TASK','CONSTRAINTS')):
            y=229+i*49;c.box((724,y,756,y+30),fill=RUST,stroke=None,radius=6)
            c.text((731,y+4),str(i+1),20,PAPER,weight=700);c.text((775,y+4),label,19,weight=700)
        c.spark(1064,190)
    elif motif == 'planner':
        paper(c,699,190,340,285)
        c.box((699,190,1039,247),fill=RUST,stroke=INK,radius=10)
        c.text((720,207),'THIS WEEK',24,PAPER,display=True)
        for i in range(5):
            x=715+i*64;c.text((x+10,266),('M','T','W','T','F')[i],20,weight=700)
            c.line([(x+48,304),(x+48,448)],LINE,2)
        for box in ((718,308,817,350),(843,362,1021,405),(782,416,886,448)):
            c.box(box,fill=RUST,stroke=None,radius=5)
        c.check(1060,420,38)
    elif motif == 'automation':
        c.box((702,205,840,308),fill=PAPER);bars(c,722,231,95,2)
        c.box((913,349,1065,461),fill=RUST);c.check(953,380,52,PAPER)
        c.arrow((858,251),(995,251));c.arrow((995,251),(995,331))
        c.arrow((895,410),(770,410));c.arrow((770,410),(770,327))
        c.spark(894,171,19)
    elif motif == 'email-savings':
        # Receipt and inbox loop: recurring email review, not a product screenshot.
        paper(c,727,174,251,254)
        c.text((748,199),'RECEIPT',27,display=True)
        bars(c,750,252,195,3)
        c.line([(750,327),(946,327)],LINE,2)
        c.text((750,347),'$',52,RUST,display=True)
        c.check(904,359,31)
        c.box((842,387,1090,487),fill=RUST,radius=8)
        c.line([(848,392),(966,452),(1084,392)],PAPER,4)
        c.line([(848,481),(923,438)],PAPER,3)
        c.line([(1084,481),(1009,438)],PAPER,3)
        c.arrow((1073,305),(1073,366))
        c.arrow((819,462),(697,462))
        c.arrow((697,462),(697,323))
    elif motif == 'video':
        paper(c,701,185,336,269)
        c.box((720,205,1017,385),fill=INK,stroke=None,radius=6)
        c.ellipse((800,235,941,360),fill=RUST,stroke=None)
        c.polygon([(850,266),(850,330),(899,298)],fill=PAPER,stroke=None)
        c.line([(723,416),(1017,416)],LINE,7);c.line([(723,416),(927,416)],RUST,7)
        c.ellipse((919,406,940,427),fill=RUST,stroke=None)
        c.spark(1066,178);c.text((704,480),'IDEA  /  SHOTS  /  EDIT',20,weight=700)
    elif motif == 'domains':
        paper(c,692,190,264,116);c.text((718,223),'NAME.AI',43,display=True)
        paper(c,796,358,264,116);c.text((820,389),'NAME.SI',43,RUST,display=True)
        c.arrow((754,324),(754,410));c.arrow((754,410),(777,410))
        c.spark(1030,234,25)
    elif motif == 'learning':
        for i in (2,1,0):
            c.box((694+i*14,196-i*14,871+i*14,307-i*14),fill=PAPER)
        c.polygon([(761,226),(761,278),(802,252)],fill=RUST,stroke=None)
        c.arrow((887,268),(1000,268));c.arrow((1000,268),(1000,340))
        paper(c,877,359,196,125);c.text((895,381),'REUSABLE',22,display=True);c.text((895,418),'SKILL',36,RUST,display=True)
        c.spark(743,397,32)
    elif motif == 'swaps':
        paper(c,693,222,155,209);paper(c,931,222,155,209)
        for x in (718,956):
            for i in range(3): c.box((x,249+i*52,x+105,286+i*52),fill=INK if x==718 else RUST,stroke=None,radius=6)
        c.arrow((857,282),(916,282));c.arrow((916,374),(857,374))
        c.text((704,461),'LESS',23,display=True);c.text((956,461),'MORE',23,RUST,display=True)
    elif motif == 'tree':
        c.line([(780,326),(780,471)],INK,13)
        c.ellipse((704,199,856,352),fill=RUST,stroke=INK)
        c.ellipse((755,157,891,293),fill=RUST,stroke=INK)
        c.ellipse((823,222,927,326),fill=RUST,stroke=INK)
        c.line([(780,387),(829,344)],INK,8)
        paper(c,915,333,151,149);c.text((934,353),'QUOTE',23,display=True);bars(c,936,395,102,2);c.check(1020,445,20)
        c.arrow((865,420),(898,420))
    elif motif == 'marketplace':
        c.box((697,197,977,306),fill=PAPER)
        c.polygon([(739,304),(739,328),(769,304)],fill=PAPER)
        c.text((724,229),'$200',42,display=True)
        c.box((825,348,1080,456),fill=RUST)
        c.polygon([(1022,454),(1022,480),(992,454)],fill=RUST)
        c.text((850,379),'$170?',42,PAPER,display=True)
        c.arrow((754,349),(804,400));c.spark(1038,246,27)
    elif motif == 'workbook':
        paper(c,716,184,279,301);c.text((739,211),'MY NOTES',25,display=True)
        c.box((737,259,972,389),fill=CREAM,stroke=LINE,width=2)
        c.spark(803,319,24);c.ellipse((867,286,934,354),fill=RUST,stroke=None)
        bars(c,739,419,197,2)
        c.polygon([(1013,437),(1040,449),(1091,243),(1064,232)],fill=RUST)
        c.polygon([(1013,437),(1013,464),(1040,449)],fill=PAPER)
    elif motif == 'travel':
        c.ellipse((713,188,1055,498),fill=PAPER)
        c.d.arc((730*SCALE,220*SCALE,1050*SCALE,449*SCALE),20,210,fill=LINE,width=5*SCALE)
        c.polygon([(763,334),(1025,239),(921,406),(889,335),(821,358)],fill=RUST)
        c.line([(889,335),(1025,239)],PAPER,4)
        c.ellipse((733,370,754,391),fill=INK,stroke=None);c.spark(1076,432,22)
    elif motif == 'study':
        for i in (2,1,0): paper(c,709+i*27,236-i*25,277,219)
        c.text((744,270),'WHY?',56,RUST,display=True)
        bars(c,747,356,195,2);c.check(974,412,42)
        c.spark(1060,224)
    elif motif == 'styles':
        for x,y in ((701,182),(906,182),(701,363),(906,363)):
            c.box((x,y,x+177,y+151),fill=PAPER)
        c.ellipse((745,216,834,304),fill=RUST,stroke=None)
        for i in range(6): c.line([(928+i*23,208),(928+i*23,309)],RUST,9)
        c.polygon([(720,487),(791,385),(858,487)],fill=RUST,stroke=None)
        c.spark(995,439,41)
    elif motif == 'avatar':
        c.box((724,178,1038,494),fill=PAPER)
        c.ellipse((819,219,952,352),fill=RUST)
        c.d.arc((767*SCALE,337*SCALE,1004*SCALE,546*SCALE),180,360,fill=INK,width=6*SCALE)
        c.ellipse((852,266,863,277),fill=INK,stroke=None);c.ellipse((908,266,919,277),fill=INK,stroke=None)
        c.d.arc((862*SCALE,285*SCALE,910*SCALE,320*SCALE),0,180,fill=INK,width=4*SCALE)
        c.spark(746,207,22);c.spark(1059,438,26)
    elif motif == 'meal':
        c.ellipse((710,177,1066,525),fill=PAPER)
        c.ellipse((742,209,1034,493),fill=CREAM,stroke=LINE,width=3)
        for box in ((769,241,861,331),(869,343,962,435),(889,242,983,332),(767,352,847,431)):
            c.ellipse(box,fill=RUST,stroke=None)
        c.line([(783,265),(832,310)],PAPER,6);c.line([(885,365),(939,412)],PAPER,6)
        c.line([(1083,211),(1083,492)],INK,7)
        for i in (-12,0,12): c.line([(1083+i,204),(1083+i,270)],INK,5)
        c.spark(709,458,18)
    else:
        paper(c,715,186,312,292)
        c.text((740,213),'USEFUL NOTES',28,display=True)
        bars(c,744,286,245,4);c.check(955,419,36)
        c.spark(1058,198)


def headline_lines(c, text):
    # Fit every word and every line; never silently truncate a title.
    explicit = text.upper().splitlines()
    for size in range(80,47,-2):
        lines=[]
        for block in explicit:
            line=''
            for word in block.split():
                if c.d.textlength(word,font=font(size,True)) > 530*SCALE: break
                candidate=(line+' '+word).strip()
                if line and c.d.textlength(candidate,font=font(size,True)) > 530*SCALE:
                    lines.append(line);line=word
                else: line=candidate
            else:
                if line: lines.append(line)
                continue
            break
        else:
            if lines and len(lines)<=3: return lines,size
    raise ValueError('Thumbnail headline does not fit. Use a shorter headline in data/thumbnail-specs.json.')


def render(resource, spec=None):
    spec=spec or {}
    resource={**resource,'category':CATEGORY_ALIASES.get(resource.get('category'),resource.get('category','Guide'))}
    motif=spec.get('motif',CATEGORY_MOTIFS.get(resource.get('category'),'resource'))
    if motif not in MOTIFS: raise ValueError(f'Unknown motif {motif!r}. Choose one of {MOTIFS}.')
    c=Canvas()
    c.text((56,38),'NIC.',28,display=True,weight=600)
    brand_width=c.d.textlength('NIC.',font=font(28,True,600))/SCALE
    c.text((56+brand_width,38),'BUILDZ',28,RUST,display=True,weight=600)
    c.text((862,45),'THE USEFUL CORNER',18,weight=700)
    c.line([(56,99),(1144,99)],LINE,2)
    fmt=resource.get('format','Free guide').upper()
    if c.d.textlength(fmt,font=font(19,False,700))>530*SCALE: fmt='FREE RESOURCE'
    c.text((58,151),fmt,19,RUST,weight=700)
    try:
        lines,size=headline_lines(c,spec.get('headline',resource['title']))
    except ValueError:
        if 'headline' in spec: raise
        lines,size=headline_lines(c,'MAKE SOMETHING\nUSEFUL')
    start=318-(len(lines)*size*1.12)/2
    for i,line in enumerate(lines): c.text((55,start+i*size*1.12),line,size,display=True,weight=600)
    c.line([(58,489),(143,489)],RUST,6)
    draw_motif(c,motif)
    c.line([(56,559),(1144,559)],LINE,2)
    category=resource.get('category','Guide').upper()
    if c.d.textlength(category,font=font(18,False,700))>740*SCALE: category='FREE RESOURCE'
    c.text((58,585),category,18,weight=700)
    c.text((959,585),'NICBUILDS.COM',17,RUST,weight=700)
    return c.image.resize((WIDTH,HEIGHT),Image.Resampling.LANCZOS)


def prepare(root=ROOT, slugs=None, attach=False, output=None):
    # Keep font and source location tied to this renderer; output can be isolated for evaluation.
    if output and attach: raise ValueError('--attach cannot be combined with --output.')
    resources=json.loads((root/'data/resources.json').read_text())
    specs=json.loads((root/'data/thumbnail-specs.json').read_text()) if (root/'data/thumbnail-specs.json').exists() else {}
    known={r['slug'] for r in resources}
    if slugs and set(slugs)-known: raise ValueError('Unknown resource slug(s): '+', '.join(sorted(set(slugs)-known)))
    selected=[r for r in resources if not slugs or r['slug'] in slugs]
    dest=Path(output) if output else root/'assets/thumbnails'
    dest.mkdir(parents=True,exist_ok=True)
    manifest_path=root/'data/asset-variants.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    results=[]
    rendered=[(item,render(item,specs.get(item['slug']))) for item in selected]
    for item,im in rendered:
        slug=item['slug']
        if not isinstance(slug,str) or not __import__('re').fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug): raise ValueError('Unsafe resource slug.')
        content_hash=hashlib.sha256(im.tobytes()).hexdigest()[:10]
        stem=f'{slug}-{content_hash}'
        # Content-addressed names keep fresh images and old cached pages compatible.
        master=dest/f'{stem}.webp';im.save(master,'WEBP',quality=90,method=6)
        variants=[]
        for w in (160,400,800):
            v=im.resize((w,round(w*HEIGHT/WIDTH)),Image.Resampling.LANCZOS)
            filename=f'{stem}-{w}.webp';v.save(dest/filename,'WEBP',quality=86,method=6)
            variants.append({'url':'/assets/thumbnails/'+filename,'width':w})
        social=dest/f'{stem}-social.jpg';im.save(social,'JPEG',quality=90,optimize=True)
        results.append({'slug':slug,'image_url':'/assets/thumbnails/'+master.name,'image_alt':f"Illustrated cover for {item['title']}",'variants':variants,'social':social.name})
        if attach:
            if output: raise ValueError('--attach cannot be combined with --output; isolated artwork must not be linked into the live data.')
            item['image_url']=results[-1]['image_url'];item['image_alt']=results[-1]['image_alt']
            manifest[item['image_url']]=variants
            social_dir=root/'assets/social';social_dir.mkdir(parents=True,exist_ok=True)
            im.save(social_dir/f'{slug}.jpg','JPEG',quality=90,optimize=True)
    fallback=render({'title':'Make something useful','format':'Free resource','category':'Free resources'},{'headline':'MAKE SOMETHING\nUSEFUL','motif':'resource'})
    fallback.save(dest/'default-v1.webp','WEBP',quality=90,method=6)
    fallback_variants=[]
    for w in (160,400,800):
        name=f'default-v1-{w}.webp'
        fallback.resize((w,round(w*HEIGHT/WIDTH)),Image.Resampling.LANCZOS).save(dest/name,'WEBP',quality=86,method=6)
        fallback_variants.append({'url':'/assets/thumbnails/'+name,'width':w})
    if attach:
        home=render({'title':'Better prompts. Less busywork.','format':'Free guides + prompts','category':'Nic Bramble · AI & automation'},{'headline':'BETTER PROMPTS.\nLESS BUSYWORK.','motif':'prompts'})
        home.save(root/'assets/social-preview.jpg','JPEG',quality=90,optimize=True)
        manifest['/assets/thumbnails/default-v1.webp']=fallback_variants
        (root/'data/resources.json').write_text(json.dumps(resources,indent=2,ensure_ascii=False)+'\n')
        manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
        original_file=root/'data/original-resource-artwork.json'
        originals=json.loads(original_file.read_text()) if original_file.exists() else {}
        (root/'source-artwork.js').write_text('window.BRAMBLE_ORIGINAL_ARTWORK = '+json.dumps(originals)+';\n')
        (root/'asset-variants.js').write_text('window.BRAMBLE_ASSET_VARIANTS = '+json.dumps(manifest)+';\n')
    (dest/'manifest.json').write_text(json.dumps(results,indent=2)+'\n')
    return results


def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all',action='store_true');group.add_argument('--slug',action='append')
    parser.add_argument('--attach',action='store_true',help='Update image paths and social artwork for selected resources.')
    parser.add_argument('--output',type=Path,help='Render a design preview outside the public asset directory.')
    args=parser.parse_args()
    if args.attach and args.output: parser.error('--attach cannot be combined with --output')
    try: results=prepare(slugs=args.slug,attach=args.attach,output=args.output)
    except (ValueError,OSError) as exc: parser.exit(1,str(exc)+'\n')
    print(f"Rendered {len(results)} consistent covers"+(' and attached them to the library.' if args.attach else '; resource data is unchanged.'))

if __name__=='__main__': main()
