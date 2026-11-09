#!/usr/bin/env python3
"""Fusionne data/bank/*.json en data/questions.json, valide le schéma, génère data/fiches/index.json.

Usage : python3 -I scripts/build_bank.py [--check]
  --check : valide sans écrire (utilisé en CI) ; échoue si questions.json n'est pas à jour.
Calcule aussi la VERSION de sw.js (empreinte du contenu servi, voir sw_version) et l'écrit si elle a changé :
plus besoin de l'incrémenter à la main ; --check échoue si elle n'est pas à jour.
"""
import datetime
import hashlib
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

# Fichier des questions de transfert, rédigées hors annales (data/bank/transfert.json) ; les autres fichiers sont
# des sessions officielles (AAAA-MM).
TRANSFERT = "transfert"

errors: list[str] = []
warnings: list[str] = []

# Longueurs cibles (revue 2026-11) : au-delà, simple avertissement dans --check (jamais un échec) ; les textes sont
# raccourcis au fil des relectures sans perdre d'information juridique utile.
MAX_EXPLANATION = 350
MAX_MODEL_ANSWER = 350
MAX_EXPECTED = 150
# Part des QCM d'un fichier dont la bonne réponse est (strictement) la plus longue proposition : au-delà, le candidat
# peut deviner sans savoir.
MAX_LONGEST_SHARE = 0.40
# Journal de relecture : sa place est `review_note` (jamais affiché), pas `update_note` (affiché à l'apprenant).
REVIEW_LOG = re.compile(r"Relecture\s*:|non consult|non vérifi|à vérifier", re.I)
long_texts: dict[str, list[str]] = {"explanation": [], "model_answer": [], "expected": []}


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
    # Leurre « règle de l'autre profession » (index de la proposition), pour mesurer la confusion EC / CAC.
    if "crossProf" in qcm:
        cp = qcm["crossProf"]
        if not isinstance(cp, int) or not 0 <= cp <= 3 or cp == qcm.get("answer"):
            err(pre + "qcm.crossProf doit désigner un leurre (index 0..3 différent de la réponse)")
    # Jeu de l'intrus : éléments attendus (au moins 3) et un leurre qui n'en fait pas partie.
    it = q.get("intrus")
    if it is not None:
        items = it.get("items") if isinstance(it, dict) else None
        if not isinstance(items, list) or len(items) < 3 or not all(isinstance(x, str) and x.strip() for x in items):
            err(pre + "intrus.items : au moins 3 éléments")
        elif not str(it.get("leurre", "")).strip() or it["leurre"] in items:
            err(pre + "intrus.leurre manquant ou présent dans les éléments")
        elif not str(it.get("q", "")).strip() or not str(it.get("why", "")).strip():
            err(pre + "intrus.q et intrus.why obligatoires")
        elif any(len(x) > 100 for x in items + [it["leurre"]]):
            err(pre + "intrus : 100 caractères au plus par élément")
    # Questions de transfert (hors annales) : rédigées pour combler un sujet peu couvert, jamais des sujets officiels.
    if session == TRANSFERT and not q.get("hors_annales"):
        err(pre + "question de transfert sans le marqueur hors_annales")
    # update_note : évolution du droit, affichée ; review_note : journal de relecture, jamais affiché ;
    # answer_changed : la bonne réponse retenue diffère de la clé de l'époque (pastille dans l'app).
    for k in ("update_note", "review_note"):
        if k in q and not isinstance(q[k], str):
            err(pre + f"{k} doit être un texte")
    if "answer_changed" in q and not isinstance(q["answer_changed"], bool):
        err(pre + "answer_changed doit valoir true ou false")
    if q.get("answer_changed") and not str(q.get("update_note", "")).strip():
        warnings.append(pre + "answer_changed sans update_note (dire ce qui a changé)")
    if REVIEW_LOG.search(str(q.get("update_note", ""))):
        warnings.append(pre + "update_note contient un journal de relecture : le déplacer dans review_note")
    if len(str(q.get("explanation", ""))) > MAX_EXPLANATION:
        long_texts["explanation"].append(str(qid))
    if len(str(qrc.get("model_answer", ""))) > MAX_MODEL_ANSWER:
        long_texts["model_answer"].append(str(qid))
    if any(isinstance(x, str) and len(x) > MAX_EXPECTED for x in qrc.get("expected") or []):
        long_texts["expected"].append(str(qid))


def longest_is_answer(q: dict) -> bool:
    """Bonne réponse strictement plus longue que chacun des trois leurres."""
    qcm = q.get("qcm") or {}
    ch, a = qcm.get("choices"), qcm.get("answer")
    if not isinstance(ch, list) or len(ch) != 4 or not isinstance(a, int) or not 0 <= a <= 3:
        return False
    return all(len(str(ch[a])) > len(str(c)) for i, c in enumerate(ch) if i != a)


def build_date(current: dict | None, out: dict) -> str:
    """Date de génération (AAAA-MM-JJ), stable : gardée tant que le contenu ne change pas (--check reste vert)."""
    if current and current.get("generatedAt") and {**current, "generatedAt": None} == {**out, "generatedAt": None}:
        return current["generatedAt"]
    return datetime.date.today().isoformat()


FENCES = {"vs", "echelle", "frise", "etapes", "arbre"}


def front_matter(text: str) -> tuple[dict, str]:
    """Entête « --- / clé: valeur / --- » en tête de fiche (même format que js/bank.js)."""
    m = re.match(r"---\n(.*?)\n---\n?", text.replace("\r", ""), re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"(\w+)\s*:\s*(.*)$", line.strip())
        if kv:
            meta[kv.group(1)] = kv.group(2).strip()
    return meta, text.replace("\r", "")[m.end():]


def resolve_questions(spec: str, questions: list, fname: str) -> list[str]:
    """Sélecteurs séparés par des espaces : un id (2019-05-CAC-12) ou PROF:tag (EC:lcb_ft, CAC:eip, *:formation)."""
    out: list[str] = []
    by_id = {q["id"] for q in questions}
    for tok in spec.split():
        if ":" in tok:
            prof, tag = tok.split(":", 1)
            if tag not in TAGS:
                err(f"fiche {fname}: tag inconnu '{tag}'")
                continue
            if prof not in ("EC", "CAC", "*"):
                err(f"fiche {fname}: profession inconnue '{prof}'")
                continue
            hits = [q["id"] for q in questions if tag in q["tags"] and (prof == "*" or q["profession"] == prof)]
            if not hits:
                err(f"fiche {fname}: aucune question pour '{tok}'")
            out += hits
        elif tok in by_id:
            out.append(tok)
        else:
            err(f"fiche {fname}: question inconnue '{tok}'")
    seen = set()
    return [i for i in out if not (i in seen or seen.add(i))]


def check_blocks(body: str, fname: str) -> None:
    """Blocs ``` fermés et de type connu."""
    open_type = None
    for line in body.splitlines():
        m = re.match(r"```(\w*)\s*$", line)
        if not m:
            continue
        if open_type is None:
            if m.group(1) not in FENCES:
                err(f"fiche {fname}: bloc inconnu '{m.group(1)}'")
            open_type = m.group(1) or "?"
        else:
            open_type = None
    if open_type is not None:
        err(f"fiche {fname}: bloc ```{open_type} non fermé")


SW = ROOT / "sw.js"
SW_VERSION_RE = re.compile(r"^const VERSION = '([^']*)';$", re.M)
# Fichiers générés après build_bank.py, remplacés dans l'empreinte par leurs sources (l'ordre des scripts de build
# ne change donc pas la VERSION) : js/catalog-data.js (build_badges.py) et les PDF (npm run pdf, npm run pdf:ville).
SW_SOURCES_OF = {
    "js/catalog-data.js": ["BADGES.md", "scripts/build_badges.py"],
}
SW_PDF_SOURCES = ["scripts/build_pdf.mjs", "scripts/pdf_inputs.mjs", "scripts/print.css", "scripts/impose_2up.py",
                  "scripts/build_ville_pdf.mjs"]


def sw_version(sw_text: str, generated: dict[str, str]) -> str:
    """VERSION du service worker : empreinte de tout ce qu'il met en cache (CORE, fiches, shorts, sources des PDF)
    et de sw.js lui-même, ligne VERSION exclue. `generated` : contenus que ce script s'apprête à écrire."""
    def listed(name: str) -> list[str]:
        m = re.search(r"const " + name + r" = \[(.*?)\];", sw_text, re.S)
        return re.findall(r"'\./([^']*)'", m.group(1)) if m else []
    files: list[str] = []
    for rel in listed("CORE"):
        if rel:
            files += SW_SOURCES_OF.get(rel, [rel])
    files += sorted(f"data/fiches/{p.name}" for p in FICHES.glob("*.md"))
    files += sorted(f"data/shorts/{p.name}" for p in (ROOT / "data" / "shorts").glob("*.json"))
    if listed("PDFS"):
        files += SW_PDF_SOURCES
    h = hashlib.sha256()
    h.update(SW_VERSION_RE.sub("const VERSION = '';", sw_text).encode("utf-8"))
    for rel in dict.fromkeys(files):
        if rel in generated:
            data = generated[rel].encode("utf-8")
        elif (ROOT / rel).is_file():
            data = (ROOT / rel).read_bytes()
        else:
            print(f"AVERTISSEMENT: sw.js met en cache {rel}, absent du dépôt")
            data = b"\0absent\0"
        h.update(rel.encode("utf-8") + b"\0" + data + b"\0")
    return "dec1-" + h.hexdigest()[:10]


def with_sw_version(sw_text: str, version: str) -> str:
    if not SW_VERSION_RE.search(sw_text):
        raise SystemExit("ERREUR: ligne « const VERSION = '…'; » introuvable dans sw.js")
    return SW_VERSION_RE.sub(f"const VERSION = '{version}';", sw_text, count=1)


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
        qs_file = [q for q in d.get("questions", []) if isinstance(q, dict)]
        if qs_file:
            share = sum(longest_is_answer(q) for q in qs_file) / len(qs_file)
            if share > MAX_LONGEST_SHARE:
                warnings.append(f"{f.name}: la bonne réponse est la proposition la plus longue dans {round(share * 100)} % des QCM "
                                f"(au-delà de {round(MAX_LONGEST_SHARE * 100)} %) : équilibrer la longueur des leurres")
        if session != TRANSFERT:
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
            text = f.read_text(encoding="utf-8")
            meta, body = front_matter(text)
            first = next((l for l in body.splitlines() if l.startswith("# ")), f.stem)
            entry = {"file": f.name, "title": first.lstrip("# ").strip()}
            if meta.get("type"):
                entry["kind"] = meta["type"]
            if meta.get("questions"):
                entry["questions"] = resolve_questions(meta["questions"], questions, f.name)
            check_blocks(body, f.name)
            fiches.append(entry)

    out = {
        "generatedAt": None,
        "sessions": sessions,
        "count": len(questions),
        "questions": questions,
    }
    try:
        current = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else None
    except json.JSONDecodeError:
        current = None
    out["generatedAt"] = build_date(current, out)
    labels = {"explanation": f"explication > {MAX_EXPLANATION} caractères",
              "model_answer": f"model_answer > {MAX_MODEL_ANSWER} caractères",
              "expected": f"élément expected > {MAX_EXPECTED} caractères"}
    for k, ids_long in long_texts.items():
        if ids_long:
            more = f" … (+{len(ids_long) - 12})" if len(ids_long) > 12 else ""
            warnings.append(f"{len(ids_long)} question(s) avec {labels[k]} (cible) : {', '.join(ids_long[:12])}{more}")
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
    sw_text = SW.read_text(encoding="utf-8")
    sw_new = with_sw_version(sw_text, sw_version(sw_text, {"data/questions.json": text, "data/fiches/index.json": idx_text}))
    if check:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        cur_idx = (FICHES / "index.json").read_text(encoding="utf-8") if (FICHES / "index.json").exists() else ""
        if current is not None and not current.get("generatedAt"):
            print("AVERTISSEMENT: questions.json sans date de génération (generatedAt) : relancer scripts/build_bank.py")
            # Ancien fichier sans date : comparé sans elle (la date seule ne rend pas la banque périmée).
            text = json.dumps({**out, "generatedAt": None}, ensure_ascii=False, indent=1) + "\n"
        if cur != text or cur_idx != idx_text:
            print("questions.json ou fiches/index.json n'est pas à jour : lancer scripts/build_bank.py")
            return 1
        if sw_new != sw_text:
            print("VERSION de sw.js ne correspond pas au contenu servi : lancer scripts/build_bank.py")
            return 1
        print("OK (à jour)")
        return 0
    OUT.write_text(text, encoding="utf-8")
    (FICHES / "index.json").write_text(idx_text, encoding="utf-8")
    print("écrit", OUT.relative_to(ROOT), "et data/fiches/index.json")
    if sw_new != sw_text:
        SW.write_text(sw_new, encoding="utf-8")
        print("écrit sw.js (VERSION", SW_VERSION_RE.search(sw_new).group(1) + ")")
    return 0


if __name__ == "__main__":
    sys.exit(main())
