#!/usr/bin/env bash
# Проверка дрейфа дизайн-системы: packages/theme/* — ручная копия файлов из
# репозитория YakkasaroyFinance (единый источник токенов — палитра C).
# Запуск: ./scripts/check-theme-sync.sh [путь-к-YakkasaroyFinance]
# Пока пакет не публикуется (план — GitHub Packages), синхронизация ручная:
# правишь тему в Finance → копируешь сюда → прогоняешь этот скрипт.
set -u
FIN="${1:-../YakkasaroyFinance}"
if [ ! -d "$FIN/src/theme" ]; then
  echo "⚠️  Репозиторий Finance не найден по пути: $FIN (передайте путь аргументом)"; exit 2
fi
declare -A MAP=(
  [theme.js]="$FIN/src/theme/theme.js"
  [styles.js]="$FIN/src/theme/styles.js"
  [css.js]="$FIN/src/theme/css.js"
  [format.ts]="$FIN/src/utils/format.ts"
  [useIsMobile.js]="$FIN/src/hooks/useIsMobile.js"
)
rc=0
for f in "${!MAP[@]}"; do
  if diff -q "packages/theme/$f" "${MAP[$f]}" >/dev/null 2>&1; then
    echo "✓ $f — синхронизирован"
  else
    echo "✗ $f — ОТЛИЧАЕТСЯ от ${MAP[$f]}"; rc=1
  fi
done
[ $rc -eq 0 ] && echo "Дрейфа темы нет." || echo "Есть дрейф темы — синхронизируйте копии (источник: Finance)."
exit $rc
