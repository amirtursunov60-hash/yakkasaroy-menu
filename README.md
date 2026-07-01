# Yakkasaroy Menu / Ресторан

Публичное меню и POS-модуль «Ресторан» сети «Яккасарой Family». Отдельное Vite + React + Tailwind приложение (деплой — Vercel), встраивается в основную систему [YakkasaroyFinance](https://github.com/amirtursunov60-hash/YakkasaroyFinance) через iframe с синхронизацией темы/языка по `postMessage`.

- `/` — публичное меню для гостей
- `#/restaurant` — POS-каркас для персонала (Меню, Заказы, Кухня, Склад, Отчёты…)

## Запуск

```bash
npm install
npm run dev        # dev-сервер
npm run build      # сборка (гейт CI)
```

## Дизайн-система

`packages/theme/` — копия темы из YakkasaroyFinance (источник истины — там). Проверка дрейфа: `./scripts/check-theme-sync.sh`. Правила для разработки — в `CLAUDE.md`.
