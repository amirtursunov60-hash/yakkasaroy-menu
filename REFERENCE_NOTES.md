# REFERENCE_NOTES

> Справочный (reference-only) репозиторий. Это **очищенная копия чужого проекта**,
> сохранённая исключительно для **изучения кода** перед постройкой собственного
> restaurant-модуля на Supabase. **Не запускать, не собирать, не деплоить, в продакшн не тащить.**

## Источник

- **Оригинал:** https://github.com/ahmedali5530/restaurant-pos
- **Дата копирования:** 2026-06-30
- **Что скопировано:** только код, полезный для изучения (см. ниже). Служебный мусор
  (локи зависимостей, инфра запуска, отдельные микросервисы) вырезан.

## Статус лицензии ⚠️

- **Файла LICENSE в оригинале НЕТ.** По умолчанию это означает, что **все права
  принадлежат автору** (ahmedali5530) — открытой лицензии на использование/копирование/
  распространение не предоставлено.
- Поэтому используем строго как **референс для чтения кода**:
  - ❌ не публиковать, не распространять, не деплоить;
  - ❌ не копировать код как есть в продакшн Yakkasaroy;
  - ✅ можно изучать архитектуру, модель данных и подходы, чтобы спроектировать
    **собственную** реализацию на нашем стеке (Supabase / PostgreSQL).
- Этот репозиторий — **приватный**.

## Стек оригинала

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **БД:** SurrealDB (схема на SurrealQL — `DEFINE TABLE / DEFINE FIELD`)
- **Offline-first:** IndexedDB на клиенте + локальный SurrealDB, синхронизация
  (сам sync-сервис в этот референс не переносился — см. ниже)
- Состояние — Jotai; i18n — несколько локалей в `src/locales/` (включая `ru/`)

## Что перенесено (полезное для изучения)

| Путь | Что внутри |
|------|------------|
| `src/` | Вся логика и UI: `api/model` (TS-типы всех сущностей), `screens`, `components`, `store`, `hooks`, `utils`, `locales` |
| `migrations/` | **Схема данных SurrealQL** — инкрементальные `*.surql` + консолидированный `latest.surql` (1642 строки, все таблицы) |
| `docs/` | Документация и скриншоты интерфейса |
| `package.json`, `tsconfig.json`, `tailwind.config.js` | Чтобы понимать стек и зависимости |

## Что НЕ перенесено (мусор / не нужно для изучения ядра)

- `bun.lockb`, `package-lock.json` — локи зависимостей
- `docker-compose.yml`, `.dockerignore`, `nginx.conf` — инфраструктура запуска
- `sync-service/`, `tracking-api/`, `payments/`, `printing/` — отдельные сервисы,
  не относящиеся к ядру (склад/меню/заказы/KDS)
- `.env`, `.eslintrc.cjs`, `scripts/`, `public/`, `index.html`, `vite.config.ts` и пр. — служебное
- `.git/` оригинала — историю автора не тащим (репозиторий начат с нуля)
- `database/` — в оригинале содержит **только файл `LOCK`** (рабочая папка встроенного
  SurrealDB), схемы там нет. **Настоящая схема SurrealQL — в `migrations/latest.surql`.**

## Карта структуры (где что искать)

- **Модель данных (SurrealQL-схема):**
  - `migrations/latest.surql` — полная консолидированная схема (все `DEFINE TABLE`/`DEFINE FIELD`)
  - `migrations/2026_*.surql` — инкрементальные миграции по датам
  - `src/api/model/*.ts` — TS-типы одной сущности на файл (зеркало таблиц БД)
- **Склад / инвентарь:**
  - `src/components/inventory/{items,item_groups,stores,suppliers,purchases,purchase_orders,purchase_returns,issues,issue_returns,stock_transfers,wastes,categories}/`
  - `src/screens/inventory/index.tsx`
  - `src/api/model/inventory_*.ts` (`inventory_item`, `inventory_purchase`, `inventory_store`, `stock_transfer`, `inventory_waste`, …)
- **Техкарты / списание по рецептуре (recipe-based deduction):**
  - `src/components/inventory/recipes/{index,form}.tsx`
  - `src/components/inventory/production/` + `src/api/model/production_batch.ts`
  - `src/api/model/recipe.ts` (Recipe / RecipeItem / RecipeOutput, выход и распределение себестоимости)
  - Отчёты сверки списания: `src/screens/reports/sale.vs.consumption.report.tsx`, `consumption.report.tsx`, `production.report.tsx`
  - Буфет/туйхона (релевантно нашим туйхонам): таблицы `buffet_*` в `latest.surql`, `src/api/model/buffet_*.ts`, `src/components/inventory/buffet/`
- **KDS (кухонный экран):**
  - `src/screens/kitchen.tsx`, `src/screens/order-display.tsx`
  - `src/components/kitchen/kitchen.order.tsx`
  - `src/api/model/kitchen*.ts`, `src/api/model/order_item_kitchen.ts`
- **Модификаторы блюд:**
  - `src/components/menu/modifiers.tsx` (+ `dish.tsx`, `dishes.tsx`)
  - `src/api/model/modifier.ts`, `modifier_group.ts`, `modifier_group_dish.ts`, `dish_modifier_group.ts`, `extra.ts`
