import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { scrollWithinConversation } from "../utils/conversationScroll";
import { buildConditionAcknowledgement } from "../utils/taskAcknowledgement";
import { BusinessButton, Button, QuickReplyButton } from "./Button";
import {
  AnalysisStepIcon,
  CONVERSATION_GENERATION_BATCH_DELAY_MS,
  ConversationFeed,
  ConversationFollowUpExchange,
  ConversationFormTitle,
  ConversationGeneratedImageBatch,
  ConversationTaskCompletion,
  ConversationUserMessage as UserMessage,
  SelectAllControl,
  TaskDisclosure,
} from "./ConversationPrimitives";
import { ConversationUserAttachments } from "./ConversationUserAttachments";
import {
  ImageGalleryLightbox,
  MasonryImageSelection,
  type ImageGalleryCategory,
  type ImageGalleryItem,
} from "./ImageSelection";
import { SelectionCard, SelectionControl } from "./SelectionCard";
import { TaskConversationComposer, type TaskConversationAttachment } from "./TaskConversationComposer";

type PatternStage =
  | "analyzing"
  | "brief"
  | "directions-loading"
  | "directions"
  | "candidates-loading"
  | "candidates"
  | "candidate-confirmation"
  | "candidate-analysis"
  | "strategy"
  | "matrix"
  | "generating"
  | "results";

type Attachment = { name: string; previewUrl?: string };

const revealEase = [0.22, 1, 0.36, 1] as const;
const patternAssets = [
  "assets/quick-start/print-design-1.jpg",
  "assets/quick-start/print-design-2.jpg",
  "assets/quick-start/print-design-3.jpg",
] as const;
const candidateIds = Array.from({ length: 12 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`);
const quantityOptions = ["完整系列开发（8款）", "快速出4款查看效果", "自定义数量"];
const styleOptions = ["浪漫花卉", "度假植物", "复古手绘", "几何装饰", "其他，请输入说明"];
const repeatOptions = ["四方连续", "二方连续", "定位印花", "混合应用"];
const applicationOptions = ["连衣裙 / 半裙", "衬衫 / 上衣", "丝巾 / 配饰", "多品类延展"];
const patternDirections = [
  { id: "A", title: "植物花园", description: "以手绘花叶和疏密层次营造轻盈、浪漫的度假氛围。" },
  { id: "B", title: "几何花窗", description: "通过秩序排列、对称骨架和小比例单元形成精致节奏。" },
  { id: "C", title: "复古野趣", description: "使用颗粒线条、异形花朵与低饱和色彩强化手作感。" },
  { id: "D", title: "现代抽象", description: "将花卉拆解为色块与流动曲线，建立更强的远视识别度。" },
] as const;

const patternPlan = [
  ["01", "微风花园", "手绘花卉 + 二方连续", "疏散小花与留白底色，适合轻薄衬衫。"],
  ["02", "粉蜡蔓枝", "枝叶抽取 + 四方连续", "中小尺度蔓枝交错，适合连衣裙主身。"],
  ["03", "花窗拼图", "几何重组 + 镜像排列", "统一单元节奏，适合半裙与围巾。"],
  ["04", "热带剪影", "植物放大 + 正负形", "高对比叶片剪影，形成度假视觉焦点。"],
  ["05", "复古野花", "颗粒描边 + 错位连续", "低饱和复古色组，增加手工印刷感。"],
  ["06", "彩色流形", "花瓣抽象 + 流动排列", "将花瓣转化为曲线色块，强化时尚感。"],
  ["07", "边饰花带", "单元收拢 + 定位印花", "使花型集中在领口、袖口或下摆边缘。"],
  ["08", "盛放主视觉", "花朵放大 + 局部叠印", "大尺度定位花型，用于连衣裙或上衣主视觉。"],
] as const;
const phaseTitles = ["商业基础花型", "风格识别花型", "形象定位花型"] as const;

function patternAsset(index: number) {
  return patternAssets[index % patternAssets.length];
}

const patternGalleryCategories: ImageGalleryCategory[] = [
  { id: "ai-pattern", label: "AI图案" },
];

const patternCandidateCategories: ImageGalleryCategory[] = [
  { id: "pattern-reference", label: "图案参考" },
];

const patternCandidateItems: ImageGalleryItem[] = candidateIds.map((candidateId, index) => ({
  id: candidateId,
  categoryId: patternCandidateCategories[0].id,
  code: candidateId,
  src: patternAsset(index),
  title: `候选图案 ${String(index + 1).padStart(2, "0")}`,
  subtitle: index % 3 === 0 ? "植物叶片 · 低饱和手绘" : index % 3 === 1 ? "水果花卉 · 柔和粉彩" : "度假植物 · 清新撞色",
  badges: [index % 2 === 0 ? "四方连续" : "定位印花", index < 4 ? "商业基础" : index < 8 ? "风格识别" : "形象表达"],
  detailLines: ["候选图案参考", `适配方向：${patternDirections[index % patternDirections.length].title}`, `建议应用：${applicationOptions[index % applicationOptions.length]}`],
}));

const generatedPatternItems: ImageGalleryItem[] = patternPlan.map((item, index) => ({
  id: item[0],
  categoryId: patternGalleryCategories[0].id,
  code: `PT ${item[0]}`,
  src: patternAsset(index),
  title: item[1],
  subtitle: item[2],
  badges: [index < 3 ? phaseTitles[0] : index < 6 ? phaseTitles[1] : phaseTitles[2]],
  detailLines: [item[3], "1:1 图案预览，支持后续四方连续与配色延展。"],
}));

function AssistantMessage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.article
      className={`conversation-message conversation-message--assistant apparel-assistant-message ${className}`}
      data-message-actions="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: revealEase }}
    >
      {children}
    </motion.article>
  );
}

function LoadingTask({ title, lines }: { title: string; lines: string[] }) {
  const [expanded, setExpanded] = useState(true);
  const controlsId = useId();
  return (
    <TaskDisclosure title={title} expanded={expanded} complete={false} controlsId={controlsId} onToggle={() => setExpanded((open) => !open)}>
      {lines.map((line, index) => <div key={line}><AnalysisStepIcon complete={false} delay={index * 0.06} /><span>{line}</span></div>)}
    </TaskDisclosure>
  );
}

function PatternQuickReply({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <div className="conversation-quick-actions"><QuickReplyButton onClick={onClick}>{children}</QuickReplyButton></div>;
}

export function PatternConversationWorkspace({ prompt, attachments = [], initialState = "default", onTaskProgress, onTaskComplete, readOnly = false }: {
  prompt: string;
  attachments?: Attachment[];
  initialState?: "default" | "confirmation" | "complete";
  onTaskProgress?: () => void;
  onTaskComplete?: () => void;
  readOnly?: boolean;
}) {
  const initialComplete = initialState === "complete";
  const initialConfirmation = initialState === "confirmation";
  const [stage, setStage] = useState<PatternStage>(initialComplete ? "results" : initialConfirmation ? "brief" : "analyzing");
  const [analysisExpanded, setAnalysisExpanded] = useState(!initialConfirmation && !initialComplete);
  const [followUp, setFollowUp] = useState("");
  const [quantityChoice, setQuantityChoice] = useState(quantityOptions[0]);
  const [styleChoices, setStyleChoices] = useState<string[]>(initialConfirmation || initialComplete ? ["浪漫花卉", "度假植物"] : []);
  const [otherStyle, setOtherStyle] = useState("");
  const [repeatChoice, setRepeatChoice] = useState(initialConfirmation || initialComplete ? repeatOptions[0] : "");
  const [applicationChoice, setApplicationChoice] = useState(initialConfirmation || initialComplete ? applicationOptions[0] : "");
  const [briefReply, setBriefReply] = useState(initialComplete ? "已确认8款图案、浪漫花卉与度假植物方向、四方连续、连衣裙 / 半裙" : "");
  const [selectedDirectionIds, setSelectedDirectionIds] = useState<string[]>(initialComplete ? ["A", "C"] : []);
  const [customDirection, setCustomDirection] = useState("");
  const [directionReply, setDirectionReply] = useState(initialComplete ? "A · 植物花园 + C · 复古野趣" : "");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>(initialComplete ? candidateIds.slice(0, 6) : []);
  const [candidatesSkipped, setCandidatesSkipped] = useState(false);
  const [candidateReply, setCandidateReply] = useState(initialComplete ? "满意，请继续" : "");
  const [strategyReply, setStrategyReply] = useState(initialComplete ? "认可，请继续" : "");
  const [matrixReply, setMatrixReply] = useState(initialComplete ? "开始生图" : "");
  const [candidateAnalysisExpanded, setCandidateAnalysisExpanded] = useState(true);
  const [previewCandidate, setPreviewCandidate] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<Partial<Record<PatternStage, TaskConversationAttachment[]>>>({});
  const [batchProgress, setBatchProgress] = useState(0);
  const [resultFollowUps, setResultFollowUps] = useState<Array<{ request: string; attachments: TaskConversationAttachment[]; response: string }>>([]);
  const taskRunning = ["analyzing", "directions-loading", "candidates-loading", "candidate-analysis", "generating"].includes(stage);
  const pauseCurrentStep = () => {
    if (stage === "analyzing") setStage("brief");
    else if (stage === "directions-loading") {
      setBriefReply("");
      setStage("brief");
    }
    else if (stage === "candidates-loading") setStage("directions");
    else if (stage === "candidate-analysis") setStage("candidate-confirmation");
    else if (stage === "generating") setStage("matrix");
  };
  const feedEndRef = useRef<HTMLDivElement>(null);
  const completionReportedRef = useRef(initialComplete);
  const reduceMotion = useReducedMotion();
  const otherStyleSelected = styleChoices.includes("其他，请输入说明");
  const briefCanSubmit = Boolean(
    quantityChoice && styleChoices.length && (!otherStyleSelected || otherStyle.trim()) && repeatChoice && applicationChoice,
  );

  const stageIndex = useMemo(() => [
    "analyzing", "brief", "directions-loading", "directions", "candidates-loading", "candidates",
    "candidate-confirmation", "candidate-analysis", "strategy", "matrix", "generating", "results",
  ].indexOf(stage), [stage]);

  useEffect(() => {
    if (stage !== "analyzing") return;
    const timer = window.setTimeout(() => {
      setStage("brief");
      setAnalysisExpanded(false);
    }, reduceMotion ? 0 : 1800);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "directions-loading") return;
    const timer = window.setTimeout(() => setStage("directions"), reduceMotion ? 0 : 1400);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "candidates-loading") return;
    const timer = window.setTimeout(() => setStage("candidates"), reduceMotion ? 0 : 1700);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "candidate-analysis") return;
    const timer = window.setTimeout(() => setStage("strategy"), reduceMotion ? 0 : 2100);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "generating") return;
    if (batchProgress >= 2) {
      const timer = window.setTimeout(() => setStage("results"), reduceMotion ? 0 : 650);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => setBatchProgress((current) => current + 1),
      CONVERSATION_GENERATION_BATCH_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [batchProgress, reduceMotion, stage]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(feedEndRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [batchProgress, reduceMotion, resultFollowUps.length, stage]);

  useEffect(() => {
    if (stage !== "results" || completionReportedRef.current) return;
    completionReportedRef.current = true;
    onTaskComplete?.();
  }, [onTaskComplete, stage]);

  const saveReplyAttachments = (submittedAttachments: TaskConversationAttachment[]) => {
    if (!submittedAttachments.length) return;
    setReplyAttachments((current) => ({ ...current, [stage]: submittedAttachments }));
  };

  const submitMessage = (preset?: string, submittedAttachments: TaskConversationAttachment[] = []) => {
    const value = (preset ?? followUp).trim();
    if (!value && !submittedAttachments.length) return;
    onTaskProgress?.();
    saveReplyAttachments(submittedAttachments);
    setFollowUp("");
    if (stage === "brief") {
      setBriefReply(value);
      setStage("directions-loading");
    } else if (stage === "directions") {
      setDirectionReply(value);
      const typedIds = Array.from(new Set(value.toUpperCase().match(/[A-D]/g) ?? []));
      if (typedIds.length) setSelectedDirectionIds(typedIds);
      setStage("candidates-loading");
    } else if (stage === "candidates") {
      setStage("candidate-confirmation");
    } else if (stage === "candidate-confirmation") {
      setCandidateReply(value);
      setStage("candidate-analysis");
    } else if (stage === "strategy") {
      setStrategyReply(value);
      setStage("matrix");
    } else if (stage === "matrix") {
      setMatrixReply(value);
      setBatchProgress(0);
      setStage("generating");
    } else if (stage === "results") {
      setResultFollowUps((current) => [...current, {
        request: value,
        attachments: submittedAttachments,
        response: value
          ? `已收到你的追加要求：“${value}”。我会保留当前花型语言，继续生成调整方案。`
          : `已收到你补充的 ${submittedAttachments.length} 份资料，将纳入当前花型系列。`,
      }]);
    }
  };

  const confirmBrief = () => {
    if (!briefCanSubmit) return;
    const styles = styleChoices.map((choice) => choice === "其他，请输入说明" ? `其他：${otherStyle.trim()}` : choice);
    setBriefReply(`图案数量：${quantityChoice}；风格：${styles.join("、")}；连续方式：${repeatChoice}；应用品类：${applicationChoice}。`);
    setStage("directions-loading");
  };

  const confirmDirections = () => {
    if (!selectedDirectionIds.length || (selectedDirectionIds.includes("OTHER") && !customDirection.trim())) return;
    const labels = selectedDirectionIds.flatMap((id) => {
      const direction = patternDirections.find((item) => item.id === id);
      return direction ? [`${direction.id} · ${direction.title}`] : [];
    });
    if (selectedDirectionIds.includes("OTHER")) labels.push(`其他 · ${customDirection.trim()}`);
    setDirectionReply(labels.join(" + "));
    setStage("candidates-loading");
  };

  const skipCandidates = () => {
    onTaskProgress?.();
    setSelectedCandidates([]);
    setCandidateReply("");
    setCandidatesSkipped(true);
    setStage("candidate-analysis");
  };

  const downloadAsset = (path: string, name: string) => {
    const link = document.createElement("a");
    link.href = assetUrl(path);
    link.download = name;
    link.click();
  };

  const composerEnabled = ["brief", "directions", "candidates", "candidate-confirmation", "strategy", "matrix", "results"].includes(stage);
  const placeholders: Record<PatternStage, string> = {
    analyzing: "Agent 正在解析图案需求，请稍候...",
    brief: "补充花型风格、连续方式或应用品类...",
    "directions-loading": "Agent 正在规划图案方向，请稍候...",
    directions: "请先从上方表单完成设计方向选择...",
    "candidates-loading": "Agent 正在整理候选图案，请稍候...",
    candidates: "请先从上方选择参考图片，或选择跳过...",
    "candidate-confirmation": "回复“满意”，或输入需要调整的内容...",
    "candidate-analysis": "Agent 正在分析已选图案，请稍候...",
    strategy: "回复“认可，继续”，或输入调整意见...",
    matrix: "回复“开始生图”，或输入执行矩阵调整意见...",
    generating: "Agent 正在生成图案系列，请稍候...",
    results: "任务已完成，可继续提出改色、改密度或延展品类...",
  };

  const briefAcknowledgement = buildConditionAcknowledgement({ message: briefReply, attachments: replyAttachments.brief });
  const candidateAcknowledgement = buildConditionAcknowledgement({
    message: candidateReply,
    attachments: replyAttachments["candidate-confirmation"],
    ignoredMessages: ["满意，请继续"],
  });

  return (
    <motion.main className={`workspace-region workspace-region--conversation apparel-workspace pattern-workspace ${readOnly ? "is-read-only" : ""}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="conversation-stage" aria-label="图案设计任务对话">
        <div className="conversation-scroll">
          <ConversationFeed className="apparel-conversation-feed" metaDisabled={readOnly}>
            <UserMessage entrance>
              <ConversationUserAttachments attachments={attachments} />
              <span>{prompt}</span>
            </UserMessage>

            {stageIndex <= 0 ? (
              <AssistantMessage className="apparel-analysis-message">
                <p>我正在解析你的图案设计需求，提取元素、尺度、排列方式与应用场景。</p>
                <TaskDisclosure title="图案需求解析" expanded={analysisExpanded} complete={stage !== "analyzing"} controlsId="pattern-analysis-details" onToggle={() => setAnalysisExpanded((open) => !open)}>
                  <div><AnalysisStepIcon complete={false} /><span>识别主题元素、风格和密度倾向</span></div>
                  <div><AnalysisStepIcon complete={false} delay={0.06} /><span>判断四方连续、二方连续或定位印花适用性</span></div>
                  <div><AnalysisStepIcon complete={false} delay={0.12} /><span>检查待确认的数量、风格与应用品类</span></div>
                </TaskDisclosure>
              </AssistantMessage>
            ) : null}

            {stageIndex >= 1 && (
              <AssistantMessage className="conversation-scope-message">
                <p>已完成初步解析。在生成图案方向前，请确认以下参数：</p>
                <div className={`research-scope-form ${briefReply ? "is-readonly" : ""}`} data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="图案开发范围" status={briefReply ? "confirmed" : "pending"} statusLabel={briefReply ? "已确认" : "待确认"} />
                  <div className="research-scope-fields">
                    <fieldset className="research-scope-field">
                      <legend>图案数量 <span aria-hidden="true">*</span></legend>
                      <div className="research-scope-options">{quantityOptions.map((choice) => <button type="button" className={quantityChoice === choice ? "is-selected" : ""} aria-pressed={quantityChoice === choice} disabled={Boolean(briefReply)} onClick={() => setQuantityChoice(choice)} key={choice}>{choice}</button>)}</div>
                    </fieldset>
                    <div className="research-scope-divider" aria-hidden="true" />
                    <fieldset className="research-scope-field">
                      <legend>风格方向 · 支持多选 <span aria-hidden="true">*</span></legend>
                      <div className="research-scope-options">{styleOptions.map((choice) => <button type="button" className={styleChoices.includes(choice) ? "is-selected" : ""} aria-pressed={styleChoices.includes(choice)} disabled={Boolean(briefReply)} onClick={() => setStyleChoices((current) => current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice])} key={choice}>{choice}</button>)}</div>
                      <AnimatePresence initial={false}>
                        {otherStyleSelected ? (
                          <motion.div className="research-scope-other" initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: 97, opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <textarea value={otherStyle} onChange={(event) => setOtherStyle(event.target.value)} readOnly={Boolean(briefReply)} placeholder="请输入其他图案风格" aria-label="其他图案风格" />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </fieldset>
                    <div className="research-scope-divider" aria-hidden="true" />
                    <fieldset className="research-scope-field">
                      <legend>连续方式 <span aria-hidden="true">*</span></legend>
                      <div className="research-scope-options">{repeatOptions.map((choice) => <button type="button" className={repeatChoice === choice ? "is-selected" : ""} aria-pressed={repeatChoice === choice} disabled={Boolean(briefReply)} onClick={() => setRepeatChoice(choice)} key={choice}>{choice}</button>)}</div>
                    </fieldset>
                    <div className="research-scope-divider" aria-hidden="true" />
                    <fieldset className="research-scope-field">
                      <legend>应用品类 <span aria-hidden="true">*</span></legend>
                      <div className="research-scope-options">{applicationOptions.map((choice) => <button type="button" className={applicationChoice === choice ? "is-selected" : ""} aria-pressed={applicationChoice === choice} disabled={Boolean(briefReply)} onClick={() => setApplicationChoice(choice)} key={choice}>{choice}</button>)}</div>
                    </fieldset>
                  </div>
                  {!briefReply && <div className="research-scope-actions"><BusinessButton points={8} disabled={!briefCanSubmit} onClick={confirmBrief}>确认并继续</BusinessButton></div>}
                </div>
              </AssistantMessage>
            )}

            {briefReply && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments.brief ?? []} /><span>{briefReply}</span></UserMessage>}
            {briefAcknowledgement && replyAttachments.brief?.length ? <AssistantMessage><p>{briefAcknowledgement}</p></AssistantMessage> : null}

            {stage === "directions-loading" && <AssistantMessage><LoadingTask title="图案方向规划" lines={["提取花型元素与构图逻辑", "推演连续方式与应用尺度", "组织可执行的图案方向"]} /></AssistantMessage>}

            {stageIndex >= 3 && (
              <AssistantMessage>
                <p>基于已确认的风格和应用场景，请选择你想继续探索的图案方向：</p>
                <div className={`research-scope-form apparel-direction-form ${stage === "directions" ? "is-editable" : "is-readonly"}`} data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="设计方向 · 支持多选" status={stage === "directions" ? "pending" : "confirmed"} statusLabel={stage === "directions" ? "待确认" : "已确认"} />
                  <div className="apparel-direction-options">
                    {patternDirections.map((direction) => <SelectionCard mode="checkbox" selected={selectedDirectionIds.includes(direction.id)} disabled={stage !== "directions"} title={`${direction.id} · ${direction.title}`} description={direction.description} className="apparel-direction-card" onSelect={() => setSelectedDirectionIds((current) => current.includes(direction.id) ? current.filter((id) => id !== direction.id) : [...current, direction.id])} key={direction.id} />)}
                    <div className={`selection-card selection-card--checkbox selection-card--text apparel-direction-card apparel-direction-card--other ${selectedDirectionIds.includes("OTHER") ? "is-selected" : ""}`}>
                      <span className="apparel-direction-option__copy">
                        <strong>其他方向</strong>
                        <input
                          value={customDirection}
                          disabled={stage !== "directions"}
                          onFocus={() => {
                            if (!selectedDirectionIds.includes("OTHER")) setSelectedDirectionIds((current) => [...current, "OTHER"]);
                          }}
                          onChange={(event) => setCustomDirection(event.target.value)}
                          placeholder="输入自定义元素、风格或配色"
                          aria-label="自定义图案方向"
                        />
                      </span>
                      <button
                        type="button"
                        className="apparel-direction-option__check"
                        aria-label="选择其他图案方向"
                        aria-pressed={selectedDirectionIds.includes("OTHER")}
                        disabled={stage !== "directions"}
                        onClick={() => setSelectedDirectionIds((current) => current.includes("OTHER") ? current.filter((id) => id !== "OTHER") : [...current, "OTHER"])}
                      >
                        <SelectionControl mode="checkbox" selected={selectedDirectionIds.includes("OTHER")} />
                      </button>
                    </div>
                  </div>
                  {stage === "directions" && <div className="research-scope-actions"><BusinessButton points={10} disabled={!selectedDirectionIds.length || (selectedDirectionIds.includes("OTHER") && !customDirection.trim())} onClick={confirmDirections}>确认并继续</BusinessButton></div>}
                </div>
              </AssistantMessage>
            )}

            {directionReply && <UserMessage entrance><span>{directionReply}</span></UserMessage>}
            {stage === "candidates-loading" && <AssistantMessage><LoadingTask title="候选图案检索与生成" lines={["筛选元素、线条与色彩参考", "匹配花型密度与连续方式", "整理候选图案池"]} /></AssistantMessage>}

            {stageIndex >= 5 && (
              <AssistantMessage className="conversation-candidate-grid-message">
                <p>请从候选池中选择你喜欢的图案参考。</p>
                <div className={`research-scope-form media-selection-form ${stage === "candidates" ? "" : "is-readonly"}`} data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="候选图案池 · 支持多选" status={stage === "candidates" ? "pending" : "confirmed"} statusLabel={stage === "candidates" ? "待确认" : candidatesSkipped ? "已跳过" : "已确认"} />
                  <div className="conversation-candidate-grid" role="group" aria-label="候选图案池，支持多选">
                    {patternCandidateItems.map((item) => (
                      <MasonryImageSelection
                        src={assetUrl(item.src)}
                        alt={`${item.code} ${item.title}`}
                        label={`${item.code} · ${item.title}`}
                        selected={selectedCandidates.includes(item.id)}
                        disabled={stage !== "candidates"}
                        onSelect={() => setSelectedCandidates((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                        onPreview={() => setPreviewCandidate(item.id)}
                        key={item.id}
                      />
                    ))}
                  </div>
                  {stage === "candidates" && <div className="research-scope-actions"><SelectAllControl selected={selectedCandidates.length === candidateIds.length} className="selection-select-all--leading" onToggle={() => setSelectedCandidates(selectedCandidates.length === candidateIds.length ? [] : [...candidateIds])} /><Button variant="secondary" size="small" onClick={skipCandidates}>跳过</Button><Button variant="primary" size="small" disabled={!selectedCandidates.length} onClick={() => submitMessage(`已选择 ${selectedCandidates.length} 张图案参考`)}>下一步</Button></div>}
                </div>
              </AssistantMessage>
            )}

            {candidatesSkipped && <UserMessage entrance><span>跳过参考素材</span></UserMessage>}
            {candidatesSkipped && stageIndex >= 7 && <AssistantMessage><p>已跳过参考素材选择。后续将仅基于已确认的设计方向、连续方式与应用品类继续生成图案。</p></AssistantMessage>}
            {stageIndex >= 6 && !candidatesSkipped && <UserMessage entrance><span>已选择 {selectedCandidates.length} 张图案参考：{selectedCandidates.join("、")}</span></UserMessage>}
            {stageIndex >= 6 && !candidatesSkipped && (
              <AssistantMessage>
                <p>当前共选择 {selectedCandidates.length} 张参考图案。我将解析元素、笔触、配色、密度与循环骨架，再进入执行阶段。</p>
                <p>如果选择满意，请继续；也可以补充需要排除的元素。</p>
                {stage === "candidate-confirmation" && <PatternQuickReply onClick={() => submitMessage("满意，请继续")}>满意，请继续</PatternQuickReply>}
              </AssistantMessage>
            )}

            {candidateReply && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments["candidate-confirmation"] ?? []} /><span>{candidateReply}</span></UserMessage>}
            {candidateAcknowledgement && <AssistantMessage><p>{candidateAcknowledgement}</p></AssistantMessage>}

            {stageIndex >= 7 && (
              <AssistantMessage>
                <p>{candidatesSkipped ? "我正在基于已确认的设计方向和应用边界建立花型语言。" : "我正在深度解析已选图案，提取可复用的花型语言与应用边界。"}</p>
                <TaskDisclosure title={candidatesSkipped ? "设计方向解析" : "图案深度解析"} expanded={candidateAnalysisExpanded} complete={stage !== "candidate-analysis"} controlsId="pattern-candidate-analysis-details" onToggle={() => setCandidateAnalysisExpanded((open) => !open)}>
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} /><span>解析主题元素、笔触与构图中心</span></div>
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} delay={0.06} /><span>提取色板、对比与背景色关系</span></div>
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} delay={0.12} /><span>归纳花型尺度、密度与循环方式</span></div>
                </TaskDisclosure>
              </AssistantMessage>
            )}

            {stageIndex >= 8 && (
              <AssistantMessage className="apparel-document">
                <h2>《轻盈花园》图案设计执行书</h2>
                <h3>第一部分：策略综述</h3>
                <p>以植物花卉为系列核心，通过手绘线条、几何重组和抽象放大形成三个商品层级，同时兼顾连续面料与定位印花。</p>
                <table><thead><tr><th>波段</th><th>定位</th><th>图案编号</th><th>应用目的</th></tr></thead><tbody>
                  <tr><td>Phase 1</td><td>{phaseTitles[0]}</td><td>PT #01-03</td><td>适合衬衫、半裙和商业基础款</td></tr>
                  <tr><td>Phase 2</td><td>{phaseTitles[1]}</td><td>PT #04-06</td><td>强化度假感与远视识别度</td></tr>
                  <tr><td>Phase 3</td><td>{phaseTitles[2]}</td><td>PT #07-08</td><td>承担边饰与主视觉定位印花</td></tr>
                </tbody></table>
                <h3>第二部分：生产可行性</h3>
                <ul>
                  <li>连续花型预留足够循环边界，减少接驳断层。</li>
                  <li>主色控制在 4–6 色，便于数码印花与小批量打样。</li>
                  <li>大尺度花型优先用于连衣裙和定位印花，小花型用于衬衫与半裙。</li>
                </ul>
              </AssistantMessage>
            )}

            {stageIndex >= 8 && (
              <AssistantMessage>
                <p>当前策略将 8 款图案分为商业基础、风格识别和形象定位三个波段。如方向认可，我将继续制定每款图案的执行矩阵。</p>
                {stage === "strategy" && <PatternQuickReply onClick={() => submitMessage("认可，请继续")}>认可，请继续</PatternQuickReply>}
              </AssistantMessage>
            )}

            {strategyReply && <UserMessage entrance><span>{strategyReply}</span></UserMessage>}

            {stageIndex >= 9 && (
              <AssistantMessage className="apparel-document apparel-matrix">
                <h3>第三部分：图案执行矩阵</h3>
                {patternPlan.map((item, index) => (
                  <section className="apparel-sku" key={item[0]}>
                    {index === 0 && <h4>【Phase 1：{phaseTitles[0]}】PT #01-03</h4>}
                    {index === 3 && <h4>【Phase 2：{phaseTitles[1]}】PT #04-06</h4>}
                    {index === 6 && <h4>【Phase 3：{phaseTitles[2]}】PT #07-08</h4>}
                    <strong>PT #{item[0]}：{item[1]}</strong>
                    <table><tbody><tr><th>设计方法</th><td>{item[2]}</td></tr><tr><th>执行细节</th><td>{item[3]}</td></tr><tr><th>输出规格</th><td>1:1 图案预览，支持后续四方连续与配色延展。</td></tr></tbody></table>
                  </section>
                ))}
              </AssistantMessage>
            )}

            {stageIndex >= 9 && <AssistantMessage><p>执行矩阵已完成。确认后请开始生图，我会分两批输出 8 款图案。</p>{stage === "matrix" && <PatternQuickReply onClick={() => submitMessage("开始生图")}>开始生图</PatternQuickReply>}</AssistantMessage>}
            {matrixReply && <UserMessage entrance><span>{matrixReply}</span></UserMessage>}

            {(stage === "generating" || stage === "results") && (
              <AssistantMessage className="apparel-generation-message">
                {stage === "generating" ? <p>正在为你生成图案图片。</p> : null}
                {[0, 1].filter((batch) => stage === "results" || batch <= batchProgress).map((batch) => {
                  const complete = stage === "results" || batch < batchProgress;
                  const start = batch * 4;
                  return (
                    <ConversationGeneratedImageBatch
                      title={`我正在为系列的第 ${batch + 1} 批生成图案（PT #${String(start + 1).padStart(2, "0")}-${String(start + 4).padStart(2, "0")}）`}
                      images={Array.from({ length: 4 }, (_, itemIndex) => ({
                        id: generatedPatternItems[start + itemIndex].id,
                        src: patternAsset(start + itemIndex),
                        alt: `生成图案 PT ${start + itemIndex + 1}`,
                      }))}
                      complete={complete}
                      onPreview={setPreviewResult}
                      key={batch}
                    />
                  );
                })}
              </AssistantMessage>
            )}

            {stage === "results" && (
              <>
                <AssistantMessage className="apparel-document apparel-result-review">
                  <h2>《轻盈花园》图案成果展示</h2>
                  <p>8 款图案已完成。系列从小尺度商业花型逐步延展至高识别度定位印花，可用于连衣裙、半裙、衬衫与配饰。</p>
                  {patternPlan.map((item, index) => <section className="apparel-result-logic" key={item[0]}>{index === 0 && <h3>Phase 1：{phaseTitles[0]}</h3>}{index === 3 && <h3>Phase 2：{phaseTitles[1]}</h3>}{index === 6 && <h3>Phase 3：{phaseTitles[2]}</h3>}<h4>PT #{item[0]}：{item[1]}</h4><p><strong>设计逻辑：</strong>{item[2]}。{item[3]}</p></section>)}
                </AssistantMessage>
                <AssistantMessage className="apparel-results">
                  <p>图案预览</p>
                  <div className="customer-ai-result-grid customer-ai-result-grid--all">
                    {generatedPatternItems.map((item) => (
                      <MasonryImageSelection
                        src={assetUrl(item.src)}
                        alt={`${item.code} ${item.title}`}
                        label={`${item.code} · ${item.title}`}
                        selected={false}
                        previewOnly
                        onSelect={() => undefined}
                        onPreview={() => setPreviewResult(item.id)}
                        key={item.id}
                      />
                    ))}
                  </div>
                </AssistantMessage>
                <AssistantMessage><ConversationTaskCompletion /></AssistantMessage>
              </>
            )}

            {resultFollowUps.map((message, index) => <ConversationFollowUpExchange {...message} key={`${message.request}-${index}`} />)}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>

        {!readOnly ? <>
        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer
          className="apparel-composer"
          attachmentMode="image-only"
          ariaLabel="继续图案设计对话"
          value={followUp}
          onChange={setFollowUp}
          onSubmit={(submittedAttachments) => submitMessage(undefined, submittedAttachments)}
          placeholder={placeholders[stage]}
          hint={stage === "directions" ? "请先从上方表单完成设计方向选择" : stage === "candidates" ? "请先从上方选择参考图片，或选择跳过" : undefined}
          disabled={!composerEnabled || stage === "directions" || stage === "candidates"}
          isRunning={taskRunning}
          onStop={pauseCurrentStep}
        />
        </> : null}
      </section>

      {previewCandidate ? (
        <ImageGalleryLightbox
          categories={patternCandidateCategories}
          items={patternCandidateItems}
          activeCategoryId={patternCandidateCategories[0].id}
          activeItemId={previewCandidate}
          selectedIds={selectedCandidates}
          selectionDisabled={stage !== "candidates"}
          hideSourceAction
          onCategoryChange={() => setPreviewCandidate(patternCandidateItems[0].id)}
          onNavigate={setPreviewCandidate}
          onToggleSelection={(itemId) => setSelectedCandidates((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])}
          onClose={() => setPreviewCandidate(null)}
        />
      ) : null}
      {previewResult ? (
        <ImageGalleryLightbox
          title="AI图案"
          categories={patternGalleryCategories}
          items={generatedPatternItems}
          activeCategoryId={patternGalleryCategories[0].id}
          activeItemId={previewResult}
          selectedIds={[]}
          selectionDisabled
          hideSelection
          copyMode="title-only"
          resultActions={{
            onDownload: (item) => downloadAsset(item.src, `${item.code}-${item.title}.jpg`),
          }}
          presentation="detail"
          showCategories={false}
          onCategoryChange={() => undefined}
          onNavigate={setPreviewResult}
          onToggleSelection={() => undefined}
          onClose={() => setPreviewResult(null)}
        />
      ) : null}
    </motion.main>
  );
}
