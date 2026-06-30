// Данные «Заказов» — пока локальный мок, но за асинхронной функцией listOrders(),
// чтобы переход на общий Supabase был заменой ОДНОЙ функции (без правок UI).
// Структура близка к таблице order/order_item из SUPABASE_SCHEMA_PROPOSAL.md.

export const ORDER_STATUS = {
  new:     { label: "Новый",     tone: "info" },
  cooking: { label: "Готовится", tone: "warning" },
  ready:   { label: "Готов",     tone: "green" },
  served:  { label: "Подан",     tone: "sub" },
  paid:    { label: "Оплачен",   tone: "money" },
};

export const ORDER_TYPES = { hall: "В зале", takeaway: "С собой", delivery: "Доставка" };

const ORDERS_SEED = [
  { id: "o1", number: 1042, type: "hall",     table: "12", status: "cooking", createdAt: "12:41",
    items: [ { name: "Лагман", qty: 2, price: 38 }, { name: "Чай чёрный", qty: 2, price: 8 }, { name: "Самса", qty: 3, price: 12 } ] },
  { id: "o2", number: 1043, type: "hall",     table: "5",  status: "new",     createdAt: "12:47",
    items: [ { name: "Плов", qty: 1, price: 45 }, { name: "Шакароб", qty: 1, price: 18 } ] },
  { id: "o3", number: 1044, type: "takeaway", table: null, status: "ready",   createdAt: "12:49",
    items: [ { name: "Капучино", qty: 2, price: 22 }, { name: "Чизкейк", qty: 1, price: 35 } ] },
  { id: "o4", number: 1045, type: "delivery", table: null, status: "cooking", createdAt: "12:52",
    items: [ { name: "Шашлык говядина", qty: 4, price: 40 }, { name: "Лепёшка", qty: 2, price: 6 }, { name: "Кола", qty: 2, price: 12 } ] },
  { id: "o5", number: 1046, type: "hall",     table: "8",  status: "served",  createdAt: "12:55",
    items: [ { name: "Манты", qty: 2, price: 34 }, { name: "Айран", qty: 2, price: 9 } ] },
  { id: "o6", number: 1041, type: "hall",     table: "3",  status: "paid",    createdAt: "12:30",
    items: [ { name: "Латте", qty: 1, price: 24 }, { name: "Круассан", qty: 2, price: 16 } ] },
];

export const orderTotal = (o) => o.items.reduce((s, i) => s + i.qty * i.price, 0);
export const orderQty = (o) => o.items.reduce((s, i) => s + i.qty, 0);

// Единая точка доступа. Позже здесь будет запрос к Supabase
// (supabase.from('order').select('*, items:order_item(*)')…), сигнатура не меняется.
export async function listOrders() {
  return ORDERS_SEED;
}
