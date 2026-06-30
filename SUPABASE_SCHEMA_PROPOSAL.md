# Проект схемы под Supabase — restaurant-модуль (на основе референса restaurant-pos)

> **Статус: ПРЕДЛОЖЕНИЕ / черновик.** Документ-разбор, не применять к БД. Источник —
> SurrealQL-схема референса `migrations/latest.surql` (94 таблицы, ahmedali5530/restaurant-pos,
> reference-only). Цель — перенести *идеи и модель данных* на наш стек
> (Supabase: PostgreSQL + RLS), а не копировать код.
>
> Деньги в restaurant-модуле, где они пересекаются с финконтуром, должны в итоге
> ходить через Реестр `fp_register` (см. CLAUDE.md YakkasaroyFinance). Здесь — модель
> операционного слоя (меню/склад/кухня/заказы), а точки стыка с ФП отмечены явно.

---

## 0. TL;DR — 7 ключевых решений при переносе

1. **`record<x>` → `uuid REFERENCES x(id)`.** Прямой перевод ссылок.
2. **Массив ссылок на родителе → FK на ребёнке.** В Surreal `order.items: array<record<order_item>>`
   хранит список ссылок на родителе. В Postgres это анти-паттерн: держим `order_item.order_id`
   и выбираем детей запросом. Это самый частый разворот по всей схеме.
3. **`TYPE RELATION IN..OUT` → junction-таблица** с двумя FK + атрибутами (`menu_item_modifier_group`).
4. **`SCHEMALESS` / `ANY` / `any` → `jsonb`.** Гибкие поля (`modifiers`, `delivery`, `conditions`,
   `denominations`, `payments_data`) кладём в `jsonb`, но всё, что фильтруется/джойнится, — нормализуем в колонки.
5. **`float` → `numeric`.** Деньги — `numeric(14,4)`, количества — `numeric(14,3)`. Никаких `float`.
6. **`deleted_at` → `is_archived` + `archived_at`** (наша конвенция, архив вместо удаления).
7. **PERMISSIONS NONE → RLS.** В оригинале прав нет (offline-first, защита на уровне приложения/синка).
   У нас — RLS на родных функциях (`my_role()`, `has_location_access()` и т. п.).

И две вещи, которых в оригинале **нет**, а нам нужны:

- **Таблица остатков склада.** В референсе on-hand нигде не хранится — он *вычисляется* из ленты
  движений. Предлагаю явный **stock-леджер `inv_stock_move` + материализованный баланс
  `inv_stock`**, балансы поддерживаются триггером (та же идея, что `fp_register` в финансах).
- **Точка/филиал как первоклассная сущность** (`location_id` везде). В оригинале мультиточечности
  почти нет (есть `inventory_store` и одинокий `branch_id` на скидке). У нас каждая запись привязана к точке.

---

## 1. Сквозные конвенции (для всех таблиц)

```sql
-- общий «скелет» каждой таблицы
id          uuid primary key default gen_random_uuid(),
location_id uuid not null references location(id),   -- точка/филиал (наша добавка)
outer_id    text,                                     -- для интеграций (iiko и пр.)
is_archived boolean not null default false,
archived_at timestamptz,
created_at  timestamptz not null default now(),
created_by  uuid references profiles(id),
updated_at  timestamptz not null default now()        -- триггер-обновлятор
```

- **Числовые порядки строк** (`priority`, `sort_order`, `position`) — `int`, оставляем как есть.
- **Перечисления** в Surreal сделаны через `ASSERT $value INSIDE [...]`. В Postgres — `CHECK (col IN (...))`
  (предпочтительно) или `enum`-тип. CHECK гибче для эволюции, enum — строже; берём CHECK.
- **Бизнес-номера документов** (`invoice_number`, `po_number`, `auto_id`, `session_number`) с `UNIQUE`
  в оригинале — у нас делаем `sequence` per-location или генерируем в RPC, `UNIQUE (location_id, doc_number)`.

---

## 2. Карта соответствия: 94 таблицы Surreal → модули Postgres

| Модуль | Таблицы оригинала | Заметка по переносу |
|---|---|---|
| **Меню/каталог** | `category`, `menu`, `menu_item`, `menu_menu_item`, `modifier`, `modifier_group`, `menu_item_modifier_group`, `extras`/`extra`, `tax` | `menu_menu_item`/`menu_item_modifier_group` → junction; `photo/dish_photo` (bytes) → Supabase Storage |
| **Склад** | `inventory_item`, `inventory_category`, `inventory_store`, `inventory_supplier`, `inventory_item_group(_item)` | + **новые** `inv_stock`, `inv_stock_move` (остатки/леджер) |
| **Движения склада** | `inventory_purchase(_item)`, `inventory_purchase_order(_item)`, `inventory_purchase_payment`, `inventory_purchase_return(_item)`, `inventory_issue(_item)`, `inventory_issue_return(_item)`, `inventory_item_waste(_item)`, `stock_transfer(_item)` | каждый документ-движение пишет строки в `inv_stock_move` |
| **Техкарты (продажа)** | `menu_item_recipe` | BOM: блюдо → ингредиенты; списание при продаже |
| **Производство (ПФ)** | `recipe`, `recipe_item`, `recipe_output`, `production_batch`, `production_batch_input`, `production_batch_output` | многовыходные рецепты, yield %, распределение себестоимости |
| **Кухня/KDS** | `kitchen`, `workflow`, `workflow_stage`, `order_item_kitchen`, `printer` | маршрутизация позиций по станциям и этапам |
| **Сверка кухни** | `kitchen_reconciliation(_item)`, `kitchen_reconciliation_revision`, `kitchen_stock_count`, `kitchen_waste`, `kitchen_staff_meal`, `kitchen_complimentary_item` | theoretical vs physical → variance |
| **Буфет/туйхона** | `buffet_session`, `buffet_menu(_item)`, `buffet_production_batch`, `buffet_stock_snapshot`, `buffet_guest_count`, `buffet_consumption_log`, `buffet_waste_log` | себестоимость на гостя, отклонения |
| **Заказы** | `order`, `order_item`, `order_item_kitchen`, `order_payment`, `order_discount`, `order_coupon`, `order_refund`, `order_void`, `order_split`, `order_merge`, `order_extras`, `order_meta`, `order_type` | сердце POS |
| **Скидки/купоны** | `discount`, `discount_reason`, `coupon`, `coupon_redemption`, `role_discount_policy` | движок скидок (богатый) |
| **Зал** | `floor`, `floor_table` | план зала (x/y/размеры) |
| **Касса/смены** | `day_closing`, `shift`, `time_entry`, `tip_distribution(_user_share)` | закрытие дня, чаевые, табель |
| **Клиенты** | `customer`, `customer_address` | CRM-лайт |
| **Платежи (шлюзы)** | `payment_type`, `payment_type_gateway_config`, `payment_webhook` | конфиги шлюзов — секреты в Vault, не в таблице |
| **Пользователи/права** | `user`, `user_role`, `auth_permission`, `setting` | `user` → Supabase Auth + `profiles`; права → RLS |
| **Прочее** | `document`, `notes`, `tracking`, `workflow`/`workflow_stage` | `document.content` (bytes) → Storage; `tracking` → аналитика/опц. |

---

## 3. Склад: остатки как леджер (главная рекомендация)

В референсе нет таблицы «сколько лежит на складе». Остаток получают, проходя по всем документам
(закупки + / выдачи − / трансферы ± / производство ± / списания − ), а `kitchen_reconciliation`
отдельно считает «ожидаемый» остаток и сверяет с физическим. Это устойчиво (всегда видно «из чего»
получился остаток), но дорого пересчитывать.

Предлагаю как в финконтуре (`fp_register`): **единая лента движений + материализованный баланс на триггере.**

```sql
-- единица учёта склада
create table inv_item (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id),
  category_id uuid references inv_category(id),
  code text, name text not null,
  uom text,                                   -- единица измерения
  item_types text[] not null default '{raw}', -- raw | semi | sale | ... (из item_types)
  average_price numeric(14,4),                -- скользящая средняя себестоимость
  is_archived boolean not null default false
);

create table inv_store (                      -- склад/точка хранения внутри локации
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id),
  name text not null
);

-- ЛЕНТА ДВИЖЕНИЙ (источник истины остатка)
create table inv_stock_move (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id),
  store_id uuid not null references inv_store(id),
  item_id  uuid not null references inv_item(id),
  qty      numeric(14,3) not null,            -- + приход / − расход
  unit_cost numeric(14,4) not null default 0,
  -- источник движения (ровно один из *_id заполнен) — полиморфная ссылка на документ
  source_kind text not null check (source_kind in
    ('purchase','purchase_return','issue','issue_return','transfer_in','transfer_out',
     'production_in','production_out','waste','sale_deduction','reconciliation','adjust')),
  source_id uuid,                             -- id документа-источника
  business_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);
create index on inv_stock_move (item_id, store_id, business_date);

-- МАТЕРИАЛИЗОВАННЫЙ БАЛАНС (производное от ленты; пишет триггер на inv_stock_move)
create table inv_stock (
  location_id uuid not null references location(id),
  store_id uuid not null references inv_store(id),
  item_id  uuid not null references inv_item(id),
  on_hand  numeric(14,3) not null default 0,
  avg_cost numeric(14,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (store_id, item_id)
);
```

- Любой документ (закупка/выдача/трансфер/производство/списание/продажа) **не пишет остаток руками** —
  он вставляет строки в `inv_stock_move`, а триггер обновляет `inv_stock.on_hand` и скользящую `avg_cost`.
- Запрет ухода в минус, блокировка закрытого периода — на триггере/CHECK (как в финконтуре).
- `kitchen_reconciliation` тогда становится «фотографией» (opening/issued/theoretical/physical/variance),
  а не альтернативным учётом — ровно как у нас Контроль средств производный от привязок.

---

## 4. Техкарты и списание по рецептуре

Два независимых механизма — оба полезны, не путать:

### 4.1 Списание ингредиентов при продаже блюда (`menu_item_recipe`)
Прямая BOM «блюдо → сырьё». При продаже позиции списываем ингредиенты со склада кухни.

```sql
create table menu_item_recipe (        -- строка техкарты блюда
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_item(id),
  item_id uuid not null references inv_item(id),   -- ингредиент
  quantity numeric(14,3) not null,                 -- расход на 1 порцию
  cost numeric(14,4) not null default 0,           -- себестоимость строки (кэш)
  is_price_locked boolean default false
);
```
При закрытии заказа/выдаче на кухню: на каждую `order_item` → читаем `menu_item_recipe` блюда →
пишем `inv_stock_move(source_kind='sale_deduction', qty = −quantity*порции)`. Это и есть
«theoretical consumption», с которым потом сверяется физический остаток.

### 4.2 Производство полуфабрикатов (`recipe` + `production_batch`)
Более богатая модель: рецепт с **несколькими выходами**, процентом выхода (`yield_percent`) и
распределением себестоимости (`cost_allocation = yield | value`). Нужна для заготовок (соусы,
тесто, бульоны), где из входного сырья получается ПФ + опционально побочный продукт/отходы.

```sql
create table recipe (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id),
  code text, name text not null,
  base_batch_qty numeric(14,3) not null default 1,
  cost_allocation text not null default 'yield' check (cost_allocation in ('yield','value')),
  primary_output_id uuid,            -- FK на recipe_output (основной выход)
  is_active boolean not null default true
);
create table recipe_item (           -- вход (сырьё)
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipe(id) on delete cascade,
  item_id uuid not null references inv_item(id),
  quantity numeric(14,3) not null,
  sort_order int not null default 0
);
create table recipe_output (         -- выход(ы): ПФ / побочка / отход
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipe(id) on delete cascade,
  item_id uuid not null references inv_item(id),
  yield_percent numeric(6,3) not null,
  disposition text not null default 'inventory' check (disposition in ('inventory','waste')),
  value_weight numeric(8,3) not null default 1,   -- вес для cost_allocation='value'
  is_primary boolean not null default false,
  sort_order int not null default 0
);
-- production_batch / _input / _output — фактический запуск рецепта:
--   списывает входы (production_out) и приходует выходы (production_in) в inv_stock_move,
--   считает total_input_cost, распределяет на выходы по yield/value, пишет yield_loss_percent.
```

> Для Yakkasaroy это и есть «техкарта/калькуляционная карта». Рекомендация: **§4.1 — обязательный
> минимум** (фудкост и теоретическое списание), **§4.2 — когда появится цех заготовок**.

---

## 5. Кухня / KDS

```sql
create table kitchen (               -- станция (бар, горячий, холодный…)
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id),
  name text not null, priority int not null default 0
);
create table kitchen_menu_item (     -- какие блюда готовит станция (был массив items)
  kitchen_id uuid references kitchen(id),
  menu_item_id uuid references menu_item(id),
  primary key (kitchen_id, menu_item_id)
);
create table workflow (              -- набор этапов приготовления
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id), name text not null
);
create table workflow_stage (        -- упорядоченные этапы (Новый→Готовится→Готово)
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow(id) on delete cascade,
  kitchen_id uuid references kitchen(id),
  name text not null, sequence int not null default 1,
  is_terminal boolean not null default false
);
create table order_item_kitchen (    -- маршрут позиции на станцию + текущий этап (ядро KDS)
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_item(id) on delete cascade,
  kitchen_id uuid not null references kitchen(id),
  workflow_id uuid references workflow(id),
  stage_id uuid references workflow_stage(id),
  stage_name text, sequence int default 0,
  status text default 'pending',     -- pending → in_progress → done
  is_terminal boolean default false,
  started_at timestamptz, activated_at timestamptz, completed_at timestamptz,
  completed_by uuid[] default '{}'
);
create index on order_item_kitchen (kitchen_id, status);
```
KDS-экран = выборка `order_item_kitchen` по `kitchen_id` и `status` (есть индекс `oik_kitchen_status`).
**Realtime Supabase** на `order_item_kitchen` заменяет offline-синхронизацию оригинала — экран кухни
обновляется по подписке на изменения строк.

---

## 6. Заказы (ядро POS)

- `order` — шапка: тип, стол/этаж, кассир, клиент, скидки/налоги/сервис-сбор/чаевые, статус, `invoice_number`.
  Поля `delivery`, `tags` → `jsonb`/`text[]`.
- `order_item` — строки: блюдо, кол-во, цена, `modifiers` (в оригинале `any` → **`jsonb`** —
  снимок выбранных модификаторов на момент продажи; цена фиксируется), `level`/`position`/`seat`/`current_sequence`.
- Спутники-документы (один-ко-многим, каждый своей таблицей): `order_payment`, `order_discount`,
  `order_coupon`, `order_refund`, `order_void`, `order_extras`. `order_split`/`order_merge` —
  журналы операций разделения/объединения счетов (хранят old/new в `jsonb`).
- **Деньги:** `order_payment.amount` и закрытие дня `day_closing` — точки стыка с финконтуром.
  При закрытии смены выручка должна попадать в доход и далее в `fp_register` (продажи → касса/счёт ДС).
  В оригинале это `day_closing` (наличные/деноминации/расходы дня) — у нас заменяется/связывается с ФП.

> Тонкость переноса: в `order` поля-массивы (`items`, `payments`, `extras`) — это списки ссылок.
> В Postgres их **не** держим на `order`; вместо этого `order_item.order_id`, `order_payment.order_id` и т. д.

---

## 7. Буфет / туйхона (готовый расчёт себестоимости на гостя)

Очень близко к нашим туйхонам — стоит изучить и перенести почти как есть:

- `buffet_session` — сессия (дата, тип breakfast/lunch/dinner, ожид./факт. гостей, цена, статус-машина
  draft→planned→in_progress→closing→closed→voided, `posted_to_ledger`).
- `buffet_menu`/`buffet_menu_item` — что подаётся, `per_guest_qty` через `recipe`.
- `buffet_production_batch` — план/факт производства блюд линии (связь с `production_batch`).
- `buffet_stock_snapshot` — срезы остатка start/end/refill (UNIQUE по session+item+type).
- `buffet_guest_count` — счётчики гостей (expected/actual/checkpoint).
- `buffet_consumption_log` — итог по позиции: produced/leftover/waste/staff_meal/theoretical_guest →
  total_consumed, total_food_cost, unit_food_cost, **variance** (теория vs факт), `posted_to_ledger`.
- `buffet_waste_log` — отходы линии (со ссылкой на складское списание).

`posted_to_ledger` повсюду → это и есть «проведено в учёт»: при закрытии сессии расход проводится
в `inv_stock_move` и (в нашем случае) себестоимость уходит в финконтур.

---

## 8. Yakkasaroy-специфичные адаптации (обязательные)

1. **Точка/филиал.** Добавить `location_id` во все таблицы; RLS через `has_location_access()`.
2. **Деньги через Реестр.** Продажи (`order_payment`/`day_closing`) и себестоимость списаний — точки,
   где операционный слой проводится в `fp_register`. Балансы (касса, склад) — производные леджеров, не пишутся руками.
3. **RLS на родных функциях** (`my_role`, `is_fin_admin`, `has_location_access`, `holds_position`) —
   на каждую новую таблицу, как в финконтуре. В оригинале прав нет вообще.
4. **Auth.** `user`/`user_role`/PIN-вход → Supabase Auth + `profiles` (роль) + наши таблицы прав.
   `password`/`login_method=pin` из оригинала не переносим в открытом виде.
5. **Деньги — `numeric(14,4)`, количества — `numeric(14,3)`.** Никаких `float` (в оригинале всё float).
6. **bytes → Storage.** `document.content`, `menu_item.photo/dish_photo` (BLOB в БД) → Supabase Storage, в таблице — путь.
7. **Секреты шлюзов.** `payment_type_gateway_config` (client_secret, secret_key, webhook_secret) —
   в Supabase Vault / env, не открытыми колонками.
8. **Реалтайм вместо синка.** Offline-first (IndexedDB+SurrealDB+sync-service) оригинала заменяем
   Supabase Realtime (KDS, статусы заказов). Полноценный офлайн — отдельное решение, не из коробки.
9. **Термины ХМС не трогаем**; UI — на русском.

---

## 9. Что НЕ переносить / упростить на старте

- `tracking` (аналитика кликов), `payment_webhook`/шлюзы — позже, по мере надобности.
- `auth_permission`, `setting` (key/value на юзера) — заменяются нашей моделью прав/настроек.
- `order_merge`/`order_split`, `kitchen_reconciliation_revision` (журнал ревизий) — вторая очередь.
- `notes`, `extra`/`extras` дублирующие — пересмотреть, возможно свести.
- Печать (`printer`/`prints`) — в референсе вырезан сервис печати; модель оставить как справочник.

## 10. Предлагаемый порядок миграций (MVP → расширение)

1. **Справочники:** `location`, `inv_category`, `inv_item`, `inv_store`, `tax`, `category`.
2. **Меню:** `menu`, `menu_item`, `modifier_group`, `modifier`, `menu_item_modifier_group`, `menu_item_recipe`.
3. **Склад-леджер:** `inv_stock_move` + `inv_stock` + триггеры баланса; документы `inventory_purchase/issue/transfer/waste`.
4. **Заказы:** `order_type`, `order`, `order_item`, `order_payment` (+ списание по §4.1 в `inv_stock_move`).
5. **KDS:** `kitchen`, `workflow`, `workflow_stage`, `order_item_kitchen` + Realtime.
6. **Сверка кухни** + **производство** (`recipe*`, `production_batch*`).
7. **Буфет/туйхона.**
8. **Скидки/купоны, касса/смены/чаевые, клиенты** — по приоритету бизнеса.

Каждая миграция — отдельным файлом, с RLS на новых таблицах и (для леджера/триггеров) pgTAP-тестом
инварианта (запрет минуса, неизменяемость проведённого) — по нашему Definition of Done.
