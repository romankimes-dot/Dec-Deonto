"""Imposition 2 par feuille : pages A5 placées côte à côte, à 100 %, sur des feuilles A4 paysage.
Usage : python3 -I scripts/impose_2up.py entree-a5.pdf sortie.pdf (appelé par scripts/build_pdf.mjs)."""
import sys
from pypdf import PdfReader, PdfWriter, Transformation

src, dst = sys.argv[1], sys.argv[2]
reader = PdfReader(src)
writer = PdfWriter()
W, H = 841.89, 595.28  # A4 paysage, en points
for i in range(0, len(reader.pages), 2):
    sheet = writer.add_blank_page(width=W, height=H)
    for j, page in enumerate(reader.pages[i:i + 2]):
        pw, ph = float(page.mediabox.width), float(page.mediabox.height)
        scale = min((W / 2) / pw, H / ph)
        dx = j * W / 2 + (W / 2 - pw * scale) / 2
        dy = (H - ph * scale) / 2
        sheet.merge_transformed_page(page, Transformation().scale(scale).translate(dx, dy))
    sheet.compress_content_streams()  # sinon le contenu fusionné est écrit non compressé (fichier ×8)
writer.compress_identical_objects()
with open(dst, "wb") as f:
    writer.write(f)
