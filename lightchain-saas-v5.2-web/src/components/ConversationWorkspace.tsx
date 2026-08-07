import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { FigmaIcon } from "./FigmaIcon";

type StepStatus = "complete" | "loading" | "pending";
type AnalysisPhase = "parsing" | "complete";

const revealEase = [0.22, 1, 0.36, 1] as const;
const taskDetailSteps = ["需求解析任务", "搜集行业资料", "整理报告结构"];
const profileRevealDelay = 620;
const analysisRevealDelay = 1520;
const analysisTaskRevealDelay = 0.44;
const analysisLoadingDuration = 3000;
const conversationBlockReveal = {
  hidden: { opacity: 0, y: 10, scale: 0.988 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function StreamingText({ children, delay = 0 }: { children: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span>{children}</span>;

  return (
    <motion.span
      className="conversation-streaming-text"
      aria-label={children}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { delayChildren: delay, staggerChildren: 0.012 } } }}
    >
      {Array.from(children).map((character, index) => (
        <motion.span
          className="conversation-streaming-character"
          aria-hidden="true"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.09, ease: "linear" } } }}
          key={`${character}-${index}`}
        >
          {character === " " ? "\u00a0" : character}
        </motion.span>
      ))}
    </motion.span>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "complete") {
    return (
      <span className="conversation-status-icon is-complete" aria-label="已完成">
        <FigmaIcon name="check" size={16} />
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span className="conversation-status-icon is-loading" aria-label="进行中">
        <img className="conversation-loading-asset" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />
      </span>
    );
  }
  return <span className="conversation-status-icon is-pending" aria-label="待处理" />;
}

function AnalysisStepIcon({ complete, delay = 0 }: { complete: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="conversation-step-state-icon" aria-hidden="true">
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          className={complete ? "conversation-step-complete-icon" : ""}
          key={complete ? "complete" : "searching"}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.65 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : delay, ease: revealEase }}
        >
          <FigmaIcon name={complete ? "dot" : "search"} size={16} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ConversationWorkspace({ prompt, profileName }: { prompt: string; profileName?: string }) {
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("parsing");
  const [profileVisible, setProfileVisible] = useState(false);
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const reduceMotion = useReducedMotion();
  const analysisComplete = analysisPhase === "complete";

  useEffect(() => {
    const profileTimer = window.setTimeout(
      () => setProfileVisible(true),
      reduceMotion ? 0 : profileRevealDelay,
    );
    const analysisTimer = window.setTimeout(
      () => setAnalysisVisible(true),
      reduceMotion ? 0 : analysisRevealDelay,
    );
    const completionTimer = window.setTimeout(
      () => setAnalysisPhase("complete"),
      (reduceMotion ? 0 : analysisRevealDelay) + analysisTaskRevealDelay * 1000 + analysisLoadingDuration,
    );
    return () => {
      window.clearTimeout(profileTimer);
      window.clearTimeout(analysisTimer);
      window.clearTimeout(completionTimer);
    };
  }, [reduceMotion]);

  const submitFollowUp = () => {
    if (!followUp.trim()) return;
    setFollowUp("");
  };

  const onFollowUpKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitFollowUp();
    }
  };

  return (
    <motion.main
      className={`workspace-region workspace-region--conversation ${detailPanelOpen ? "has-detail-panel" : ""}`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
    >
      <section className="conversation-stage" aria-label="任务对话">
        <div className="conversation-scroll">
          <div className="conversation-feed" data-node-id="476:103924">
            <motion.article
              className="conversation-message conversation-message--user"
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.04, ease: revealEase }}
              data-node-id="476:103925"
            >
              <div className="conversation-user-bubble">{prompt}</div>
              <img className="conversation-avatar" src={assetUrl("assets/figma-icons/avatar.png")} alt="用户头像" />
            </motion.article>

            <AnimatePresence initial={false}>
              {profileVisible ? (
                <motion.article
                  className="conversation-message conversation-message--assistant conversation-profile-read"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                  data-node-id="476:103926"
                >
                  <p className="conversation-profile-read__label">
                    <StreamingText delay={0.04}>已读取到有应用业务偏好档案</StreamingText>
                  </p>
                  <motion.div
                    className="conversation-profile-card"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.3, ease: revealEase }}
                  >
                    <strong>{profileName ?? "灭霸毁灭宇宙回忆录"}</strong>
                    <span>品类：女装　价格段：JPY 8,000–18,000　国家：日本　年龄段：25-34岁、35-44岁</span>
                  </motion.div>
                </motion.article>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
            {analysisVisible ? (
            <motion.article
              className="conversation-message conversation-message--assistant conversation-analysis"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.38, ease: revealEase }}
              data-node-id="476:103930"
            >
              <p><StreamingText delay={0.04}>下面开始本次需求解析，完成后将给出需求理解。</StreamingText></p>
              <motion.div
                className="conversation-analysis-task"
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={conversationBlockReveal}
                transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : analysisTaskRevealDelay, ease: revealEase }}
              >
                <button
                  type="button"
                  className="conversation-analysis-trigger"
                  aria-expanded={analysisExpanded}
                  aria-controls="conversation-analysis-details"
                  onClick={() => setAnalysisExpanded((expanded) => !expanded)}
                >
                  <AnimatePresence initial={false} mode="wait">
                    {analysisComplete ? (
                      <motion.span
                        className="conversation-analysis-complete-icon"
                        key="complete"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.62, rotate: -18 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
                      >
                        <FigmaIcon name="check" size={20} />
                      </motion.span>
                    ) : (
                      <motion.span
                        className="conversation-analysis-loading"
                        key="loading"
                        initial={reduceMotion ? false : { opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.68 }}
                        transition={{ duration: reduceMotion ? 0 : 0.16, ease: revealEase }}
                      >
                        <img className="conversation-analysis-spinner" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className={`conversation-analysis-title ${analysisComplete ? "" : "is-loading"}`}>
                    需求解析任务
                  </span>
                  <motion.span
                    className="conversation-analysis-disclosure"
                    animate={{ rotate: analysisExpanded ? 90 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}
                  >
                    <FigmaIcon name="chevron-right" size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {analysisExpanded ? (
                    <motion.div
                      id="conversation-analysis-details"
                      className="conversation-analysis-details"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      layout="size"
                      transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                    >
                      <div>
                        <FigmaIcon name="dot" size={16} className="conversation-step-complete-icon" />
                        <span>读取业务偏好档案</span>
                      </div>
                      <p>已读取并理解业务偏好档案内容</p>
                      <div>
                        <AnalysisStepIcon complete={analysisComplete} delay={0.02} />
                        <span>解析客户资料与首轮描述</span>
                      </div>
                      <p>{analysisComplete ? "已收集" : "收集"}各大品牌的2025/26冬季系列发布信息，以获得市场趋势的全面了解。</p>
                      <div>
                        <AnalysisStepIcon complete={analysisComplete} delay={0.1} />
                        <span>识别参考图特征</span>
                      </div>
                      {analysisComplete ? (
                        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : 0.26, ease: revealEase }}>
                          已识别参考图特征：未上传，待补充
                        </motion.p>
                      ) : null}
                      <div>
                        <AnalysisStepIcon complete={analysisComplete} delay={0.18} />
                        <span>检查缺失信息</span>
                      </div>
                      {analysisComplete ? (
                        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : 0.38, ease: revealEase }}>
                          已确认缺失信息：季节
                        </motion.p>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </motion.article>
            ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {analysisComplete ? (
                <motion.div
                  className="conversation-phase-group"
                  initial={false}
                  data-node-id="476:105537"
                >
                  <motion.article
                    className="conversation-message conversation-message--assistant conversation-analysis-complete"
                    initial={reduceMotion ? false : "hidden"}
                    animate="visible"
                    variants={conversationBlockReveal}
                    transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.56, ease: revealEase }}
                  >
                    <p><StreamingText delay={0.62}>已完成本次需求解析</StreamingText></p>
                    <motion.div
                      className="conversation-analysis-summary"
                      initial={reduceMotion ? false : "hidden"}
                      animate="visible"
                      variants={conversationBlockReveal}
                      transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.76, ease: revealEase }}
                    >
                      <strong><StreamingText delay={0.82}>本次需求理解：</StreamingText></strong>
                      <ul>
                        <li><StreamingText delay={0.94}>目标：根据当前描述形成客户可评审的方向方案</StreamingText></li>
                        <li><StreamingText delay={1.08}>市场：日本　人群：25-34岁</StreamingText></li>
                        <li><StreamingText delay={1.22}>品类：女装　季节：待补充</StreamingText></li>
                        <li><StreamingText delay={1.36}>价格：JPY 8,000-18,000　设计方向：待补充</StreamingText></li>
                        <li><StreamingText delay={1.5}>参考图特征：未上传，待补充</StreamingText></li>
                        <li><StreamingText delay={1.64}>保留元素：待补充　排除元素：待补充</StreamingText></li>
                        <li><StreamingText delay={1.78}>待补充：季节</StreamingText></li>
                      </ul>
                    </motion.div>
                  </motion.article>
                  <motion.article
                    className="conversation-message conversation-message--assistant conversation-analysis-confirmation"
                    initial={reduceMotion ? false : "hidden"}
                    animate="visible"
                    variants={conversationBlockReveal}
                    transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 1.96, ease: revealEase }}
                  >
                    <p><StreamingText delay={2.02}>请确认【季节】，可直接补充，也可回复“跳过”保留未指定状态。确认后回复“继续”进入调研范围。</StreamingText></p>
                  </motion.article>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="conversation-bottom-fade" aria-hidden="true" />
        <motion.section
          className="conversation-composer"
          aria-label="继续对话"
          initial={reduceMotion ? false : { opacity: 0, y: 18, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          transition={{ duration: reduceMotion ? 0 : 0.46, delay: reduceMotion ? 0 : 0.42, ease: revealEase }}
        >
          <textarea value={followUp} onChange={(event) => setFollowUp(event.target.value)} onKeyDown={onFollowUpKeyDown} placeholder="补充条件或继续提问..." aria-label="补充条件或继续提问" />
          <button type="button" className="conversation-composer__add" aria-label="添加附件"><FigmaIcon name="plus" size={20} /></button>
          <span>Enter 发送 · Shift + Enter 换行</span>
          <button type="button" className="conversation-composer__send" disabled={!followUp.trim()} onClick={submitFollowUp} aria-label="发送"><FigmaIcon name="arrow-up" size={20} /></button>
        </motion.section>
      </section>

      {detailPanelOpen ? (
        <motion.aside
          className="task-detail-panel"
          aria-label="任务概览"
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.44, delay: reduceMotion ? 0 : 0.3, ease: revealEase }}
        >
          <header>
            <strong>概览</strong>
            <button type="button" onClick={() => setDetailPanelOpen(false)} aria-label="收起概览"><FigmaIcon name="expand-window" size={20} /></button>
          </header>
          <section>
            <h2>待办</h2>
            <div className="task-detail-list">
              {taskDetailSteps.map((step, index) => (
                <motion.div initial={reduceMotion ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.52 + index * 0.1, ease: revealEase }} key={step}>
                  <StatusIcon status={index === 0 ? (analysisComplete ? "complete" : "loading") : "pending"} />
                  <span>{step}</span>
                </motion.div>
              ))}
            </div>
          </section>
          <section>
            <h2>任务产物</h2>
            <div className="task-detail-row"><FigmaIcon name="add-file" size={16} /><span>{analysisComplete ? "等待搜集行业资料完成…" : "等待需求解析完成…"}</span></div>
          </section>
        </motion.aside>
      ) : (
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      )}
    </motion.main>
  );
}
