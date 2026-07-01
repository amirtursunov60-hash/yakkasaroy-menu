# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **ВСЕГДА отвечать заказчику в чате на русском языке** (требование заказчика).

## О проекте

`yakkasaroy-menu` — публичное меню и POS-модуль «Ресторан» сети «Яккасарой». Отдельное Vite + React 18 + Tailwind v4 приложение, деплой на Vercel (`https://yakkasaroy-menu.vercel.app`). **Встраивается в основное приложение YakkasaroyFinance через iframe** (`src/modules/restaurant/RestaurantModule.jsx` там): корень `/` — публичное меню, `#/restaurant` — POS-каркас (вкладки: Меню, Заказы, Сводка, Кухня, Доставка, Закрытие смены, Склад, Управление, Отчёты, Чаевые).

## Команды

```bash
npm install
npm run dev        # Vite dev-сервер
npm run build      # сборка (это же — гейт CI)
npm run preview
./scripts/check-theme-sync.sh [путь-к-YakkasaroyFinance]  # проверка дрейфа темы
```

## Правила

- **Дизайн-система — копия из YakkasaroyFinance.** `packages/theme/` (`theme.js`, `styles.js`, `css.js`, `format.ts`, `useIsMobile.js`) — побайтовые копии файлов Finance (источник истины — Finance: `src/theme/*`, `src/utils/format.ts`, `src/hooks/useIsMobile.js`). Тему НЕ править здесь локально: правка идёт в Finance, затем копируется сюда; сверка — `scripts/check-theme-sync.sh`. План — вынести в публикуемый пакет `@yakkasaroy/theme`.
- **Интеграция с Финансом — postMessage.** Родитель шлёт тему/язык (`source: "yk-finance"`), мы отвечаем ready-хендшейком (`"yk-restaurant"`/`"yk-menu"`). Протокол не ломать; изменения согласовывать с `RestaurantModule.jsx` в Finance.
- **Язык интерфейса — русский**, все надписи и комментарии на русском. Мобильная адаптация обязательна (гости и персонал — с телефонов).
- Цвета — только из палитры `C` пакета темы, обе темы (dark/light) должны работать.
- Рабочий процесс: изменения через PR в `main` (CI — сборка), напрямую в `main` не пушить.
