"""Imposition de pages A5 sur des feuilles A4 paysage (appelé par scripts/build_pdf.mjs).

  python3 -I scripts/impose_2up.py entree-a5.pdf sortie.pdf
      2 par feuille, à 100 %, dans l'ordre : 1-2, 3-4…
  python3 -I scripts/impose_2up.py entree.pdf sortie.pdf --alterne miroir.pdf
      Pas d'imposition : pages impaires prises dans entree.pdf, paires dans miroir.pdf (marges et pied de page
      inversés), pour une impression recto verso page à page.
  python3 -I scripts/impose_2up.py entree-a5.pdf sortie.pdf --relie couverture-a4-paysage.pdf 12 [miroir-a5.pdf]
      Livret à relier à gauche, recto verso (retourner sur le bord court) : feuille 1 = couverture seule
      (A4 entier), verso blanc ; puis les pages A5 deux par face, 1-2 au recto, 3-4 au verso, etc. Une marge de
      reliure (en mm) est réservée côté reliure : à gauche au recto, à droite au verso. Les pages sont réduites
      d'autant (environ 96 % pour 12 mm). Avec miroir-a5.pdf, les pages posées au verso viennent de ce fichier
      (numéro de page et grande marge du côté libre de la feuille)."""
import sys
from pypdf import PdfReader, PdfWriter, Transformation

W, H = 841.89, 595.28  # A4 paysage, en points
MM = 72 / 25.4


def place(sheet, page, x0, width):
    """Pose une page centrée dans la bande [x0, x0 + width] de la feuille, à l'échelle maximale (≤ 100 %)."""
    pw, ph = float(page.mediabox.width), float(page.mediabox.height)
    scale = min(width / pw, H / ph, 1)
    dx = x0 + (width - pw * scale) / 2
    dy = (H - ph * scale) / 2
    sheet.merge_transformed_page(page, Transformation().scale(scale).translate(dx, dy))


def main():
    src, dst = sys.argv[1], sys.argv[2]
    pages = PdfReader(src).pages
    writer = PdfWriter()
    if len(sys.argv) > 4 and sys.argv[3] == "--alterne":
        mirror = PdfReader(sys.argv[4]).pages
        for i in range(len(pages)):
            writer.add_page(pages[i] if i % 2 == 0 else mirror[i])
        writer.compress_identical_objects()
        with open(dst, "wb") as f:
            writer.write(f)
        return
    relie = len(sys.argv) > 5 and sys.argv[3] == "--relie"
    mirror = PdfReader(sys.argv[6]).pages if relie and len(sys.argv) > 6 else pages
    sides = []  # (liste de pages à poser, marge gauche, marge droite)
    if relie:
        cover = PdfReader(sys.argv[4]).pages[0]
        gutter = float(sys.argv[5]) * MM
        sides += [([cover], 0, 0), ([], 0, 0)]  # couverture seule ; verso blanc
        for i in range(0, len(pages), 2):
            recto = len(sides) % 2 == 0
            sides.append(((pages if recto else mirror)[i:i + 2], gutter if recto else 0, 0 if recto else gutter))
    else:
        sides = [(pages[i:i + 2], 0, 0) for i in range(0, len(pages), 2)]
    for content, left, right in sides:
        sheet = writer.add_blank_page(width=W, height=H)
        if len(content) == 1 and float(content[0].mediabox.width) > W / 2 + 1:  # page pleine (couverture)
            place(sheet, content[0], 0, W)
        else:
            half = (W - left - right) / 2
            for j, page in enumerate(content):
                place(sheet, page, left + j * half, half)
        sheet.compress_content_streams()  # sinon le contenu fusionné est écrit non compressé (fichier ×8)
    writer.compress_identical_objects()
    with open(dst, "wb") as f:
        writer.write(f)
    if relie:
        print(f"{dst} : {(len(sides) + 1) // 2} feuilles recto verso")


if __name__ == "__main__":
    main()
