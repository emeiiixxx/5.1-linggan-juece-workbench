import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { assetUrl } from "../utils/assets";
import { languageOptions, useI18n } from "../i18n";
import { useModalFocus } from "../hooks/useModalFocus";

type TopBarProps = {
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const dark = theme === "dark";
  const { locale, setLocale, t } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState(5000);
  const [creditBalance, setCreditBalance] = useState(99999);
  const languageRef = useRef<HTMLDivElement>(null);
  const creditsDialogRef = useRef<HTMLElement>(null);
  const activeLanguage = languageOptions.find((option) => option.value === locale) ?? languageOptions[0];
  useModalFocus(creditsDialogRef, creditsOpen, () => setCreditsOpen(false));

  useEffect(() => {
    const openCredits = () => setCreditsOpen(true);
    window.addEventListener("lightchain:open-credits", openCredits);
    return () => window.removeEventListener("lightchain:open-credits", openCredits);
  }, []);

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
          <div className={`language-control ${languageOpen ? "is-open" : ""}`} ref={languageRef} data-i18n-static="true">
            <button className="language-select" type="button" aria-label={t("选择语言")} aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>
              <FigmaIcon name="global" size={16} />
              <span title={activeLanguage.label}>{activeLanguage.label}</span>
              <FigmaIcon name="chevron-down" size={16} className="language-select__chevron" />
            </button>
            {languageOpen && <div className="language-menu" role="menu" aria-label={t("选择语言")}>
              {languageOptions.map((option) => {
                const selected = option.value === locale;
                return <button className={selected ? "is-selected" : ""} type="button" role="menuitemradio" aria-checked={selected} title={option.label} key={option.value} onClick={() => { setLocale(option.value); setLanguageOpen(false); }}><span>{option.label}</span>{selected && <FigmaIcon name="check" size={16} />}</button>;
              })}
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
        <button className="credits-button" type="button" data-node-id="160:1082" aria-haspopup="dialog" aria-expanded={creditsOpen} onClick={() => setCreditsOpen(true)}>
          <span title={t("购买积分")}>{t("购买积分")}</span>
          <span className="credits-button__divider" aria-hidden="true" />
          <span className="credits-button__balance">
            <FigmaIcon name="points-star" size={16} />
            {creditBalance}
          </span>
        </button>
        <IconControl className="avatar" label={t("打开个人中心")} tooltipPlacement="bottom">
          <img src={assetUrl("assets/figma-icons/avatar.png")} alt="" />
        </IconControl>
      </div>
      {creditsOpen && typeof document !== "undefined" ? createPortal(
        <div className="credits-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setCreditsOpen(false); }}>
          <section ref={creditsDialogRef} className="credits-dialog" role="dialog" aria-modal="true" aria-labelledby="credits-dialog-title">
            <header className="credits-dialog__header">
              <div>
                <h2 id="credits-dialog-title">购买积分</h2>
                <p>当前余额 {creditBalance.toLocaleString()} 积分</p>
              </div>
              <IconControl label="关闭购买积分窗口" onClick={() => setCreditsOpen(false)}>
                <FigmaIcon name="close" size={20} />
              </IconControl>
            </header>
            <div className="credits-dialog__packages" role="radiogroup" aria-label="选择积分套餐">
              {[1000, 5000, 10000].map((amount) => (
                <button type="button" role="radio" aria-checked={selectedCreditPackage === amount} className={selectedCreditPackage === amount ? "is-selected" : ""} onClick={() => setSelectedCreditPackage(amount)} key={amount}>
                  <FigmaIcon name="points-star" size={20} />
                  <strong>{amount.toLocaleString()}</strong>
                  <span>积分</span>
                </button>
              ))}
            </div>
            <p className="credits-dialog__note">确认购买后积分将立即到账，并从当前任务最后一个已成功确认的节点继续。</p>
            <footer className="credits-dialog__actions">
              <Button variant="secondary" onClick={() => setCreditsOpen(false)}>取消</Button>
              <Button variant="primary" onClick={() => { setCreditBalance((balance) => balance + selectedCreditPackage); window.dispatchEvent(new CustomEvent("lightchain:credits-purchased", { detail: { amount: selectedCreditPackage } })); setCreditsOpen(false); }}>确认购买</Button>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </header>
  );
}
