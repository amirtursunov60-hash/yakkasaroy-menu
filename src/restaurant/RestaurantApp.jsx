import { useState, useEffect, useRef } from "react";
import { ThemeProvider, useTheme } from "@theme";

// ============================================================
//  РЕСТОРАН-МОДУЛЬ (новый) — каркас в стиле Яккасарой Финанс.
//  Живёт в репо pos-and-menu, деплоится в тот же Vercel-проект
//  (yakkasaroy-menu.vercel.app), открывается по маршруту #/restaurant
//  и встраивается во вкладку «Ресторан» Финанса через iframe.
//  Навигация — ГОРИЗОНТАЛЬНАЯ, вкладки повторяют оригинал restaurant-pos.
// ============================================================

// Вкладки 1:1 с интерфейсом оригинала (см. скриншот заказчика).
const TABS = [
  { key: "menu",      icon: "🍽️", label: "Меню" },
  { key: "orders",    icon: "🧾", label: "Заказы" },
  { key: "summary",   icon: "📋", label: "Сводка" },
  { key: "kitchen",   icon: "🔥", label: "Кухня" },
  { key: "delivery",  icon: "🛵", label: "Доставка" },
  { key: "shift",     icon: "🏪", label: "Закрытие смены" },
  { key: "stock",     icon: "🏬", label: "Склад" },
  { key: "admin",     icon: "⚙️", label: "Управление" },
  { key: "reports",   icon: "📈", label: "Отчёты" },
  { key: "tips",      icon: "💰", label: "Распр. чаевых" },
  { key: "accounts",  icon: "🧮", label: "Accounts" },
];

function Shell() {
  const { C, st, isMobile } = useTheme();
  const [active, setActive] = useState(TABS[0].key);
  const current = TABS.find((t) => t.key === active) || TABS[0];

  // «Жидкая» стеклянная пилюля под активной вкладкой (как modbar в Финансе):
  // измеряем позицию/ширину активной вкладки и анимированно сдвигаем пилюлю.
  const activeTabRef = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  useEffect(() => {
    const measure = () => {
      const el = activeTabRef.current;
      if (!el) return;
      setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    };
    const r = requestAnimationFrame(measure);
    const t = setTimeout(measure, 240); // повтор после загрузки шрифтов/раскладки
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(r); clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [active, isMobile]);

  return (
    <div style={{ minHeight: "100dvh", background: C.pageGrad, color: C.text, display: "flex", flexDirection: "column" }}>
      {/* Шапка модуля не нужна — контекст «Ресторан» даёт сама вкладка Финанса.
          Сразу показываем горизонтальную ленту вкладок со «стеклянной» пилюлей. */}
      <nav className="modbar" style={{ ...st.modBar, position: "relative", top: 0, margin: isMobile ? "12px 12px 0" : "16px 24px 0" }}>
        <div className="modpill" style={{ ...st.modPill, left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }} />
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <div
              key={t.key}
              ref={on ? activeTabRef : null}
              className="mod"
              style={{ ...st.mod, ...(on ? st.modActive : {}) }}
              onClick={() => setActive(t.key)}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span><span>{t.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Контент выбранной вкладки (пока заглушка) */}
      <main style={{ flex: 1, padding: isMobile ? 16 : 28 }}>
        <div style={{
          background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
          padding: isMobile ? 20 : 40, textAlign: "center", maxWidth: 560, margin: "0 auto",
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{current.icon}</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: C.text }}>{current.label}</h2>
          <p style={{ margin: 0, color: C.sub, fontSize: 14 }}>Раздел в разработке. Подключаем к общему Supabase по дорожной карте.</p>
          <div style={{
            marginTop: 16, display: "inline-block", fontSize: 12, fontWeight: 700,
            padding: "6px 12px", borderRadius: 999,
            background: C.panel2, color: C.warning, border: `1px solid ${C.line}`,
          }}>скоро</div>
        </div>
      </main>
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
        // сохраняем ранее полученные значения: сообщение только с lang не должно
        // обнулять theme (и наоборот) — Финанс может слать поля по отдельности
        setExt((prev) => ({ theme: d.theme ?? prev.theme, lang: d.lang ?? prev.lang }));
      }
    };
    window.addEventListener("message", onMsg);
    try { window.parent?.postMessage({ source: "yk-restaurant", ready: true }, "*"); } catch { /* нет родителя */ }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <ThemeProvider theme={ext.theme} lang={ext.lang}>
      <Shell />
    </ThemeProvider>
  );
}
