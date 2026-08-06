import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { assetUrl } from "../utils/assets";
import { languageOptions, useI18n } from "../i18n";

type TopBarProps = {
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const dark = theme === "dark";
  const { locale, setLocale, t } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const activeLanguage = languageOptions.find((option) => option.value === locale) ?? languageOptions[0];

  useEffect(() => {
    if (!languageOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!languageRef.current?.contains(event.target as Node)) setLanguageOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLanguageOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [languageOpen]);

  return (
    <header className="topbar" data-node-id="140:6846">
      <div className="topbar__left">
        <a className="brand" href="#" aria-label="Lightchain">
          <img className="brand__mark" src={assetUrl("assets/figma-icons/logo-mark.svg")} alt="" />
          <img
            className="brand__wordmark"
            src={assetUrl("assets/figma-icons/logo-wordmark.svg")}
            alt="Lightchain"
          />
        </a>

        <div className="topbar__preferences">
          <div className={`language-control ${languageOpen ? "is-open" : ""}`} ref={languageRef}>
            <button className="language-select" type="button" aria-label={t("选择语言")} aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>
              <FigmaIcon name="global" size={16} />
              <span title={activeLanguage.label}>{activeLanguage.label}</span>
              <FigmaIcon name="chevron-down" size={16} className="language-select__chevron" />
            </button>
            {languageOpen && <div className="language-menu" role="menu" aria-label={t("选择语言")}>
              {languageOptions.map((option) => <button className={option.value === locale ? "is-selected" : ""} type="button" role="menuitemradio" aria-checked={option.value === locale} title={option.label} key={option.value} onClick={() => { setLocale(option.value); setLanguageOpen(false); }}><span>{option.label}</span></button>)}
            </div>}
          </div>

          <IconControl
            label={t(dark ? "切换到浅色模式" : "切换到暗黑模式")}
            tooltipPlacement="bottom"
            onClick={onToggleTheme}
          >
            {dark ? <Moon size={18} strokeWidth={1.7} /> : <Sun size={18} strokeWidth={1.7} />}
          </IconControl>
        </div>
      </div>

      <div className="topbar__actions">
        <button className="topbar-action" type="button">
          <FigmaIcon name="help-center" size={20} />
          <span title={t("帮助中心")}>{t("帮助中心")}</span>
        </button>
        <button className="topbar-action" type="button">
          <FigmaIcon name="customer-support" size={20} />
          <span title={t("联系客服")}>{t("联系客服")}</span>
        </button>
        <button className="credits-button" type="button" data-node-id="160:1082">
          <span title={t("购买积分")}>{t("购买积分")}</span>
          <span className="credits-button__divider" aria-hidden="true" />
          <span className="credits-button__balance">
            <FigmaIcon name="points-star" size={16} />
            99999
          </span>
        </button>
        <IconControl className="avatar" label={t("打开个人中心")} tooltipPlacement="bottom">
          <img src={assetUrl("assets/figma-icons/avatar.png")} alt="" />
        </IconControl>
      </div>
    </header>
  );
}
