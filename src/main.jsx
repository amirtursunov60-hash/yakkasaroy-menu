import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import RestaurantApp from "./restaurant/RestaurantApp.jsx";
import "@/index.css";

// Лёгкий hash-роутер (без зависимостей и без SPA-rewrites на Vercel):
//   /            → меню кофейни (как было, не трогаем)
//   /#/restaurant → новый Ресторан-модуль (встраивается в iframe Финанса)
function Root() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  if (hash.startsWith("#/restaurant")) return <RestaurantApp />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
