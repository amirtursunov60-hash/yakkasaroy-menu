// Данные «Заказов». Модель повторяет структуру референса restaurant-pos
// (order / order_item / order_payment) и наш SUPABASE_SCHEMA_PROPOSAL.md, чтобы при
// подключении общего Supabase это легло один-в-один — заменой одной функции listOrders().
//
// Ключевые принципы (как в референсе):
//  • order_item — СНИМОК на момент продажи: name/price/modifiers фиксируются в позиции.
//  • modifiers — снимок выбранных опций со своей ценой (не ссылка).
//  • несколько платежей на заказ (payable — к оплате по платежу, amount — внесено).
//  • seat — место за столом (деление счёта по гостям).
//  • суммы заказа: налог/сервис-сбор/чаевые/скидка хранятся отдельными полями.

// Статусы заказа — как в референсе (OrderStatus), метки на русском.
export const ORDER_STATUS = {
  pending:     { label: "Ожидает",   tone: "sub" },
  in_progress: { label: "В работе",  tone: "info" },
  paid:        { label: "Оплачен",   tone: "money" },
  refunded:    { label: "Возврат",   tone: "warning" },
  cancelled:   { label: "Отменён",   tone: "danger" },
  split:       { label: "Разделён",  tone: "sub" },
  merged:      { label: "Объединён", tone: "sub" },
};

export const ORDER_TYPES = { hall: "В зале", takeaway: "С собой", delivery: "Доставка" };

// Снимок позиции: модификаторы — массив выбранных опций со своей ценой.
const ORDERS_SEED = [
  {
    id: "o1", number: 1042, autoId: 42, type: "hall", table: "12", covers: 3,
    status: "in_progress", createdAt: "12:41", cashier: "Зухра",
    items: [
      { name: "Лагман", qty: 2, price: 38, seat: "1", modifiers: [{ name: "Острый", price: 0 }] },
      { name: "Самса", qty: 3, price: 12, seat: "2", modifiers: [] },
      { name: "Чай чёрный", qty: 2, price: 8, seat: "1", modifiers: [{ name: "Лимон", price: 2 }] },
    ],
    taxAmount: 0, serviceChargeAmount: 0, tipAmount: 0, discountAmount: 0,
    payments: [],
  },
  {
    id: "o2", number: 1043, autoId: 43, type: "hall", table: "5", covers: 2,
    status: "pending", createdAt: "12:47", cashier: "Зухра",
    items: [
      { name: "Плов", qty: 1, price: 45, seat: "1", modifiers: [{ name: "Доп. мясо", price: 15 }] },
      { name: "Шакароб", qty: 1, price: 18, seat: "1", modifiers: [] },
    ],
    taxAmount: 0, serviceChargeAmount: 0, tipAmount: 0, discountAmount: 0,
    payments: [],
  },
  {
    id: "o3", number: 1044, autoId: 44, type: "takeaway", table: null, covers: null,
    status: "paid", createdAt: "12:49", cashier: "Сабина",
    items: [
      { name: "Капучино", qty: 2, price: 22, seat: null, modifiers: [{ name: "Без сахара", price: 0 }] },
      { name: "Чизкейк", qty: 1, price: 35, seat: null, modifiers: [] },
    ],
    taxAmount: 0, serviceChargeAmount: 0, tipAmount: 0, discountAmount: 0,
    payments: [{ type: "Карта", payable: 79, amount: 79 }],
  },
  {
    id: "o4", number: 1045, autoId: 45, type: "delivery", table: null, covers: null,
    status: "in_progress", createdAt: "12:52", cashier: "Сабина",
    items: [
      { name: "Шашлык говядина", qty: 4, price: 40, seat: null, modifiers: [] },
      { name: "Лепёшка", qty: 2, price: 6, seat: null, modifiers: [] },
      { name: "Кола", qty: 2, price: 12, seat: null, modifiers: [] },
    ],
    taxAmount: 0, serviceChargeAmount: 0, tipAmount: 0, discountAmount: 10,
    payments: [{ type: "Онлайн", payable: 188, amount: 100 }],
  },
  {
    id: "o5", number: 1046, autoId: 46, type: "hall", table: "8", covers: 2,
    status: "in_progress", createdAt: "12:55", cashier: "Зухра",
    items: [
      { name: "Манты", qty: 2, price: 34, seat: "1", modifiers: [] },
      { name: "Айран", qty: 2, price: 9, seat: "2", modifiers: [] },
    ],
    taxAmount: 0, serviceChargeAmount: 8, tipAmount: 0, discountAmount: 0,
    payments: [],
  },
  {
    id: "o6", number: 1041, autoId: 41, type: "hall", table: "3", covers: 2,
    status: "paid", createdAt: "12:30", cashier: "Сабина",
    items: [
      { name: "Латте", qty: 1, price: 24, seat: "1", modifiers: [{ name: "Сироп карамель", price: 5 }] },
      { name: "Круассан", qty: 2, price: 16, seat: "1", modifiers: [] },
    ],
    taxAmount: 0, serviceChargeAmount: 0, tipAmount: 6, discountAmount: 0,
    payments: [{ type: "Наличные", payable: 67, amount: 70 }],
  },
];

// Сумма одной позиции с модификаторами (снимок): qty × (цена + опции).
export const itemLineTotal = (it) =>
  it.qty * (it.price + (it.modifiers || []).reduce((s, m) => s + (m.price || 0), 0));

export const orderQty = (o) => o.items.reduce((s, i) => s + i.qty, 0);
export const orderSubtotal = (o) => o.items.reduce((s, i) => s + itemLineTotal(i), 0);

// Итог как в референсе: позиции + налог + сервис-сбор + чаевые − скидка.
export const orderTotal = (o) =>
  orderSubtotal(o) + (o.taxAmount || 0) + (o.serviceChargeAmount || 0) + (o.tipAmount || 0) - (o.discountAmount || 0);

// Внесено и остаток к оплате (Σ amount; остаток = total − внесено, но не меньше 0).
export const orderPaid = (o) => (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
export const orderBalance = (o) => Math.max(0, orderTotal(o) - orderPaid(o));

// Единая точка доступа. Позже — запрос к общему Supabase
// (supabase.from('order').select('*, items:order_item(*), payments:order_payment(*)')…),
// сигнатура и форма данных не меняются.
export async function listOrders() {
  return ORDERS_SEED;
}
