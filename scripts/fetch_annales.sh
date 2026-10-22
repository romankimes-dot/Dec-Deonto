#!/usr/bin/env bash
# Télécharge les sujets officiels de l'épreuve 1 (déontologie) publiés par le SIEC,
# plus les rapports de jury. Les fichiers vont dans sources/annales et sources/rapports-jury.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="$ROOT/sources/annales"
R="$ROOT/sources/rapports-jury"
mkdir -p "$A" "$R"

BASE="https://siec.education.fr/candidats/docutheque/download/diplome-dexpertise-comptable-dec-archives-sujets"
declare -A SUJETS=(
  ["2025-11"]="nov%202025%20-%20d%C3%A9onto.pdf"
  ["2025-05"]="mai%202025%20-%20d%C3%A9onto.pdf"
  ["2024-05"]="mai%202024%20-%20d%C3%A9onto.pdf"
  ["2023-11"]="nov%202023%20-%20d%C3%A9onto.pdf"
  ["2023-05"]="Mai%202023%20-%20d%C3%A9onto.pdf"
  ["2022-11"]="nov%202022%20-%20d%C3%A9onto.pdf"
  ["2022-05"]="mai%202022%20-%20d%C3%A9onto.pdf"
  ["2021-11"]="nov%202021%20-%20d%C3%A9onto.pdf"
  ["2021-05"]="Mai%202021%20-%20d%C3%A9onto.pdf"
  ["2020-11"]="Nov%202020%20-%20d%C3%A9onto.pdf"
  ["2019-11"]="Nov%202019%20d%C3%A9onto.pdf"
  ["2019-05"]="Mai%202019%20d%C3%A9onto.pdf"
  ["2018-11"]="Nov%202018%20d%C3%A9onto.pdf"
  ["2018-05"]="Mai%202018%20d%C3%A9onto.pdf"
)
for s in "${!SUJETS[@]}"; do
  out="$A/DEC_E1_${s}_sujet.pdf"
  [ -s "$out" ] && continue
  echo "-> $s"
  curl -fsSL "$BASE/${SUJETS[$s]}" -o "$out" || echo "ECHEC $s"
done

RBASE="https://siec.education.fr/candidats/docutheque/download/diplome-dexpertise-comptable-dec-rapports-de-jury"
declare -A RAPPORTS=(
  ["2026-05"]="DEC%20Rapport%20du%20jury%20session%20mai%202026%20VDEF.pdf"
  ["2025-11"]="DEC%20Rapport%20du%20jury%20session%20novembre%202025.pdf"
  ["2025-05"]="DEC%20Rapport%20du%20jury%20session%20mai%202025%20VDEF.pdf"
  ["2024-11"]="DEC%20Rapport%20du%20jury%20session%20novembre%202024.pdf"
  ["2024-05"]="DEC%20Rapport%20du%20jury_session%20mai%202024.pdf"
)
for s in "${!RAPPORTS[@]}"; do
  out="$R/rapport_jury_${s}.pdf"
  [ -s "$out" ] && continue
  echo "-> rapport $s"
  curl -fsSL "$RBASE/${RAPPORTS[$s]}" -o "$out" || echo "ECHEC rapport $s"
done

# Extraction texte
mkdir -p "$A/txt" "$R/txt"
for f in "$A"/*.pdf; do pdftotext -layout "$f" "$A/txt/$(basename "${f%.pdf}").txt" 2>/dev/null || true; done
for f in "$R"/*.pdf; do pdftotext -layout "$f" "$R/txt/$(basename "${f%.pdf}").txt" 2>/dev/null || true; done
echo "OK"
