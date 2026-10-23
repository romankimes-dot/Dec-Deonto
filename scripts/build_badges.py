#!/usr/bin/env python3
"""Génère js/catalog-data.js depuis BADGES.md (anecdotes et badges de questions) et vérifie
que chaque id de question cité existe dans data/questions.json.

Usage : python3 -I scripts/build_badges.py [--check]
  --check : échoue si un id est inconnu ou si js/catalog-data.js n'est pas à jour.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "BADGES.md"
OUT = ROOT / "js" / "catalog-data.js"
BANK = ROOT / "data" / "questions.json"

ID_RE = re.compile(r"\d{4}-\d{2}-(?:EC|CAC)-\d{2}")
RARITY = {"commun": "commun", "rare": "rare", "épique": "epique", "epique": "epique", "légendaire": "legendaire", "legendaire": "legendaire"}
PARTS = {"6.1": "stage", "6.2": "diplome", "6.3": "installation", "6.4": "cac"}


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def clean(s: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"\1", s).strip().strip("«»").strip()


def parse() -> tuple[list, list]:
    lines = MD.read_text(encoding="utf-8").splitlines()
    anecdotes, qbadges = [], []
    section, part = None, None
    for line in lines:
        m = re.match(r"^##\s+(\d+)\.", line)
        if m:
            section = m.group(1)
        m = re.match(r"^###\s+(6\.\d)", line)
        if m:
            part = PARTS.get(m.group(1))
        if not line.startswith("|"):
            continue
        c = cells(line)
        if section == "6" and re.fullmatch(r"A\d+", c[0]):
            ids = ID_RE.findall(c[3])
            anecdotes.append({
                "id": c[0], "part": part, "title": clean(c[1]), "text": clean(c[2]),
                "ids": ids, "special": None if ids else "blocs", "rarity": RARITY[c[4].lower()],
            })
        elif section == "7" and c[0].startswith("**"):
            title = clean(c[0])
            qbadges.append({
                "id": "q-" + slug(title), "title": title, "desc": clean(c[1]),
                "ids": ID_RE.findall(c[2]), "rarity": RARITY[c[3].lower()],
            })
    return anecdotes, qbadges


def main() -> int:
    anecdotes, qbadges = parse()
    known = {q["id"] for q in json.loads(BANK.read_text(encoding="utf-8"))["questions"]}
    errors = []
    for a in anecdotes + qbadges:
        for i in a["ids"]:
            if i not in known:
                errors.append(f"{a['id']} : question inconnue {i}")
        if not a["ids"] and a.get("special") is None:
            errors.append(f"{a['id']} : aucune question rattachée")
    for e in errors:
        print("ERREUR:", e)
    print(f"{len(anecdotes)} anecdotes, {len(qbadges)} badges de questions")
    if errors:
        return 1
    text = (
        "// Fichier généré par scripts/build_badges.py depuis BADGES.md. Ne pas modifier à la main.\n"
        f"export const ANECDOTES = {json.dumps(anecdotes, ensure_ascii=False, indent=1)};\n"
        f"export const QBADGES = {json.dumps(qbadges, ensure_ascii=False, indent=1)};\n"
    )
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print("js/catalog-data.js n'est pas à jour : lancer scripts/build_badges.py")
            return 1
        print("OK (à jour)")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print("écrit", OUT.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
