#!/usr/bin/env bash
# Сборка index.html из исходников: base.html → телефон → Billz Сергели → сверка/склад → шим Supabase
set -e
cd "$(dirname "$0")"
cp base.html /tmp/kassa_work.html
python3 patch_mobile.py /tmp/kassa_work.html
python3 patch_billz.py /tmp/kassa_work.html
python3 patch_bz.py /tmp/kassa_work.html
python3 patch_rs.py /tmp/kassa_work.html
python3 patch_fm.py /tmp/kassa_work.html
python3 patch_ui.py /tmp/kassa_work.html
python3 build.py /tmp/kassa_work.html ../index.html
echo "index.html собран"
# Карта кода для Claude (Graphify): зеркало JS из base.html и обновление графа
python3 graph_src.py
if command -v graphify >/dev/null 2>&1; then (cd .. && graphify update . >/dev/null 2>&1 && echo "граф кода обновлён") || echo "граф кода не обновился"; else echo "graphify не установлен — граф не обновлён"; fi
