"""Observable cover/workflow checks. Run with the Pillow-enabled Python."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('thumbnails',ROOT/'scripts/prepare-thumbnails.py')
thumbs=importlib.util.module_from_spec(spec);spec.loader.exec_module(thumbs)

class ThumbnailTests(unittest.TestCase):
    def fixture(self,root,resource=None,specs=None):
        (root/'data').mkdir()
        rows=[resource or {'slug':'client-intake-guide','title':'Build a useful client intake workflow','category':'AI + Automation','format':'Build guide','body':'## First\nCollect the right details.','published':False}]
        (root/'data/resources.json').write_text(json.dumps(rows))
        (root/'data/thumbnail-specs.json').write_text(json.dumps(specs or {}))
        return rows

    def test_all_current_covers_and_variants_exist_in_the_promised_sizes(self):
        rows=json.loads((ROOT/'data/resources.json').read_text())
        variants=json.loads((ROOT/'data/asset-variants.json').read_text())
        for item in rows:
            self.assertTrue(item['image_url'].startswith('/assets/thumbnails/'))
            with Image.open(ROOT/item['image_url'].lstrip('/')) as im: self.assertEqual(im.size,(1200,630))
            for v in variants[item['image_url']]:
                with Image.open(ROOT/v['url'].lstrip('/')) as im: self.assertEqual(im.size,(v['width'],round(v['width']*630/1200)))
            with Image.open(ROOT/'assets/social'/f"{item['slug']}.jpg") as im: self.assertEqual(im.size,(1200,630))

    def test_unseen_guide_gets_real_cover_without_custom_spec_and_stays_draft(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);before=self.fixture(root)
            result=thumbs.prepare(root=root,attach=True)
            after=json.loads((root/'data/resources.json').read_text())
            self.assertEqual(after[0]['body'],before[0]['body']);self.assertFalse(after[0]['published'])
            self.assertTrue((root/after[0]['image_url'].lstrip('/')).exists())
            self.assertEqual(result[0]['slug'],before[0]['slug'])
            self.assertTrue((root/'assets/thumbnails/default-v1.webp').exists())

    def test_preview_does_not_change_resource_data(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.fixture(root);before=(root/'data/resources.json').read_bytes()
            thumbs.prepare(root=root,output=root/'preview')
            self.assertEqual((root/'data/resources.json').read_bytes(),before)
            self.assertFalse((root/'assets').exists())

    def test_repeat_builds_keep_asset_names_and_revised_headlines_get_new_names(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.fixture(root)
            first=thumbs.prepare(root=root,attach=True)
            second=thumbs.prepare(root=root,attach=True)
            self.assertEqual(first[0]['image_url'],second[0]['image_url'])
            (root/'data/thumbnail-specs.json').write_text(json.dumps({'client-intake-guide':{'headline':'BETTER CLIENT\nINTAKE','motif':'prompts'}}))
            third=thumbs.prepare(root=root,attach=True)
            self.assertNotEqual(first[0]['image_url'],third[0]['image_url'])
            self.assertTrue((root/first[0]['image_url'].lstrip('/')).exists())

    def test_malformed_direction_stops_before_attaching_and_never_truncates(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.fixture(root,specs={'client-intake-guide':{'headline':'X'*100,'motif':'planner'}})
            before=(root/'data/resources.json').read_bytes()
            with self.assertRaisesRegex(ValueError,'does not fit'): thumbs.prepare(root=root,attach=True)
            self.assertEqual((root/'data/resources.json').read_bytes(),before)
        with self.assertRaisesRegex(ValueError,'Unknown motif'):
            thumbs.render({'title':'Test'},{'motif':'unrecognized'})

    def test_all_illustrations_fit_the_standard_frame(self):
        for motif in thumbs.MOTIFS:
            image=thumbs.render({'title':'A useful guide','format':'Guide','category':'Test'},{'headline':'SOMETHING\nUSEFUL','motif':motif})
            self.assertEqual(image.size,(1200,630))

if __name__=='__main__': unittest.main()
