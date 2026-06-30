import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useTheme, fmt } from "@theme";
import {
  listOrders, itemLineTotal, orderSubtotal, orderTotal, orderQty, orderPaid, orderBalance,
  ORDER_STATUS, ORDER_TYPES,
} from "../data/orders.js";

// Экран «Заказы» — карточки в стиле Финанса. Модель заказа = референс restaurant-pos
// (снимок позиций с модификаторами, места, несколько платежей, суммы). Данные через
// listOrders() — позже общий Supabase, UI не меняется.
export function OrdersSection() {
  const { C, isMobile } = useTheme();
  const [orders, setOrders] = useState(null);

  useEffect(() => { let on = true; listOrders().then((r) => { if (on) setOrders(r); }); return () => { on = false; }; }, []);

  const toneColor = (tone) => ({ info: C.info, warning: C.warning, green: C.green, money: C.money, danger: C.danger, sub: C.sub }[tone] || C.sub);

  return (
    <div style={{ padding: isMobile ? 14 : 24 }}>
      {/* Шапка раздела */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.text }}>Заказы</h2>
        <span style={{ fontSize: 13, color: C.sub }}>{orders ? `${orders.length} за сегодня` : "загрузка…"}</span>
        <button
          className="btn"
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14,
            background: C.green, color: C.onAccent, border: "none",
          }}
        >
          <Plus size={17} strokeWidth={2.5} />{isMobile ? "Новый" : "Новый заказ"}
        </button>
      </div>

      {/* Сетка карточек */}
      <div style={{
        display: "grid", gap: isMobile ? 10 : 14,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
      }}>
        {(orders || []).map((o) => {
          const stt = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
          const tc = toneColor(stt.tone);
          const balance = orderBalance(o);
          const partlyPaid = orderPaid(o) > 0 && balance > 0;
          return (
            <div key={o.id} style={{
              background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* Верх: номер + статус */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>№{o.number}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                  color: tc, border: `1px solid ${tc}`, background: "transparent",
                }}>{stt.label}</span>
              </div>

              {/* Мета: тип/стол/гости/время/кассир */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, color: C.sub }}>
                <span>{ORDER_TYPES[o.type] || o.type}</span>
                {o.table && <span>· Стол {o.table}</span>}
                {o.covers ? <span>· {o.covers} гост.</span> : null}
                <span>· {o.createdAt}</span>
                {o.cashier && <span>· {o.cashier}</span>}
              </div>

              {/* Позиции (со снимком модификаторов и местом) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {o.items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", fontSize: 13, color: C.text }}>
                      <span style={{ color: C.sub, minWidth: 28 }}>{it.qty}×</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.name}{it.seat ? <span style={{ color: C.sub }}> · место {it.seat}</span> : null}
                      </span>
                      <span style={{ color: C.sub }}>{fmt(itemLineTotal(it))}</span>
                    </div>
                    {(it.modifiers || []).length > 0 && (
                      <div style={{ paddingLeft: 28, fontSize: 12, color: C.sub }}>
                        {it.modifiers.map((m) => m.name + (m.price ? ` (+${fmt(m.price)})` : "")).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Доп. суммы (если есть) */}
              {(o.discountAmount || o.serviceChargeAmount || o.taxAmount || o.tipAmount) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: C.sub, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                  <Row label="Позиции" value={fmt(orderSubtotal(o))} C={C} />
                  {o.discountAmount ? <Row label="Скидка" value={`−${fmt(o.discountAmount)}`} C={C} /> : null}
                  {o.serviceChargeAmount ? <Row label="Сервис-сбор" value={fmt(o.serviceChargeAmount)} C={C} /> : null}
                  {o.taxAmount ? <Row label="Налог" value={fmt(o.taxAmount)} C={C} /> : null}
                  {o.tipAmount ? <Row label="Чаевые" value={fmt(o.tipAmount)} C={C} /> : null}
                </div>
              ) : null}

              {/* Итог + оплата */}
              <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: "auto" }}>
                <span style={{ fontSize: 13, color: C.sub }}>
                  {orderQty(o)} поз.
                  {partlyPaid ? <span style={{ color: C.warning }}> · к оплате {fmt(balance)}</span> : null}
                  {o.status === "paid" ? <span style={{ color: C.money }}> · оплачено</span> : null}
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 16, color: C.money }}>{fmt(orderTotal(o))}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, C }) {
  return (
    <div style={{ display: "flex" }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: C.text }}>{value}</span>
    </div>
  );
}
