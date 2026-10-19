"""Independent XML parsing and landing page checks on the final static export."""
import json, pathlib, re, sys, xml.etree.ElementTree as ET
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'out')
feed = ET.parse(root / 'google-merchant.xml').getroot()
assert feed.tag == 'rss' and feed.attrib['version'] == '2.0'
ns = {'g': 'http://base.google.com/ns/1.0'}
items = feed.findall('./channel/item')
ids = set()
for item in items:
    def value(name):
        return item.findtext('g:' + name, namespaces=ns)
    for field in ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition']:
        assert value(field), (value('id'), field)
    assert value('id') not in ids, 'Duplicate ID'
    ids.add(value('id'))
    assert value('image_link').startswith('https://')
    assert value('link').startswith('https://www.skufnya.com/product/')
    assert value('condition') == 'new'
    assert value('availability') in ['in_stock', 'preorder', 'backorder', 'out_of_stock']
    if value('availability') in ['preorder', 'backorder']:
        assert value('availability_date')
    assert re.fullmatch(r'[0-9]+\.[0-9]{2} UAH', value('price'))
    from urllib.parse import urlparse, unquote
    page = root / unquote(urlparse(value('link')).path.lstrip('/')) / 'index.html'
    html = page.read_text()
    products = [json.loads(body) for body in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html)]
    product = next(p for p in products if p.get('@type') == 'Product')
    assert float(product['offers']['price']) == float(value('price').split()[0]), value('id')
    assert product['offers']['priceCurrency'] == 'UAH'
    assert product['url'] == value('link')
    assert product['image'][0] == value('image_link'), value('id')
print(json.dumps({'xmlValid': True, 'items': len(items), 'uniqueIds': len(ids), 'landingPagesChecked': len(items)}))

# Production CI checks the actual public image bytes; synthetic builds use fixture URLs.
if '--check-images' in sys.argv:
    import concurrent.futures, struct, urllib.request
    def dimensions(data):
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', data[16:24])
        if data[:6] in (b'GIF87a', b'GIF89a'):
            return struct.unpack('<HH', data[6:10])
        if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            if data[12:16] == b'VP8X':
                return int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1
            if data[12:16] == b'VP8L':
                packed = int.from_bytes(data[21:25], 'little')
                return (packed & 16383) + 1, ((packed >> 14) & 16383) + 1
            if data[12:16] == b'VP8 ' and data[23:26] == b'\x9d\x01\x2a':
                return struct.unpack('<H', data[26:28])[0] & 16383, struct.unpack('<H', data[28:30])[0] & 16383
        if data[:2] == b'\xff\xd8':
            i = 2
            while i < len(data):
                while data[i] == 255: i += 1
                marker = data[i]; i += 1
                length = int.from_bytes(data[i:i+2], 'big')
                if marker in [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]:
                    return int.from_bytes(data[i+5:i+7], 'big'), int.from_bytes(data[i+3:i+5], 'big')
                assert length >= 2, 'Invalid JPEG segment'
                i += length
        raise ValueError('Unsupported or corrupt image bytes; use JPEG, PNG, GIF or WebP')
    def check_image(url):
        request = urllib.request.Request(url, headers={'User-Agent': 'SKUFnya-Merchant-Validator/1.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            assert response.status == 200, (url, response.status)
            assert response.url.startswith('https://'), ('Insecure redirect', url)
            data = response.read(16 * 1024 * 1024 + 1)
            assert len(data) <= 16 * 1024 * 1024, ('Image exceeds 16 MB', url)
            width, height = dimensions(data)
            assert width >= 100 and height >= 100 and width * height <= 64_000_000, (url, width, height)
            # The 500px minimum begins 2027-01-31. Warn before that date, then enforce.
            from datetime import date
            if min(width, height) < 500:
                assert date.today() < date(2027, 1, 31), ('Image below 500px', url)
                print('::warning::Image below upcoming 500px minimum: ' + url)
            return url
    urls = sorted({node.text for item in items for name in ['image_link', 'additional_image_link'] for node in item.findall('g:' + name, ns)})
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        checked = list(pool.map(check_image, urls))
    print(json.dumps({'publicImagesChecked': len(checked)}))
