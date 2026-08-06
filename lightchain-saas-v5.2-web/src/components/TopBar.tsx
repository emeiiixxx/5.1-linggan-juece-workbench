import { Moon, Sun } from "lucide-react";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { assetUrl } from "../utils/assets";

type TopBarProps = {
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const dark = theme === "dark";

  return (
    <header className="topbar" data-node-id="140:6846">
      <div className="topbar__left">
        <a className="brand" href="#" aria-label="Lightchain 首页">
          <img className="brand__mark" src={assetUrl("assets/figma-icons/logo-mark.svg")} alt="" />
          <img
            className="brand__wordmark"
            src={assetUrl("assets/figma-icons/logo-wordmark.svg")}
            alt="Lightchain"
          />
        </a>

        <div className="topbar__preferences">
          <button className="language-select" type="button" aria-label="选择语言">
            <FigmaIcon name="global" size={16} />
            <span>简体中文</span>
            <FigmaIcon name="chevron-down" size={16} />
          </button>

          <IconControl
            label={dark ? "切换到浅色模式" : "切换到暗黑模式"}
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
          <span>帮助中心</span>
        </button>
        <button className="topbar-action" type="button">
          <FigmaIcon name="customer-support" size={20} />
          <span>联系客服</span>
        </button>
        <button className="credits-button" type="button">
          <span>购买积分</span>
          <i />
          <span className="credits-button__balance">
            <FigmaIcon name="points-star" size={16} />
            99999
          </span>
        </button>
        <IconControl className="avatar" label="打开个人中心" tooltipPlacement="bottom">
          <img src={assetUrl("assets/figma-icons/avatar.png")} alt="" />
        </IconControl>
      </div>
    </header>
  );
}
