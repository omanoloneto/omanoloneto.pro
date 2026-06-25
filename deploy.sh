#!/usr/bin/env bash
# Deploy: build + upload de dist/ pro FTP via curl.
# Todas as credenciais vêm de .env ou do ambiente — NADA fica no repo.
#
# Uso:
#   1) cp .env.example .env  e preencha
#   2) ./deploy.sh
set -euo pipefail

# Carrega .env se existir
[ -f .env ] && set -a && . ./.env && set +a

: "${FTP_HOST:?Defina FTP_HOST (.env)}"
: "${FTP_USER:?Defina FTP_USER (.env)}"
: "${FTP_PASS:?Defina FTP_PASS (.env)}"
: "${FTP_DIR:?Defina FTP_DIR (.env)}"

echo "▶ build…"
npm run build

BASE="${FTP_HOST%/}/${FTP_DIR#/}"
echo "▶ upload → $BASE"
cd dist
find . -type f | sort | while IFS= read -r f; do
  rel="${f#./}"
  curl -s --connect-timeout 30 --ftp-create-dirs -T "$f" \
    --user "$FTP_USER:$FTP_PASS" "$BASE/$rel" && echo "  ✓ $rel"
done

echo "✅ deploy completo → https://omanoloneto.pro/"
