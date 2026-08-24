import { assetUrl } from "../utils/assets";
import { BusinessButton, Button } from "./Button";
import { SelectAllControl } from "./ConversationPrimitives";

type ResearchScopeFormProps = {
  confirmed: boolean;
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
  onToggleAll: () => void;
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
  onToggleAll,
  onReset,
  onConfirm,
}: ResearchScopeFormProps) {
  const allSelected = markets.length > 0
    && commerceOptions.length > 0
    && socialOptions.length > 0
    && markets.every((option) => selectedMarkets.includes(option))
    && commerceOptions.every((option) => selectedCommerce.includes(option))
    && socialOptions.every((option) => selectedSocial.includes(option));

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
          <span className={`research-scope-badge research-scope-badge--${confirmed ? "confirmed" : "pending"}`}>
            {confirmed ? "已确认" : "待确认"}
          </span>
        </div>
      </header>

      <div className="research-scope-fields">
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
          <SelectAllControl selected={allSelected} className="selection-select-all--leading" onToggle={onToggleAll} />
          <Button type="button" variant="secondary" size="small" onClick={onReset}>重置选择</Button>
          <BusinessButton type="submit" points={10} disabled={!canSubmit}>确认并开始调研</BusinessButton>
        </div>
      ) : null}
    </form>
  );
}
