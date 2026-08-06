import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { quickStartCards } from "../data/workspace";
import { assetUrl } from "../utils/assets";
import { FigmaIcon } from "./FigmaIcon";
import { GlassMotion } from "./GlassMotion";
import { IconControl } from "./IconControl";

const tabs = ["选品测款", "新品方向探索", "客户提案生成"];
const tabMetrics = [
  { x: 0, width: 80 },
  { x: 84, width: 104 },
  { x: 192, width: 104 },
];

export function Workspace() {
  const [activeTab, setActiveTab] = useState(0);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [message, setMessage] = useState("");
  const reduceMotion = useReducedMotion();
  const quickStartExpandTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.5, bounce: 0.24 };
  const quickStartCollapseTransition = reduceMotion
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.3, ease: "easeOut" as const };
  const quickStartLayoutTransition = quickStartOpen
    ? quickStartExpandTransition
    : quickStartCollapseTransition;

  const send = () => {
    if (!message.trim()) return;
    setMessage("");
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <main className="workspace-region">
      <div className="workspace-shell" data-node-id="140:6876">
        <section className="workspace-header" data-node-id="163:984">
          <div className="workspace-copy">
            <h1>今天想从哪里开始？</h1>
            <p>选择一个业务场景，描述你的目标，Agent 会带你完成后续步骤。</p>
          </div>

          <div className="mode-tabs" role="tablist" aria-label="业务场景">
            <motion.span
              className="mode-tabs__indicator"
              animate={tabMetrics[activeTab]}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            {tabs.map((tab, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                className={activeTab === index ? "is-active" : ""}
                onClick={() => setActiveTab(index)}
                key={tab}
              >
                {tab}
              </button>
            ))}
          </div>

          <GlassMotion paused={quickStartOpen} />
        </section>

        <section className="composer" aria-label="新建任务" data-node-id="140:6883">
          <div className="composer__input" data-node-id="140:6884">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="描述你想调研的市场、品类或款式方向..."
              aria-label="描述任务目标"
            />
            <IconControl className="composer__add" label="添加附件" tooltipPlacement="top">
              <FigmaIcon name="plus" size={20} />
            </IconControl>
            <div className="composer__send-hint">Enter 发送 · Shift + Enter 换行</div>
            <IconControl
              className="composer__send"
              label="发送"
              tooltipPlacement="top"
              disabled={!message.trim()}
              onClick={send}
            >
              <FigmaIcon name="arrow-up" size={24} />
            </IconControl>
          </div>
          <div className="composer__footer">
            <button type="button" className="composer-select composer-select--profile">
              <FigmaIcon name="company-info" size={16} />
              <span>业务偏好档案</span>
              <FigmaIcon name="chevron-right" size={16} />
            </button>
            <button type="button" className="composer-select composer-select--project">
              <FigmaIcon name="project" size={16} />
              <span>选择项目</span>
              <FigmaIcon name="chevron-right" size={16} />
            </button>
          </div>
        </section>

        <section className={`quick-start ${quickStartOpen ? "is-open" : ""}`}>
          <motion.button
            className="quick-start__toggle"
            type="button"
            onClick={() => setQuickStartOpen((value) => !value)}
            aria-expanded={quickStartOpen}
            layout
            transition={quickStartLayoutTransition}
          >
            <motion.span
              className="quick-start__title"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              <FigmaIcon name="idea" size={20} />
              <strong>快速开始</strong>
            </motion.span>
            <motion.span
              className="quick-start__hint"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              不知道从何开始？试试这些模板
              <FigmaIcon
                name="chevron-down"
                size={16}
                className={quickStartOpen ? "" : "is-closed"}
              />
            </motion.span>
          </motion.button>

          <AnimatePresence initial={false}>
            {quickStartOpen && (
              <motion.div
                className="quick-start__grid"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{
                  height: 0,
                  opacity: 0,
                  y: -6,
                  transition: quickStartCollapseTransition,
                }}
                transition={quickStartExpandTransition}
              >
                {quickStartCards.map((card) => (
                  <button type="button" className="quick-card" key={card.title}>
                    <span className="quick-card__copy">
                      <strong>{card.title}</strong>
                      <small>{card.description}</small>
                    </span>
                    <span className="quick-card__preview" aria-hidden="true">
                      <img src={assetUrl("assets/figma-icons/quick-image-a.png")} alt="" />
                      <img src={assetUrl("assets/figma-icons/quick-image-b.png")} alt="" />
                      <img src={card.image} alt="" />
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
