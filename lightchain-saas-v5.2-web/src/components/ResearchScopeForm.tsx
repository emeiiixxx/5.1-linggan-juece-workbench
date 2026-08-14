import { assetUrl } from "../utils/assets";
import { Button } from "./Button";

type ResearchScopeFormProps = {
  confirmed: boolean;
  profileLinked: boolean;
  markets: string[];
  selectedMarkets: string[];
  commerceOptions: string[];
  selectedCommerce: string[];
  socialOptions: string[];
  selectedSocial: string[];
  otherCommerce: string;
  canSubmit: boolean;
  onToggleMarket: (market: string) => void;
  onToggleCommerce: (platform: string) => void;
  onToggleSocial: (platform: string) => void;
  onOtherCommerceChange: (value: string) => void;
  onReset: () => void;
  onConfirm: () => void;
};

function ScopeOptions({
  options,
  selected,
  confirmed,
  onToggle,
}: {
  options: string[];
  selected: string[];
  confirmed: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="research-scope-options">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            type="button"
            className={isSelected ? "is-selected" : ""}
            aria-pressed={isSelected}
            disabled={confirmed}
            onClick={() => onToggle(option)}
            key={option}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function ResearchScopeForm({
  confirmed,
  profileLinked,
  markets,
  selectedMarkets,
  commerceOptions,
  selectedCommerce,
  socialOptions,
  selectedSocial,
  otherCommerce,
  canSubmit,
  onToggleMarket,
  onToggleCommerce,
  onToggleSocial,
  onOtherCommerceChange,
  onReset,
  onConfirm,
}: ResearchScopeFormProps) {
  const prefillBadge = profileLinked
    ? "已从企业档案带入预填信息，可修改"
    : "已按语言预选地区，可修改";
  const guidance = profileLinked
    ? "💡已关联业务偏好档案，已提供默认调研范围，所有选项仍可调整。"
    : "💡未关联业务偏好档案，已根据当前语言预选地区，其余选项请按需选择。";

  return (
    <form
      className={`research-scope-form ${confirmed ? "is-readonly" : ""}`}
      data-message-meta="disabled"
      data-copy-exclude="true"
      aria-label="确认调研范围"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <header className="research-scope-header">
        <div className="research-scope-title">
          <span className="research-scope-title__icon">
            <img src={assetUrl("assets/figma-icons/apparel-design.svg")} alt="" />
          </span>
          <strong>确认调研范围</strong>
        </div>
        <div className="research-scope-badges" aria-label="表单状态">
          {!confirmed ? <span className="research-scope-badge">{prefillBadge}</span> : null}
          <span className={`research-scope-badge research-scope-badge--${confirmed ? "confirmed" : "pending"}`}>
            {confirmed ? "已确认" : "待确认"}
          </span>
        </div>
      </header>

      <div className="research-scope-note" id="research-scope-guidance">
        <p>{guidance}</p>
      </div>

      <div className="research-scope-fields" aria-describedby="research-scope-guidance">
        <fieldset className="research-scope-field">
          <legend>地区（支持多选） <span aria-hidden="true">*</span></legend>
          <ScopeOptions options={markets} selected={selectedMarkets} confirmed={confirmed} onToggle={onToggleMarket} />
        </fieldset>

        <div className="research-scope-divider" aria-hidden="true" />

        <fieldset className="research-scope-field">
          <legend>电商平台（支持多选） <span aria-hidden="true">*</span></legend>
          <ScopeOptions options={commerceOptions} selected={selectedCommerce} confirmed={confirmed} onToggle={onToggleCommerce} />
        </fieldset>

        <div className="research-scope-divider" aria-hidden="true" />

        <fieldset className="research-scope-field">
          <legend>社媒平台（支持多选） <span aria-hidden="true">*</span></legend>
          <ScopeOptions options={socialOptions} selected={selectedSocial} confirmed={confirmed} onToggle={onToggleSocial} />
        </fieldset>

        <div className="research-scope-divider" aria-hidden="true" />

        <fieldset className="research-scope-field">
          <legend>其他独立站 / 平台</legend>
          <div className="research-scope-other">
            <textarea
              value={otherCommerce}
              onChange={(event) => onOtherCommerceChange(event.target.value)}
              readOnly={confirmed}
              placeholder="请输入其他电商平台或独立站名称，多个请用逗号“，”隔开"
              aria-label="其他电商平台或独立站名称"
            />
          </div>
        </fieldset>
      </div>

      {!confirmed ? (
        <div className="research-scope-actions">
          <Button type="button" variant="secondary" size="small" onClick={onReset}>重置选择</Button>
          <Button type="submit" variant="primary" size="small" disabled={!canSubmit}>确认并开始调研</Button>
        </div>
      ) : null}
    </form>
  );
}
