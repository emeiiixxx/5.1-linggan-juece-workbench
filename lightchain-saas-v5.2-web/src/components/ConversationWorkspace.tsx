import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { useAutoGrowTextarea } from "../hooks/useAutoGrowTextarea";

type StepStatus = "complete" | "loading" | "pending";
type AnalysisPhase = "parsing" | "complete";
type Attachment = { id: string; name: string; kind: "file" | "image"; previewUrl?: string };
type ResearchMarket = "中国" | "日本" | "北美" | "欧洲";
type TrendDownloadFormat = "HTML" | "PPT" | "PDF";

const researchMarkets: ResearchMarket[] = ["中国", "日本", "北美", "欧洲"];
const researchPlatforms: Record<ResearchMarket, { commerce: string[]; social: string[] }> = {
  中国: {
    commerce: ["淘宝", "京东", "抖音", "其他"],
    social: ["小红书", "微博", "抖音"],
  },
  日本: {
    commerce: ["ZOZOTOWN", "RakutenFashion", "LINE SHOPPING", "其他"],
    social: ["Instagram", "TikTok", "X"],
  },
  北美: {
    commerce: ["Amazon", "TikTok Shop", "品牌官网", "其他"],
    social: ["Instagram", "Pinterest", "TikTok"],
  },
  欧洲: {
    commerce: ["Zanlando", "Amazon", "品牌官网", "其他"],
    social: ["Instagram", "Pinterest", "TikTok"],
  },
};
const evidenceIds = ["EV-PROP-FILE-001", "EV-PROP-ECOM-001", "EV-PROP-SOC-001", "EV-PROP-TRD-001"];
const scopeSuggestions = [
  "总结报告中的核心色彩趋势",
  "分析报告中提到的可持续丹宁面料的详细信息",
  "将这份报告制作成 PDF",
];
const trendDownloadFormats: TrendDownloadFormat[] = ["HTML", "PPT", "PDF"];

const revealEase = [0.22, 1, 0.36, 1] as const;
const taskDetailSteps = ["需求解析任务", "搜集行业资料", "整理报告结构"];
const profileRevealDelay = 620;
const analysisRevealDelay = 1520;
const analysisTaskRevealDelay = 0.44;
const analysisLoadingDuration = 3000;
const conversationBlockReveal = {
  hidden: { opacity: 0, y: 10, scale: 0.988 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: revealEase } },
};
const confirmedResultsReveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
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

function TaskDisclosure({
  title,
  expanded,
  complete,
  controlsId,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  complete: boolean;
  controlsId: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="conversation-analysis-task">
      <button
        type="button"
        className="conversation-analysis-trigger"
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={onToggle}
      >
        <AnimatePresence initial={false} mode="wait">
          {complete ? (
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
        <span className={`conversation-analysis-title ${complete ? "" : "is-loading"}`}>{title}</span>
        <motion.span
          className="conversation-analysis-disclosure"
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}
        >
          <FigmaIcon name="chevron-right" size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={controlsId}
            className="conversation-analysis-details"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            layout="size"
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function downloadTrendAnalysis(format: TrendDownloadFormat) {
  const reportText = [
    "趋势方向分析",
    "",
    "主市场：日本",
    "电商平台：Rakuten Fashion、其他",
    "社媒平台：Instagram、TikTok",
    "方向数量：4",
  ].join("\n");
  const extension = format.toLowerCase();
  const mimeType = format === "HTML"
    ? "text/html;charset=utf-8"
    : format === "PPT"
      ? "application/vnd.ms-powerpoint"
      : "application/pdf";
  const content = format === "HTML"
    ? `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>趋势方向分析</title></head><body><pre>${reportText}</pre></body></html>`
    : reportText;
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `趋势方向分析.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ConversationWorkspace({ prompt, profileName }: { prompt: string; profileName?: string }) {
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("parsing");
  const [profileVisible, setProfileVisible] = useState(false);
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [scopeFormVisible, setScopeFormVisible] = useState(false);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [trendScanExpanded, setTrendScanExpanded] = useState(true);
  const [trendDownloadMenuOpen, setTrendDownloadMenuOpen] = useState(false);
  const [trendDownloadFormat, setTrendDownloadFormat] = useState<TrendDownloadFormat | null>(null);
  const [trendPreviewOpen, setTrendPreviewOpen] = useState(false);
  const [researchMarket, setResearchMarket] = useState<ResearchMarket>("日本");
  const [selectedCommerce, setSelectedCommerce] = useState<string[]>(["RakutenFashion", "其他"]);
  const [selectedSocial, setSelectedSocial] = useState<string[]>(["Instagram", "TikTok"]);
  const [otherCommerce, setOtherCommerce] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scopePhaseRef = useRef<HTMLDivElement>(null);
  const confirmedResultsRef = useRef<HTMLDivElement>(null);
  const trendDownloadRef = useRef<HTMLDivElement>(null);
  const attachmentUrlsRef = useRef(new Set<string>());
  const { textareaRef: followUpRef, height: followUpComposerHeight } = useAutoGrowTextarea(
    followUp,
    144,
    320,
    64 + (attachments.length ? 36 : 0),
  );
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

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const dismissAttachmentMenu = (event: PointerEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) setAttachmentMenuOpen(false);
    };
    const dismissAttachmentMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAttachmentMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismissAttachmentMenu);
    document.addEventListener("keydown", dismissAttachmentMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissAttachmentMenu);
      document.removeEventListener("keydown", dismissAttachmentMenuOnEscape);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (!trendDownloadMenuOpen) return;
    const dismissMenu = (event: PointerEvent) => {
      if (!trendDownloadRef.current?.contains(event.target as Node)) setTrendDownloadMenuOpen(false);
    };
    const dismissMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTrendDownloadMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissMenuOnEscape);
    };
  }, [trendDownloadMenuOpen]);

  useEffect(() => {
    if (!trendPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTrendPreviewOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [trendPreviewOpen]);

  useEffect(() => () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    attachmentUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!scopeFormVisible) return;
    const frame = window.requestAnimationFrame(() => {
      scopePhaseRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, scopeFormVisible]);

  useEffect(() => {
    if (!scopeConfirmed) return;
    const frame = window.requestAnimationFrame(() => {
      confirmedResultsRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, scopeConfirmed]);

  const addAttachments = (event: ChangeEvent<HTMLInputElement>, kind: Attachment["kind"]) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const created = files.map((file, index) => {
      const previewUrl = kind === "image" ? URL.createObjectURL(file) : undefined;
      if (previewUrl) attachmentUrlsRef.current.add(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        name: file.name,
        kind,
        previewUrl,
      } satisfies Attachment;
    });
    setAttachments((current) => [...current, ...created]);
    event.currentTarget.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => {
      if (attachment.id !== id) return true;
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
      return false;
    }));
  };

  const clearAttachments = () => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
    });
    setAttachments([]);
  };

  const submitFollowUp = () => {
    const message = followUp.trim();
    if (!message) return;
    if (analysisComplete && message === "继续") setScopeFormVisible(true);
    setFollowUp("");
    clearAttachments();
  };

  const selectMarket = (market: ResearchMarket) => {
    if (market === researchMarket) return;
    setResearchMarket(market);
    setSelectedCommerce([]);
    setSelectedSocial([]);
    setOtherCommerce("");
  };

  const toggleSelection = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const confirmResearchScope = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCommerce.length || !selectedSocial.length) return;
    setScopeConfirmed(true);
  };

  const useScopeSuggestion = (suggestion: string) => {
    setFollowUp(suggestion);
    window.requestAnimationFrame(() => followUpRef.current?.focus());
  };

  const confirmedCommerce = selectedCommerce.map((platform) => {
    if (platform === "RakutenFashion") return "Rakuten Fashion";
    if (platform === "其他" && otherCommerce.trim()) return otherCommerce.trim();
    return platform;
  }).join("、");
  const confirmedSocial = selectedSocial.join("、");
  const scopeCanSubmit = selectedCommerce.length > 0 && selectedSocial.length > 0;

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
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={conversationBlockReveal}
                transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : analysisTaskRevealDelay, ease: revealEase }}
              >
                <TaskDisclosure
                  title="需求解析任务"
                  expanded={analysisExpanded}
                  complete={analysisComplete}
                  controlsId="conversation-analysis-details"
                  onToggle={() => setAnalysisExpanded((expanded) => !expanded)}
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
                </TaskDisclosure>
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

            <AnimatePresence>
              {scopeFormVisible ? (
                <motion.div
                  ref={scopePhaseRef}
                  className="conversation-scope-phase"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.36, ease: revealEase }}
                  data-node-id="484:106053"
                >
                  <article className="conversation-message conversation-message--user" data-node-id="484:106206">
                    <div className="conversation-user-bubble">继续</div>
                    <img className="conversation-avatar" src={assetUrl("assets/figma-icons/avatar.png")} alt="用户头像" />
                  </article>

                  <article className="conversation-message conversation-message--assistant conversation-scope-copy" data-node-id="484:106216">
                    <p>需求理解已确认。接下来只确认调研范围：一个主市场，以及该市场下的电商平台和社媒平台。趋势资料库会默认纳入，不需要选择具体报告，也不会单独确认检索词。</p>
                  </article>

                  <article className="conversation-message conversation-message--assistant conversation-scope-message" data-node-id="484:106226">
                    <p>请选择主要市场、电商平台和社交媒体。</p>
                    <AnimatePresence initial={false} mode="wait">
                    {scopeConfirmed ? (
                      <motion.div
                        className="research-scope-form is-confirmed"
                        aria-label="已确认的调研范围"
                        data-node-id="488:112569"
                        key="confirmed-scope"
                        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.992 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                      >
                        <div className="research-scope-title">
                          <span className="research-scope-title__icon"><img src={assetUrl("assets/figma-icons/apparel-design.svg")} alt="" /></span>
                          <strong>已确认</strong>
                        </div>
                        <div className="research-scope-summary">
                          主市场：{researchMarket} · 电商：{confirmedCommerce} · 社媒：{confirmedSocial}
                        </div>
                      </motion.div>
                    ) : (
                    <motion.form
                      className="research-scope-form"
                      aria-label="确认调研范围"
                      onSubmit={confirmResearchScope}
                      key="editable-scope"
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.992 }}
                      layout={!reduceMotion}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase, layout: { duration: reduceMotion ? 0 : 0.3, ease: revealEase } }}
                    >
                      <div className="research-scope-title">
                        <span className="research-scope-title__icon"><img src={assetUrl("assets/figma-icons/apparel-design.svg")} alt="" /></span>
                        <strong>确认调研范围</strong>
                      </div>

                      <div className="research-scope-note" id="research-scope-guidance">
                        <strong>💡一个任务只应用一个主市场；平台按市场动态提供，可多选。</strong>
                        <span>趋势资料库默认纳入，用于支撑方向假设；品牌或独立站仅沿用你在对话中指定的对象。</span>
                      </div>

                      <div className="research-scope-fields" aria-describedby="research-scope-guidance">
                        <fieldset className="research-scope-field">
                          <legend>主市场 <span aria-hidden="true">*</span></legend>
                          <div className="research-scope-options">
                            {researchMarkets.map((market) => (
                              <motion.button
                                type="button"
                                className={researchMarket === market ? "is-selected" : ""}
                                aria-pressed={researchMarket === market}
                                onClick={() => selectMarket(market)}
                                layout={!reduceMotion}
                                transition={{ duration: reduceMotion ? 0 : 0.22, ease: revealEase }}
                                key={market}
                              >
                                {market}
                              </motion.button>
                            ))}
                          </div>
                        </fieldset>

                        <div className="research-scope-divider" aria-hidden="true" />

                        <AnimatePresence initial={false} mode="wait">
                          <motion.div
                            className="research-scope-cascade"
                            key={researchMarket}
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                            transition={{ duration: reduceMotion ? 0 : 0.26, ease: revealEase }}
                            layout={!reduceMotion}
                          >
                            <fieldset className="research-scope-field">
                              <legend>选择电商平台（支持多选） <span aria-hidden="true">*</span></legend>
                              <div className="research-scope-options">
                                {researchPlatforms[researchMarket].commerce.map((platform) => {
                                  const selected = selectedCommerce.includes(platform);
                                  return (
                                    <motion.button
                                      type="button"
                                      className={selected ? "is-selected" : ""}
                                      aria-pressed={selected}
                                      onClick={() => toggleSelection(platform, setSelectedCommerce)}
                                      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                      transition={{ duration: reduceMotion ? 0 : 0.18, ease: revealEase }}
                                      key={platform}
                                    >
                                      {platform}
                                    </motion.button>
                                  );
                                })}
                              </div>
                              <AnimatePresence initial={false}>
                                {selectedCommerce.includes("其他") ? (
                                  <motion.div
                                    className="research-scope-other"
                                    initial={reduceMotion ? false : { height: 0, opacity: 0, y: -4 }}
                                    animate={{ height: 97, opacity: 1, y: 0 }}
                                    exit={reduceMotion ? undefined : { height: 0, opacity: 0, y: -4 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.26, ease: revealEase }}
                                  >
                                    <textarea
                                      value={otherCommerce}
                                      onChange={(event) => setOtherCommerce(event.target.value)}
                                      placeholder="请输入其他电商平台或独立站名称，多个请用逗号“，”隔开"
                                      aria-label="其他电商平台或独立站名称"
                                    />
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </fieldset>

                            <div className="research-scope-divider" aria-hidden="true" />

                            <fieldset className="research-scope-field">
                              <legend>社媒平台（支持多选） <span aria-hidden="true">*</span></legend>
                              <div className="research-scope-options">
                                {researchPlatforms[researchMarket].social.map((platform) => {
                                  const selected = selectedSocial.includes(platform);
                                  return (
                                    <motion.button
                                      type="button"
                                      className={selected ? "is-selected" : ""}
                                      aria-pressed={selected}
                                      onClick={() => toggleSelection(platform, setSelectedSocial)}
                                      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                      transition={{ duration: reduceMotion ? 0 : 0.18, ease: revealEase }}
                                      key={platform}
                                    >
                                      {platform}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </fieldset>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="research-scope-actions">
                        <button type="submit" disabled={!scopeCanSubmit}>确认并继续</button>
                      </div>
                    </motion.form>
                    )}
                    </AnimatePresence>
                  </article>

                  <AnimatePresence>
                    {scopeConfirmed ? (
                      <motion.div
                        ref={confirmedResultsRef}
                        className="conversation-confirmed-results"
                        initial={reduceMotion ? false : "hidden"}
                        animate="visible"
                        variants={confirmedResultsReveal}
                        data-node-id="488:112020"
                      >
                        <motion.article className="conversation-message conversation-message--assistant conversation-confirmed-copy" variants={conversationBlockReveal} data-node-id="488:112592">
                          <p>调研摘要：目标人群 25-34岁；品类 女装；核心视觉词 待验证；排除项 待补充。趋势资料、社媒信号和电商供给/竞争信息将分别呈现，不把单一来源写成确定趋势或销量机会。</p>
                        </motion.article>

                        <motion.article className="conversation-message conversation-message--assistant conversation-scan-message" variants={conversationBlockReveal} data-node-id="488:112602">
                          <p>范围已确认。我会先做小样本趋势方向扫描，分别整理趋势资料、电商供给/竞争与社媒信号，不直接进入候选池。</p>
                          <TaskDisclosure
                            title="趋势方向扫描"
                            expanded={trendScanExpanded}
                            complete
                            controlsId="trend-scan-details"
                            onToggle={() => setTrendScanExpanded((expanded) => !expanded)}
                          >
                            <div><FigmaIcon name="dot" size={16} className="conversation-step-complete-icon" /><span>整理趋势资料库中的可授权方向与章节依据</span></div>
                            <div><FigmaIcon name="dot" size={16} className="conversation-step-complete-icon" /><span>采集电商、社媒、品牌/独立站公开信号</span></div>
                            <div><FigmaIcon name="dot" size={16} className="conversation-step-complete-icon" /><span>按时间范围、样本量、证据充分度和数据缺口整理 3-5 个方向</span></div>
                          </TaskDisclosure>
                        </motion.article>

                        <motion.article className="conversation-message conversation-message--assistant conversation-trend-result" variants={conversationBlockReveal} data-node-id="488:112710">
                          <p>选择打开方式查看并确认方向：</p>
                          <div className="trend-result-card">
                            <img
                              className="trend-result-art"
                              src={assetUrl("assets/figma-confirmed/trend-analysis-noimage.png")}
                              alt=""
                              aria-hidden="true"
                            />
                            <div className="trend-result-info">
                              <strong>趋势方向分析</strong>
                              <span>刚刚 · 4 个方向</span>
                            </div>
                            <div className="trend-result-actions" aria-label="打开方式">
                              <button type="button" className="trend-result-action" onClick={() => setTrendPreviewOpen(true)}>在线查看</button>
                              <span className="trend-result-action-divider" aria-hidden="true" />
                              <div className="trend-download-control" ref={trendDownloadRef}>
                                <button
                                  type="button"
                                  className="trend-result-action"
                                  aria-haspopup="menu"
                                  aria-expanded={trendDownloadMenuOpen}
                                  onClick={() => setTrendDownloadMenuOpen((open) => !open)}
                                >
                                  下载
                                </button>
                                <AnimatePresence>
                                  {trendDownloadMenuOpen ? (
                                    <motion.div
                                      className="trend-download-menu"
                                      role="menu"
                                      aria-label="选择下载格式"
                                      data-node-id="533:12405"
                                      initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
                                      transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}
                                    >
                                      {trendDownloadFormats.map((format) => (
                                        <button
                                          type="button"
                                          role="menuitemradio"
                                          aria-checked={trendDownloadFormat === format}
                                          className={trendDownloadFormat === format ? "is-selected" : ""}
                                          onClick={() => {
                                            setTrendDownloadFormat(format);
                                            setTrendDownloadMenuOpen(false);
                                            downloadTrendAnalysis(format);
                                          }}
                                          key={format}
                                        >
                                          {format}
                                        </button>
                                      ))}
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </motion.article>

                        <motion.article className="conversation-evidence-message" variants={conversationBlockReveal} data-node-id="524:7528">
                          <div className="conversation-message conversation-message--assistant conversation-evidence-body">
                            <p>本次趋势扫描引用以下业务证据；这些 evidence_id 与右侧参考信息聚合行及详情弹窗保持同源。</p>
                            <div className="conversation-evidence-card">
                              {evidenceIds.map((evidenceId) => (
                                <button type="button" key={evidenceId}>
                                  <span>证据{evidenceId}</span>
                                  <FigmaIcon name="arrow-up-right" size={16} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="conversation-message-meta">
                            <div>
                              <button type="button" aria-label="复制"><FigmaIcon name="copy" size={16} /></button>
                              <button type="button" aria-label="赞"><FigmaIcon name="like" size={16} /></button>
                              <button type="button" aria-label="踩"><FigmaIcon name="dislike" size={16} /></button>
                            </div>
                            <time>10:24</time>
                          </div>
                        </motion.article>

                        <motion.article className="conversation-message conversation-message--assistant conversation-handoff-copy" variants={conversationBlockReveal} data-node-id="488:112714">
                          <p>趋势方向分析已生成。请点击“查看详情”选择认可方向，也可以直接在输入框说“保留 1 和 3，排除 2”，修改会先停留在趋势确认，不会进入定向候选检索。</p>
                        </motion.article>

                        <motion.article className="conversation-message conversation-message--assistant conversation-suggestions" variants={conversationBlockReveal} data-node-id="488:112719">
                          {scopeSuggestions.map((suggestion) => (
                            <button type="button" onClick={() => useScopeSuggestion(suggestion)} key={suggestion}>
                              <span>{suggestion}</span>
                              <FigmaIcon name="arrow-down-right" size={20} />
                            </button>
                          ))}
                        </motion.article>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="conversation-bottom-fade" aria-hidden="true" />
        <motion.section
          className="conversation-composer composer__input"
          aria-label="继续对话"
          style={{ height: followUpComposerHeight }}
          initial={reduceMotion ? false : { opacity: 0, y: 18, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          transition={{ duration: reduceMotion ? 0 : 0.46, delay: reduceMotion ? 0 : 0.42, ease: revealEase }}
        >
          <div className="composer__content">
            <AnimatePresence initial={false}>
              {attachments.length > 0 && (
                <motion.div
                  className="composer-attachment-list"
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                >
                  {attachments.map((attachment) => (
                    <motion.span
                      className="composer-attachment-chip"
                      layout
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                      key={attachment.id}
                    >
                      {attachment.previewUrl ? (
                        <img className="composer-attachment-chip__thumbnail" src={attachment.previewUrl} alt="" />
                      ) : (
                        <img className="composer-attachment-chip__file" src={assetUrl("assets/figma-icons/file-pdf.svg")} alt="" />
                      )}
                      <span title={attachment.name}>{attachment.name}</span>
                      <button type="button" aria-label={`移除附件：${attachment.name}`} onClick={() => removeAttachment(attachment.id)}>
                        <FigmaIcon name="close" size={16} />
                      </button>
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="composer__text-wrap">
              <textarea ref={followUpRef} value={followUp} onChange={(event) => setFollowUp(event.target.value)} onKeyDown={onFollowUpKeyDown} placeholder="补充条件或继续提问..." aria-label="补充条件或继续提问" />
            </div>
          </div>
          <div className="composer-attachment" ref={attachmentMenuRef}>
            <IconControl
              className="composer-attachment__button"
              label="添加附件"
              tooltipPlacement="top"
              selected={attachmentMenuOpen}
              aria-haspopup="menu"
              aria-expanded={attachmentMenuOpen}
              onClick={() => setAttachmentMenuOpen((open) => !open)}
            >
              <FigmaIcon name="plus" size={20} />
            </IconControl>
            <AnimatePresence>
              {attachmentMenuOpen && (
                <motion.div
                  className="composer-attachment-menu"
                  role="menu"
                  aria-label="添加附件"
                  initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                >
                  <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }}>
                    <FigmaIcon name="add-file" size={16} />
                    <span>文件</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }}>
                    <FigmaIcon name="add-image" size={16} />
                    <span>图片</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <input ref={fileInputRef} className="composer-attachment__input" type="file" multiple onChange={(event) => addAttachments(event, "file")} />
            <input ref={imageInputRef} className="composer-attachment__input" type="file" accept="image/*" multiple onChange={(event) => addAttachments(event, "image")} />
          </div>
          <span>Enter 发送 · Shift + Enter 换行</span>
          <IconControl className="composer__send conversation-composer__send" label="发送" tooltipPlacement="top" disabled={!followUp.trim()} onClick={submitFollowUp}><FigmaIcon name="arrow-up" size={24} /></IconControl>
        </motion.section>
      </section>

      <aside className={`task-detail-rail ${detailPanelOpen ? "is-expanded" : "is-collapsed"}`}>
        <div className="task-detail-panel" aria-label="任务概览">
              <header>
                <strong>概览</strong>
                <button type="button" onClick={() => setDetailPanelOpen(false)} aria-label="收起概览"><FigmaIcon name="expand-window" size={20} /></button>
              </header>
              <section>
                <h2>待办</h2>
                <div className="task-detail-list">
                  {taskDetailSteps.map((step, index) => (
                    <motion.div initial={reduceMotion ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.52 + index * 0.1, ease: revealEase }} key={step}>
                      <StatusIcon status={index === 0 ? (analysisComplete ? "complete" : "loading") : index === 1 ? (scopeConfirmed ? "complete" : "pending") : (scopeConfirmed ? "loading" : "pending")} />
                      <span>{step}</span>
                    </motion.div>
                  ))}
                </div>
              </section>
              <section>
                <h2>任务产物</h2>
                <div className="task-detail-row"><FigmaIcon name="add-file" size={16} /><span>{scopeConfirmed ? "趋势方向分析已生成" : analysisComplete ? "等待搜集行业资料完成…" : "等待需求解析完成…"}</span></div>
              </section>
        </div>
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      </aside>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {trendPreviewOpen ? (
            <motion.section
              className="trend-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="trend-preview-title"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.992 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.992 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
            >
              <header className="trend-preview-modal__header">
                <h2 id="trend-preview-title">趋势方向分析</h2>
                <button type="button" aria-label="关闭在线查看" autoFocus onClick={() => setTrendPreviewOpen(false)}>
                  <FigmaIcon name="close" size={20} />
                </button>
              </header>
              <div className="trend-preview-modal__content" />
            </motion.section>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </motion.main>
  );
}
