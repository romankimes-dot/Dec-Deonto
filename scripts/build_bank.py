#!/usr/bin/env python3
"""Fusionne data/bank/*.json en data/questions.json, valide le schéma, génère data/fiches/index.json.

Usage : python3 -I scripts/build_bank.py [--check]
  --check : valide sans écrire (utilisé en CI) ; échoue si questions.json n'est pas à jour.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "data" / "bank"
OUT = ROOT / "data" / "questions.json"
FICHES = ROOT / "data" / "fiches"

THEMES = {"exercice", "deontologie", "controle_qualite", "responsabilite"}
TAGS = set("""
referentiel_normatif missions_assurance lettre_mission honoraires publicite_demarchage secret_professionnel
incompatibilites_activites societes_ec_capital ordre_organisation inscription_tableau discipline_sanctions
responsabilite_civile responsabilite_penale lcb_ft controle_qualite devoir_conseil confraternite_reprise_dossier
formation delegation_signature personnes_physiques loi_pacte missions_legales
h2a_supervision cncc_crcc_organisation inscription_liste nomination_seuils mandat_duree_cessation
demission_revocation honoraires_bareme lettre_mission_nep210 independance_situations_risque incompatibilites_liens
reseau services_interdits_eip eip co_commissariat non_immixtion revelation_procureur controle_activite
prestations_declaration_activite agp_associations delit_entrave code_deontologie_structure nep durabilite_csrd
alpe_petites_entreprises
""".split())

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def check_question(q: dict, session: str) -> None:
    qid = q.get("id", "?")
    pre = f"[{session}] {qid}: "
    for k in ("id", "n", "profession", "theme", "tags", "points", "question", "qcm", "qrc", "explanation", "reference", "confidence"):
        if k not in q:
            err(pre + f"champ manquant '{k}'")
    if not re.fullmatch(rf"{session}-(EC|CAC)-\d{{2}}", str(qid)):
        err(pre + "id mal formé")
    if q.get("profession") not in ("EC", "CAC"):
        err(pre + "profession invalide")
    if q.get("theme") not in THEMES:
        err(pre + f"thème invalide '{q.get('theme')}'")
    tags = q.get("tags") or []
    if not tags:
        err(pre + "aucun tag")
    for t in tags:
        if t not in TAGS:
            warnings.append(pre + f"tag inconnu '{t}'")
    qcm = q.get("qcm") or {}
    if not isinstance(qcm.get("choices"), list) or len(qcm["choices"]) != 4:
        err(pre + "qcm.choices doit contenir 4 propositions")
    if not isinstance(qcm.get("answer"), int) or not 0 <= qcm.get("answer", -1) <= 3:
        err(pre + "qcm.answer doit être un index 0..3")
    qrc = q.get("qrc") or {}
    if not isinstance(qrc.get("expected"), list) or not qrc["expected"]:
        err(pre + "qrc.expected vide")
    if not qrc.get("model_answer"):
        err(pre + "qrc.model_answer vide")
    if q.get("confidence") not in ("high", "medium", "low"):
        err(pre + "confidence invalide")
    if not str(q.get("question", "")).strip():
        err(pre + "question vide")


def main() -> int:
    check = "--check" in sys.argv
    files = sorted(BANK.glob("*.json"))
    if not files:
        print("Aucun fichier dans data/bank/")
        return 1
    questions = []
    ids = set()
    sessions = []
    for f in files:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(f"{f.name}: JSON invalide ({e})")
            continue
        session = d.get("session") or f.stem
        if session != f.stem:
            err(f"{f.name}: session '{session}' ≠ nom de fichier")
        sessions.append({"session": session, "format": d.get("format"), "count": len(d.get("questions", []))})
        for q in d.get("questions", []):
            check_question(q, session)
            if q.get("id") in ids:
                err(f"[{session}] id en double {q.get('id')}")
            ids.add(q.get("id"))
            q["session"] = session
            q["origFormat"] = d.get("format")
            questions.append(q)
    # Couverture thème × profession
    cov = {}
    for q in questions:
        cov[(q.get("profession"), q.get("theme"))] = cov.get((q.get("profession"), q.get("theme")), 0) + 1
    for p in ("EC", "CAC"):
        for t in sorted(THEMES):
            if cov.get((p, t), 0) == 0:
                warnings.append(f"aucune question pour {p} × {t}")

    fiches = []
    if FICHES.exists():
        for f in sorted(FICHES.glob("*.md")):
            first = next((l for l in f.read_text(encoding="utf-8").splitlines() if l.startswith("# ")), f.stem)
            fiches.append({"file": f.name, "title": first.lstrip("# ").strip()})

    out = {
        "generatedAt": None,
        "sessions": sessions,
        "count": len(questions),
        "questions": questions,
    }
    conf = {"high": 0, "medium": 0, "low": 0}
    for q in questions:
        conf[q.get("confidence", "low")] = conf.get(q.get("confidence", "low"), 0) + 1

    for w in warnings:
        print("AVERTISSEMENT:", w)
    for e in errors:
        print("ERREUR:", e)
    print(f"{len(questions)} questions, {len(sessions)} sessions, confiance {conf}, {len(fiches)} fiches")
    if errors:
        return 1
    text = json.dumps(out, ensure_ascii=False, indent=1) + "\n"
    idx_text = json.dumps(fiches, ensure_ascii=False, indent=1) + "\n"
    if check:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        cur_idx = (FICHES / "index.json").read_text(encoding="utf-8") if (FICHES / "index.json").exists() else ""
        if cur != text or cur_idx != idx_text:
            print("questions.json ou fiches/index.json n'est pas à jour : lancer scripts/build_bank.py")
            return 1
        print("OK (à jour)")
        return 0
    OUT.write_text(text, encoding="utf-8")
    (FICHES / "index.json").write_text(idx_text, encoding="utf-8")
    print("écrit", OUT.relative_to(ROOT), "et data/fiches/index.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
