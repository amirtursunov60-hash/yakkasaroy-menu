import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useTheme, fmt } from "@theme";
import { listOrders, orderTotal, orderQty, ORDER_STATUS, ORDER_TYPES } from "../data/orders.js";

// Экран «Заказы» — карточки в стиле Финанса (рекомендация заказчика: карточки, не таблицы).
// Данные через listOrders() — позже общий Supabase, UI не меняется.
export function OrdersSection() {
  const { C, isMobile } = useTheme();
  const [orders, setOrders] = useState(null);

  useEffect(() => { let on = true; listOrders().then((r) => { if (on) setOrders(r); }); return () => { on = false; }; }, []);

  const toneColor = (tone) => ({ info: C.info, warning: C.warning, green: C.green, money: C.money, sub: C.sub }[tone] || C.sub);

  return (
    <div style={{ padding: isMobile ? 14 : 24 }}>
      {/* Шапка раздела */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.text }}>Заказы</h2>
        <span style={{ fontSize: 13, color: C.sub }}>{orders ? `${orders.length} активных` : "загрузка…"}</span>
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
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
      }}>
        {(orders || []).map((o) => {
          const st = ORDER_STATUS[o.status] || ORDER_STATUS.new;
          const tc = toneColor(st.tone);
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
                }}>{st.label}</span>
              </div>

              {/* Мета: тип/стол/время */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, color: C.sub }}>
                <span>{ORDER_TYPES[o.type] || o.type}</span>
                {o.table && <span>· Стол {o.table}</span>}
                <span>· {o.createdAt}</span>
              </div>

              {/* Позиции */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {o.items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", fontSize: 13, color: C.text }}>
                    <span style={{ color: C.sub, minWidth: 28 }}>{it.qty}×</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                    <span style={{ color: C.sub }}>{fmt(it.qty * it.price)}</span>
                  </div>
                ))}
              </div>

              {/* Итог */}
              <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: "auto" }}>
                <span style={{ fontSize: 13, color: C.sub }}>{orderQty(o)} поз.</span>
                <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 16, color: C.money }}>{fmt(orderTotal(o))}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
