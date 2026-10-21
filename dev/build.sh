#!/usr/bin/env bash
# Сборка index.html из исходников: base.html → телефон → Billz Сергели → сверка/склад → шим Supabase
set -e
cd "$(dirname "$0")"
cp base.html /tmp/kassa_work.html
python3 patch_mobile.py /tmp/kassa_work.html
python3 patch_billz.py /tmp/kassa_work.html
python3 patch_bz.py /tmp/kassa_work.html
python3 build.py /tmp/kassa_work.html ../index.html
echo "index.html собран"
