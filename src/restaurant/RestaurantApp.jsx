import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "@theme";

// ============================================================
//  РЕСТОРАН-МОДУЛЬ (новый) — каркас в стиле Яккасарой Финанс.
//  Живёт в репо pos-and-menu, деплоится в тот же Vercel-проект
//  (yakkasaroy-menu.vercel.app), открывается по маршруту #/restaurant
//  и встраивается во вкладку «Ресторан» Финанса через iframe.
//  Дизайн берётся из общего пакета @yakkasaroy/theme.
// ============================================================

// Планируемые разделы (по SUPABASE_SCHEMA_PROPOSAL.md). Пока заглушки —
// наполняем по дорожной карте на общем Supabase.
const SECTIONS = [
  { icon: "🧾", title: "Заказы", desc: "Столы, позиции, оплаты, скидки" },
  { icon: "🪑", title: "Столы / Зал", desc: "План зала, статусы столов" },
  { icon: "🍽️", title: "Меню", desc: "Блюда, категории, модификаторы" },
  { icon: "📦", title: "Склад", desc: "Остатки-леджер, закупки, списания" },
  { icon: "📋", title: "Техкарты", desc: "Списание по рецептуре, фудкост" },
  { icon: "🔥", title: "Кухня · KDS", desc: "Маршрут позиций по станциям" },
  { icon: "🍲", title: "Буфет / туйхона", desc: "Себестоимость на гостя" },
  { icon: "⏱️", title: "Смены", desc: "Табель, чаевые, закрытие дня" },
];

function Shell() {
  const { C, isMobile } = useTheme();

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, padding: isMobile ? 14 : 28 }}>
      {/* Шапка */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: isMobile ? 16 : 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center",
          background: C.brandSoft || C.panel, fontSize: 24,
        }}>🍽️</div>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.text }}>Ресторан</h1>
          <div style={{ fontSize: 13, color: C.textDim }}>Модуль в разработке · на общем Supabase Яккасарой</div>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999,
          background: C.warningSoft || C.panel, color: C.warning || C.text, border: `1px solid ${C.line}`,
        }}>v0 · каркас</span>
      </header>

      {/* Карточки разделов */}
      <div style={{
        display: "grid", gap: isMobile ? 10 : 14,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))",
      }}>
        {SECTIONS.map((s) => (
          <div key={s.title} style={{
            background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: 16, display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>{s.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.textDim }}>{s.desc}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, opacity: 0.7 }}>скоро</div>
            </div>
          </div>
        ))}
      </div>

      <footer style={{ marginTop: 28, fontSize: 12, color: C.textDim }}>
        Дизайн и правила — Яккасарой Финанс (пакет <code>@yakkasaroy/theme</code>). Тема синхронизируется с Финансом.
      </footer>
    </div>
  );
}

export default function RestaurantApp() {
  // Тема/язык от Финанса (родитель iframe) через postMessage; по умолчанию dark/ru.
  const [ext, setExt] = useState({ theme: undefined, lang: undefined });

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (d && d.source === "yk-finance" && (d.theme || d.lang)) {
        setExt({ theme: d.theme, lang: d.lang });
      }
    };
    window.addEventListener("message", onMsg);
    // сообщаем родителю, что готовы принять тему
    try { window.parent?.postMessage({ source: "yk-restaurant", ready: true }, "*"); } catch { /* нет родителя */ }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <ThemeProvider theme={ext.theme} lang={ext.lang}>
      <Shell />
    </ThemeProvider>
  );
}
