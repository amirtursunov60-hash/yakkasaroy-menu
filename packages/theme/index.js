// @yakkasaroy/theme — единый источник дизайн-системы Яккасарой.
// Сейчас подключается локально (Vite-alias "@theme") в Ресторан-модуле.
// Позже публикуется в GitHub Packages, чтобы Финанс импортировал ровно те же токены.
import React from "react";
import { THEMES, ThemeCtx, useTheme, applyThemeVars } from "./theme.js";
import { makeStyles } from "./styles.js";
import { makeCss } from "./css.js";
import { useIsMobile } from "./useIsMobile.js";

export { THEMES, ThemeCtx, useTheme, applyThemeVars, makeStyles, makeCss, useIsMobile };
export { fmt, fmtShort, avatarColor } from "./format.ts";

// Готовый провайдер: оборачивает приложение, повторяет связку из App.jsx Финанса
// (state темы/языка, isMobile, применение CSS-переменных, инъекция глобального CSS).
// Тему/язык можно переопределить снаружи (через пропсы) — этим Финанс прокидывает
// свою тему в iframe Ресторана по postMessage, чтобы оформление совпадало 1:1.
export function ThemeProvider({ children, theme: themeProp, lang: langProp }) {
  const [themeState, setThemeState] = React.useState(() => {
    try { return localStorage.getItem("yk_theme") || "dark"; } catch { return "dark"; }
  });
  const [langState, setLangState] = React.useState(() => {
    try { return localStorage.getItem("yk_lang") || "ru"; } catch { return "ru"; }
  });

  // внешнее переопределение (от Финанса) имеет приоритет над локальным состоянием
  const theme = themeProp || themeState;
  const lang = langProp || langState;

  const setTheme = (v) => { setThemeState(v); try { localStorage.setItem("yk_theme", v); } catch { /* приватный режим */ } };
  const setLang = (v) => { setLangState(v); try { localStorage.setItem("yk_lang", v); } catch { /* приватный режим */ } };

  const isMobile = useIsMobile();
  const C = THEMES[theme] || THEMES.dark;
  const st = React.useMemo(() => makeStyles(C), [C]);

  React.useEffect(() => { applyThemeVars(C); }, [C]);

  const ctxVal = { C, st, theme, setTheme, lang, setLang, isMobile, profile: null };

  return React.createElement(
    ThemeCtx.Provider,
    { value: ctxVal },
    React.createElement("style", { dangerouslySetInnerHTML: { __html: makeCss(C) } }),
    children
  );
}
