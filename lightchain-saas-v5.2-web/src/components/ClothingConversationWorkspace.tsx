import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { ImageGalleryLightbox, MasonryImageSelection, type ImageGalleryCategory, type ImageGalleryItem } from "./ImageSelection";
import { BusinessButton, Button, QuickReplyButton } from "./Button";
import { AnalysisStepIcon, CONVERSATION_GENERATION_BATCH_DELAY_MS, ConversationFeed, ConversationFollowUpExchange, ConversationFormTitle, ConversationGeneratedImageBatch, ConversationTaskCompletion, ConversationUserMessage as UserMessage, SelectAllControl, TaskDisclosure } from "./ConversationPrimitives";
import { TaskConversationComposer, type TaskConversationAttachment } from "./TaskConversationComposer";
import { useGsapEntrance } from "../motion/gsap";
import { SelectionCard, SelectionControl } from "./SelectionCard";
import { ConversationUserAttachments } from "./ConversationUserAttachments";
import { extractPromptContext, getPromptExclusions } from "../utils/promptContext";
import { ProgressiveImage } from "./ProgressiveImage";
import { buildConditionAcknowledgement } from "../utils/taskAcknowledgement";
import { scrollWithinConversation } from "../utils/conversationScroll";

type ApparelStage =
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
const referenceImage = "assets/apparel-design/candidate-jacket.png";
const userReferences = [
  "assets/apparel-design/reference-jacket.png",
  "assets/apparel-design/reference-knit.png",
];

const designDirections = [
  {
    id: "A",
    title: "传家宝经典复刻",
    description: "保留飞行员夹克的投资单品价值，通过辅料、皮革质感和领部细节建立系列基因。",
  },
  {
    id: "B",
    title: "精致辅料升级",
    description: "保持廓形稳定，以哑光金属、精细车缝和压印皮标提升品牌精致度。",
  },
  {
    id: "C",
    title: "功能性模块化",
    description: "加入可拆卸毛领、模块口袋和多穿结构，增强实穿性与场景适配。",
  },
  {
    id: "D",
    title: "解构门襟创新",
    description: "通过斜门襟、双层门襟与不对称结构，在经典骨架上增加鲜明识别度。",
  },
];

const knitCardiganDirections = [
  { id: "A", title: "轻盈通勤基础", description: "围绕针织开衫的轻薄层次、利落门襟与日常通勤比例建立核心款。" },
  { id: "B", title: "细腻肌理升级", description: "通过细针组织、局部纹理和克制包边提升米白针织的质感层次。" },
  { id: "C", title: "柔性结构塑形", description: "利用肩线、腰节和下摆收束形成有结构但不厚重的春季廓形。" },
  { id: "D", title: "模块化轻搭", description: "加入可拆领巾、局部系带或双穿细节，扩展通勤与休闲搭配场景。" },
] as const;

const skuPlan = [
  ["01", "经典复刻 · 原版致敬", "Image_1", "装饰减少法 + 改变形式法", "完整保留立领、插肩袖、罗纹收口与翻盖贴袋，辅料升级为黄铜拉丝质感。"],
  ["02", "毛领奢华 · 冬季升级", "Image_1", "部位增加法", "在立领内侧增加可翻折羊羔绒毛领衬里，保持原有门襟和收口结构。"],
  ["03", "拉链门襟 · 现代转译", "Image_1 + Image_2", "细节转移法", "将纽扣门襟替换为金属拉链门襟，以粗齿黄铜拉链强化硬朗质感。"],
  ["04", "斜门襟 · 视觉拉长", "Image_1", "逆向改款法", "将正中门襟改为右肩斜向腰际的斜线门襟，打破对称并拉长比例。"],
  ["05", "双层门襟 · 假两件", "Image_1 + Image_2", "款式组合方法", "外层采用敞开式门襟，内层增加拉链闭合立领内胆，支持分离穿着。"],
  ["06", "环绕式门襟 · 围裹结构", "Image_1", "逆向改款法 + 部位增加法", "取消正面门襟，以腰部皮带与肩部暗扣形成环绕式围裹结构。"],
  ["07", "茧型廓形 · 体积实验", "Image_1", "廓形限定法", "采用茧型廓形强化肩部收窄、胸腹膨胀与下摆收拢。"],
  ["08", "撞色拼接 · 运动解构", "Image_1 + Image_3", "品类转移法 + 组合更换法", "融合米白羊皮衣身与黑色皮革袖部，加入运动棒球夹克逻辑。"],
] as const;

const knitCardiganSkuPlan = [
  ["01", "轻薄圆领 · 通勤基础", "Image_1", "比例调整法", "以细针组织和短款比例形成轻盈通勤开衫。"],
  ["02", "V 领门襟 · 纵向延伸", "Image_1", "改变形式法", "以窄 V 领和精细门襟拉长上身比例。"],
  ["03", "局部罗纹 · 肌理对比", "Image_1 + Image_2", "细节转移法", "在袖口与侧片加入同色罗纹，维持米白色整体感。"],
  ["04", "柔性收腰 · 轻结构", "Image_1", "廓形限定法", "通过腰节收束形成有结构但不紧绷的春季廓形。"],
  ["05", "双层门襟 · 精致层次", "Image_1 + Image_2", "部位增加法", "使用同色双层门襟增加细节，不引入外套式厚重结构。"],
  ["06", "可拆领巾 · 场景切换", "Image_1", "模块组合方法", "加入可拆卸轻薄领巾，支持通勤与休闲切换。"],
  ["07", "短袖开衫 · 春夏过渡", "Image_1", "品类延展法", "保留针织开衫语言并转为短袖比例，扩展温暖天气场景。"],
  ["08", "微透叠穿 · 轻盈表达", "Image_1 + Image_3", "材质替换法", "采用疏密变化的同色针织组织形成克制的透气层次。"],
] as const;

const candidateIds = Array.from({ length: 16 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`);
const quantityOptions = ["完整系列开发（8款）", "快速出4款查看效果", "自定义数量"];
const styleOptions = ["延续经典", "融入机车元素", "轻奢商务", "其他，请输入说明"];
const commercialOptions = ["轻奢品质", "商业试穿", "快反平价"];
const changeOptions = ["微调", "中等改动", "大幅重组"];

function LoadingTask({ title, lines }: { title: string; lines: string[] }) {
  const [expanded, setExpanded] = useState(true);
  const controlsId = useId();

  return (
    <TaskDisclosure title={title} expanded={expanded} complete={false} controlsId={controlsId} onToggle={() => setExpanded((open) => !open)}>
      {lines.map((line, index) => <div key={line}><AnalysisStepIcon complete={false} delay={index * 0.06} /><span>{line}</span></div>)}
    </TaskDisclosure>
  );
}

function AssistantMessage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const messageRef = useGsapEntrance<HTMLElement>();
  return (
    <article className={`conversation-message conversation-message--assistant apparel-assistant-message ${className}`} data-message-actions="true" ref={messageRef}>
      {children}
    </article>
  );
}

function ApparelQuickReply({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="conversation-quick-actions"
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.12, ease: revealEase }}
    >
      <QuickReplyButton onClick={onClick}>{children}</QuickReplyButton>
    </motion.div>
  );
}

export function ClothingConversationWorkspace({ prompt, attachments = [], initialState = "default", onTaskProgress, onTaskComplete, readOnly = false }: {
  prompt: string;
  attachments?: Attachment[];
  initialState?: "default" | "confirmation" | "complete";
  onTaskProgress?: () => void;
  onTaskComplete?: () => void;
  readOnly?: boolean;
}) {
  const promptContext = useMemo(() => extractPromptContext(prompt), [prompt]);
  const promptExclusions = useMemo(() => getPromptExclusions(prompt), [prompt]);
  const isKnitCardigan = /(?:针织|开衫)/.test(prompt);
  const apparelItem = promptContext.garment ?? "服装款式";
  const activeDesignDirections = isKnitCardigan ? knitCardiganDirections : designDirections;
  const activeSkuPlan = isKnitCardigan ? knitCardiganSkuPlan : skuPlan;
  const activeReferenceImage = isKnitCardigan ? "assets/apparel-design/reference-knit.png" : referenceImage;
  const materialSummary = isKnitCardigan ? "识别针织组织、纱线质感、门襟、肩线与收口结构" : "识别皮革质感、金属辅料、车缝和口袋结构";
  const seriesTitle = isKnitCardigan ? `轻盈通勤·${apparelItem}系列` : "经典解构·飞行员皮夹克系列";
  const exclusionSummary = promptExclusions.length ? `；排除条件：${promptExclusions.join("、")}` : "";
  const phaseTitles = isKnitCardigan
    ? ["轻盈基础款", "肌理升级款", "场景延展款"]
    : ["经典传承款", "门襟革新款", "解构实验款"];
  const apparelCandidateCategories = useMemo<ImageGalleryCategory[]>(() => [
    { id: "apparel-reference", label: `${apparelItem}参考` },
  ], [apparelItem]);
  const apparelCandidateItems = useMemo<ImageGalleryItem[]>(() => candidateIds.map((candidateId, index) => ({
    id: candidateId,
    categoryId: "apparel-reference",
    code: candidateId,
    src: activeReferenceImage,
    title: `${apparelItem}候选参考 ${String(index + 1).padStart(2, "0")}`,
    subtitle: isKnitCardigan ? "针织组织、门襟与轻盈比例参考" : "飞行员夹克廓形、门襟与辅料参考",
    badges: [apparelItem, index % 2 === 0 ? "廓形参考" : "结构细节", index < 6 ? "商业基础" : index < 12 ? "风格升级" : "形象表达"],
    detailLines: [
      `候选素材 · ${apparelItem}`,
      isKnitCardigan ? "重点观察：针织组织、肩线、门襟与收口" : "重点观察：皮革质感、领型、门襟与辅料",
      `候选编号：${candidateId}`,
    ],
  })), [activeReferenceImage, apparelItem, isKnitCardigan]);
  const apparelResultCategories = useMemo<ImageGalleryCategory[]>(() => [
    { id: "apparel-result", label: "生成款式" },
  ], []);
  const apparelResultItems = useMemo<ImageGalleryItem[]>(() => activeSkuPlan.map((sku, index) => ({
    id: sku[0],
    categoryId: "apparel-result",
    code: `SKU ${sku[0]}`,
    src: activeReferenceImage,
    title: sku[1],
    subtitle: sku[3],
    badges: [index < 3 ? phaseTitles[0] : index < 6 ? phaseTitles[1] : phaseTitles[2], apparelItem],
    detailLines: [`素材调用：${sku[2]}`, `设计公式：${sku[3]}`, sku[4]],
  })), [activeReferenceImage, activeSkuPlan, apparelItem, phaseTitles]);
  const startsComplete = initialState === "complete";
  const startsAtConfirmation = initialState === "confirmation";
  const completedDirectionIds = isKnitCardigan ? ["A", "B"] : ["A", "D"];
  const completedDirectionReply = completedDirectionIds
    .map((id) => {
      const direction = activeDesignDirections.find((item) => item.id === id);
      return direction ? `${direction.id} · ${direction.title}` : id;
    })
    .join(" + ");
  const completionReportedRef = useRef(startsComplete);
  const [stage, setStage] = useState<ApparelStage>(startsComplete ? "results" : startsAtConfirmation ? "brief" : "analyzing");
  const [analysisExpanded, setAnalysisExpanded] = useState(!startsAtConfirmation && !startsComplete);
  const [followUp, setFollowUp] = useState("");
  const [briefReply, setBriefReply] = useState(startsComplete ? "已确认完整系列开发、风格方向、商业定位与改款幅度" : "");
  const [quantityChoice, setQuantityChoice] = useState(quantityOptions[0]);
  const [styleChoices, setStyleChoices] = useState<string[]>(startsAtConfirmation || startsComplete ? ["延续经典", "轻奢商务"] : []);
  const [otherStyleDirection, setOtherStyleDirection] = useState("");
  const [commercialChoice, setCommercialChoice] = useState(startsAtConfirmation || startsComplete ? "轻奢品质" : "");
  const [changeChoice, setChangeChoice] = useState(startsAtConfirmation || startsComplete ? "中等改动" : "");
  const [directionReply, setDirectionReply] = useState(startsComplete ? completedDirectionReply : "");
  const [selectedDirectionIds, setSelectedDirectionIds] = useState<string[]>(startsComplete ? completedDirectionIds : []);
  const [customDirection, setCustomDirection] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>(startsComplete ? candidateIds.slice(0, 6) : []);
  const [candidatesSkipped, setCandidatesSkipped] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [candidateReply, setCandidateReply] = useState(startsComplete ? "满意，请继续" : "");
  const [candidateAnalysisExpanded, setCandidateAnalysisExpanded] = useState(!startsComplete);
  const [strategyReply, setStrategyReply] = useState(startsComplete ? "认可，请继续" : "");
  const [matrixReply, setMatrixReply] = useState(startsComplete ? "开始生图" : "");
  const [replyAttachments, setReplyAttachments] = useState<Partial<Record<ApparelStage, TaskConversationAttachment[]>>>({});
  const briefAcknowledgement = buildConditionAcknowledgement({ message: briefReply, attachments: replyAttachments.brief });
  const directionAcknowledgement = buildConditionAcknowledgement({ message: directionReply, attachments: replyAttachments.directions });
  const candidateAcknowledgement = buildConditionAcknowledgement({
    message: candidateReply,
    attachments: replyAttachments["candidate-confirmation"],
    ignoredMessages: ["满意，请继续"],
  });
  const strategyAcknowledgement = buildConditionAcknowledgement({
    message: strategyReply,
    attachments: replyAttachments.strategy,
    ignoredMessages: ["认可，请继续"],
  });
  const matrixAcknowledgement = buildConditionAcknowledgement({
    message: matrixReply,
    attachments: replyAttachments.matrix,
    ignoredMessages: ["开始生图"],
  });
  const [batchProgress, setBatchProgress] = useState(startsComplete ? 2 : 0);
  const [resultFollowUps, setResultFollowUps] = useState<Array<{ request: string; attachments: TaskConversationAttachment[]; response: string }>>([]);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const otherStyleSelected = styleChoices.includes("其他，请输入说明");
  const briefCanSubmit = Boolean(
    quantityChoice
    && styleChoices.length
    && (!otherStyleSelected || otherStyleDirection.trim())
    && commercialChoice
    && changeChoice,
  );
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
    const timer = window.setTimeout(() => setStage("directions"), reduceMotion ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "candidates-loading") return;
    const timer = window.setTimeout(() => setStage("candidates"), reduceMotion ? 0 : 1800);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "candidate-analysis") return;
    const timer = window.setTimeout(() => setStage("strategy"), reduceMotion ? 0 : 2200);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "generating") return;
    if (batchProgress >= 2) {
      const completionTimer = window.setTimeout(() => setStage("results"), reduceMotion ? 0 : 700);
      return () => window.clearTimeout(completionTimer);
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

  const stageIndex = useMemo(() => [
    "analyzing", "brief", "directions-loading", "directions", "candidates-loading", "candidates", "candidate-confirmation", "candidate-analysis", "strategy", "matrix", "generating", "results",
  ].indexOf(stage), [stage]);
  const submitMessage = (preset?: string, submittedAttachments: TaskConversationAttachment[] = []) => {
    const value = (preset ?? followUp).trim();
    if (!value && !submittedAttachments.length) return;
    onTaskProgress?.();
    if (preset === undefined && submittedAttachments.length) {
      setReplyAttachments((current) => ({ ...current, [stage]: submittedAttachments }));
    }
    setFollowUp("");
    if (stage === "brief") {
      setBriefReply(value);
      setStage("directions-loading");
    } else if (stage === "directions") {
      setDirectionReply(value);
      const typedDirectionIds = Array.from(new Set(value.toUpperCase().match(/[A-D]/g) ?? []));
      if (typedDirectionIds.length) setSelectedDirectionIds(typedDirectionIds);
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
          ? `已收到你的追加要求：“${value}”。我会基于当前 8 款设计成果继续处理，并保留现有系列设定。`
          : `已收到你补充的 ${submittedAttachments.length} 份资料。我会基于当前 8 款设计成果继续处理，并保留现有系列设定。`,
      }]);
    }
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates((current) => current.includes(candidateId)
      ? current.filter((id) => id !== candidateId)
      : [...current, candidateId]);
  };

  const skipCandidates = () => {
    onTaskProgress?.();
    setSelectedCandidates([]);
    setCandidateReply("");
    setCandidatesSkipped(true);
    setStage("candidate-analysis");
  };

  const downloadResult = (skuId: string, skuName: string) => {
    const link = document.createElement("a");
    link.href = assetUrl(activeReferenceImage);
    link.download = `SKU-${skuId}-${skuName}.png`;
    link.click();
  };

  const toggleDirection = (directionId: string) => {
    if (stage !== "directions") return;
    setSelectedDirectionIds((current) => current.includes(directionId)
      ? current.filter((id) => id !== directionId)
      : [...current, directionId]);
  };

  const confirmDirections = () => {
    if (!selectedDirectionIds.length || (selectedDirectionIds.includes("OTHER") && !customDirection.trim())) return;
    const labels = selectedDirectionIds.flatMap((directionId) => {
      const direction = activeDesignDirections.find((item) => item.id === directionId);
      return direction ? [`${direction.id} · ${direction.title}`] : [];
    });
    if (selectedDirectionIds.includes("OTHER")) labels.push(`其他 · ${customDirection.trim()}`);
    setDirectionReply(labels.join(" + "));
    setStage("candidates-loading");
  };

  const toggleStyleChoice = (choice: string) => {
    if (stage !== "brief") return;
    setStyleChoices((current) => current.includes(choice)
      ? current.filter((item) => item !== choice)
      : [...current, choice]);
  };

  const confirmBrief = () => {
    if (!briefCanSubmit) return;
    const confirmedStyles = styleChoices.map((choice) => choice === "其他，请输入说明" ? `其他：${otherStyleDirection.trim()}` : choice);
    setBriefReply(`出款数量：${quantityChoice}；风格方向：${confirmedStyles.join("、")}；商业定位：${commercialChoice}；改款幅度：${changeChoice}；`);
    setStage("directions-loading");
  };

  const composerEnabled = ["brief", "directions", "candidates", "candidate-confirmation", "strategy", "matrix", "results"].includes(stage);
  const composerPlaceholder: Record<ApparelStage, string> = {
    analyzing: "Agent 正在解析款式需求，请稍候...",
    brief: "补充出款数量、风格、商业定位或改款幅度，也可完成上方表单...",
    "directions-loading": "Agent 正在规划设计方向，请稍候...",
    directions: "输入 A/B/C/D 选择方向，支持多选；也可在上方直接选择...",
    "candidates-loading": "Agent 正在生成候选参考素材，请稍候...",
    candidates: "请在上方选择参考素材，或输入补充筛选要求...",
    "candidate-confirmation": "回复“满意”，或输入需要调整和补充的内容...",
    "candidate-analysis": "Agent 正在分析已选参考素材，请稍候...",
    strategy: "回复“认可，继续”，或输入需要调整的设计策略...",
    matrix: "回复“开始生图”，或输入需要调整的执行矩阵...",
    generating: "Agent 正在生成系列设计，请稍候...",
    results: "任务已完成，可继续提出修改意见或追加任务...",
  };

  return (
    <motion.main className={`workspace-region workspace-region--conversation apparel-workspace ${readOnly ? "is-read-only" : ""}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="conversation-stage" aria-label="款式设计任务对话">
        <div className="conversation-scroll">
          <ConversationFeed className="apparel-conversation-feed" metaDisabled={readOnly}>
            {!attachments.length && prompt.includes("上传") && (
              <div className="apparel-user-reference-grid">
                {userReferences.map(assetUrl).slice(0, 2).map((src, index) => (
                  <ProgressiveImage src={src} alt={`款式参考图 ${index + 1}`} key={`${src}-${index}`} />
                ))}
              </div>
            )}
            <UserMessage entrance>
              <ConversationUserAttachments attachments={attachments} />
              <span>{prompt}</span>
            </UserMessage>

            <AssistantMessage className={stageIndex >= 1 ? "apparel-analysis-message is-complete" : "apparel-analysis-message"}>
              <p>我正在对你的款式设计需求进行解析，提取廓形、工艺、材质与商业定位。</p>
              <TaskDisclosure
                title="图像解析"
                expanded={analysisExpanded}
                complete={stage !== "analyzing"}
                controlsId="apparel-image-analysis-details"
                onToggle={() => setAnalysisExpanded((expanded) => !expanded)}
              >
                <div><AnalysisStepIcon complete={stage !== "analyzing"} /><span>识别参考款式的廓形与结构</span></div>
                <p>{isKnitCardigan ? `提取${apparelItem}的领型、门襟、肩线、针织组织与收口特征` : "提取立领、门襟、插肩袖与罗纹收口等版型特征"}</p>
                <div><AnalysisStepIcon complete={stage !== "analyzing"} delay={0.06} /><span>提取工艺、辅料与材质要素</span></div>
                <p>{materialSummary}</p>
                <div><AnalysisStepIcon complete={stage !== "analyzing"} delay={0.12} /><span>检查待确认的设计参数</span></div>
                <p>确认出款数量、风格方向、商业定位与改款幅度</p>
              </TaskDisclosure>
            </AssistantMessage>

            {stageIndex >= 1 && (
              <AssistantMessage className="conversation-scope-message">
                <p>已完成初步解析。</p>
                  <div className={`research-scope-form ${briefReply ? "is-readonly" : ""}`} data-message-meta="disabled" data-copy-exclude="true" data-node-id="563:34957">
                    <ConversationFormTitle
                      title="为了更精准地规划系列，请确认以下几点："
                      status={briefReply ? "confirmed" : "pending"}
                      statusLabel={briefReply ? "已确认" : "待确认"}
                    />
                    <div className="research-scope-fields">
                      <fieldset className="research-scope-field">
                        <legend>出款数量 <span aria-hidden="true">*</span></legend>
                        <div className="research-scope-options">
                          {quantityOptions.map((choice) => <button type="button" className={quantityChoice === choice ? "is-selected" : ""} aria-pressed={quantityChoice === choice} disabled={Boolean(briefReply)} onClick={() => setQuantityChoice(choice)} key={choice}>{choice}</button>)}
                        </div>
                      </fieldset>
                      <div className="research-scope-divider" aria-hidden="true" />
                      <fieldset className="research-scope-field">
                        <legend>风格方向 · 支持多选 <span aria-hidden="true">*</span></legend>
                        <div className="research-scope-options">
                          {styleOptions.map((choice) => <button type="button" className={styleChoices.includes(choice) ? "is-selected" : ""} aria-pressed={styleChoices.includes(choice)} disabled={Boolean(briefReply)} onClick={() => toggleStyleChoice(choice)} key={choice}>{choice}</button>)}
                        </div>
                        <AnimatePresence initial={false}>
                          {otherStyleSelected ? (
                            <motion.div
                              className="research-scope-other"
                              initial={reduceMotion ? false : { height: 0, opacity: 0, y: -4 }}
                              animate={{ height: 97, opacity: 1, y: 0 }}
                              exit={reduceMotion ? undefined : { height: 0, opacity: 0, y: -4 }}
                              transition={{ duration: reduceMotion ? 0 : 0.26, ease: revealEase }}
                            >
                              <textarea
                                value={otherStyleDirection}
                                onChange={(event) => setOtherStyleDirection(event.target.value)}
                                readOnly={Boolean(briefReply)}
                                placeholder="请输入其他风格方向说明"
                                aria-label="其他风格方向说明"
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </fieldset>
                      <div className="research-scope-divider" aria-hidden="true" />
                      <fieldset className="research-scope-field">
                        <legend>商业定位 <span aria-hidden="true">*</span></legend>
                        <div className="research-scope-options">
                          {commercialOptions.map((choice) => <button type="button" className={commercialChoice === choice ? "is-selected" : ""} aria-pressed={commercialChoice === choice} disabled={Boolean(briefReply)} onClick={() => setCommercialChoice(choice)} key={choice}>{choice}</button>)}
                        </div>
                      </fieldset>
                      <div className="research-scope-divider" aria-hidden="true" />
                      <fieldset className="research-scope-field">
                        <legend>改款幅度 <span aria-hidden="true">*</span></legend>
                        <div className="research-scope-options">
                          {changeOptions.map((choice) => <button type="button" className={changeChoice === choice ? "is-selected" : ""} aria-pressed={changeChoice === choice} disabled={Boolean(briefReply)} onClick={() => setChangeChoice(choice)} key={choice}>{choice}</button>)}
                        </div>
                      </fieldset>
                    </div>
                    {!briefReply && <div className="research-scope-actions"><BusinessButton points={10} disabled={!briefCanSubmit} onClick={confirmBrief}>确认并继续</BusinessButton></div>}
                  </div>
              </AssistantMessage>
            )}

            {(briefReply || replyAttachments.brief?.length) && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments.brief ?? []} />{briefReply && <span>{briefReply}</span>}</UserMessage>}
            {briefAcknowledgement && <AssistantMessage><p>{briefAcknowledgement}</p></AssistantMessage>}

            {stage === "directions-loading" && (
              <AssistantMessage><LoadingTask title="正在规划设计方向" lines={["匹配需求与趋势洞察", "评估系列商业梯度", "生成可执行设计方向"]} /></AssistantMessage>
            )}

            {stageIndex >= 3 && (
              <AssistantMessage>
                <p>基于你的需求,我规划了以下4个设计方向:</p>
                <div className={`research-scope-form apparel-direction-form ${stage === "directions" ? "is-editable" : "is-readonly"}`} role="group" aria-label="选择设计方向，支持多选" data-message-meta="disabled" data-copy-exclude="true" data-node-id="563:39531">
                  <ConversationFormTitle
                    title="选择设计方向，支持多选"
                    status={stage === "directions" ? "pending" : "confirmed"}
                    statusLabel={stage === "directions" ? "待确认" : "已确认"}
                  />
                  <div className="apparel-direction-options">
                    {activeDesignDirections.map((direction) => {
                      const selected = selectedDirectionIds.includes(direction.id);
                      return (
                        <SelectionCard
                          mode="checkbox"
                          selected={selected}
                          disabled={stage !== "directions"}
                          title={`${direction.id} · ${direction.title}`}
                          description={direction.description}
                          onSelect={() => toggleDirection(direction.id)}
                          key={direction.id}
                        />
                      );
                    })}
                    <div className={`selection-card selection-card--checkbox selection-card--text apparel-direction-card apparel-direction-card--other ${selectedDirectionIds.includes("OTHER") ? "is-selected" : ""}`}>
                      <span className="apparel-direction-option__copy">
                        <strong>其他</strong>
                        <input
                          type="text"
                          value={customDirection}
                          disabled={stage !== "directions"}
                          placeholder="点击输入你想要的方向内容"
                          aria-label="其他设计方向"
                          onFocus={() => {
                            if (!selectedDirectionIds.includes("OTHER")) toggleDirection("OTHER");
                          }}
                          onChange={(event) => setCustomDirection(event.target.value)}
                        />
                      </span>
                      <button
                        type="button"
                        className="apparel-direction-option__check"
                        aria-label="选择其他设计方向"
                        aria-pressed={selectedDirectionIds.includes("OTHER")}
                        disabled={stage !== "directions"}
                        onClick={() => toggleDirection("OTHER")}
                      >
                        <SelectionControl mode="checkbox" selected={selectedDirectionIds.includes("OTHER")} />
                      </button>
                    </div>
                  </div>
                  {stage === "directions" && <div className="research-scope-actions"><SelectAllControl selected={activeDesignDirections.every((direction) => selectedDirectionIds.includes(direction.id))} className="selection-select-all--leading" onToggle={() => setSelectedDirectionIds(activeDesignDirections.every((direction) => selectedDirectionIds.includes(direction.id)) ? [] : activeDesignDirections.map((direction) => direction.id))} /><BusinessButton points={10} disabled={!selectedDirectionIds.length || (selectedDirectionIds.includes("OTHER") && !customDirection.trim())} onClick={confirmDirections}>确认并继续</BusinessButton></div>}
                </div>
              </AssistantMessage>
            )}

            {(directionReply || replyAttachments.directions?.length) && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments.directions ?? []} />{directionReply && <span>{directionReply}</span>}</UserMessage>}
            {directionAcknowledgement && <AssistantMessage><p>{directionAcknowledgement}</p></AssistantMessage>}

            {stage === "candidates-loading" && (
              <AssistantMessage><LoadingTask title="候选参考素材检索" lines={[`检索${apparelItem}与相关结构参考`, "筛选可落地工艺与材质案例", "整理候选图集"]} /></AssistantMessage>
            )}

            {stageIndex >= 5 && (
              <AssistantMessage className="conversation-candidate-grid-message">
                <p>请从候选池中选择你喜欢的参考素材</p>
                <div className={`research-scope-form media-selection-form ${stage === "candidates" ? "" : "is-readonly"}`} data-message-meta="disabled" data-copy-exclude="true" data-node-id="558:27525">
                  <ConversationFormTitle
                    title="候选池图片集 · 支持多选"
                    status={stage === "candidates" ? "pending" : "confirmed"}
                    statusLabel={stage === "candidates" ? "待确认" : candidatesSkipped ? "已跳过" : "已确认"}
                  />
                  <div className="conversation-candidate-grid" role="group" aria-label="候选池图片集，支持多选">
                    {apparelCandidateItems.map((item) => (
                      <MasonryImageSelection
                        src={assetUrl(item.src)}
                        alt={`${item.code} ${item.title}`}
                        label={`${item.code} · ${item.title}`}
                        selected={selectedCandidates.includes(item.id)}
                        disabled={stage !== "candidates"}
                        onSelect={() => toggleCandidate(item.id)}
                        onPreview={() => setPreviewCandidate(item.id)}
                        key={item.id}
                      />
                    ))}
                  </div>
                  {stage === "candidates" && <div className="research-scope-actions"><SelectAllControl selected={selectedCandidates.length === candidateIds.length} className="selection-select-all--leading" onToggle={() => setSelectedCandidates(selectedCandidates.length === candidateIds.length ? [] : [...candidateIds])} /><Button variant="secondary" size="small" onClick={skipCandidates}>跳过</Button><Button variant="primary" size="small" disabled={!selectedCandidates.length} onClick={() => submitMessage(`已选择 ${selectedCandidates.length} 张参考素材`)}>下一步</Button></div>}
                </div>
              </AssistantMessage>
            )}

            {candidatesSkipped && <UserMessage entrance><span>跳过参考素材</span></UserMessage>}
            {candidatesSkipped && stageIndex >= 7 && <AssistantMessage><p>已跳过参考素材选择。后续将仅基于已确认的款式需求、设计方向与改款边界继续生成。</p></AssistantMessage>}

            {stageIndex >= 6 && !candidatesSkipped && (
              <UserMessage entrance>
                <ConversationUserAttachments attachments={replyAttachments.candidates ?? []} />
                <span>{`已选择 ${selectedCandidates.length} 张参考素材：${selectedCandidates.join("、")}`}</span>
              </UserMessage>
            )}

            {stageIndex >= 6 && !candidatesSkipped && (
              <AssistantMessage className="conversation-analysis-confirmation">
                <p>您已选择了 {selectedCandidates.length} 张参考图像，加上最初的{apparelItem}需求，共 {selectedCandidates.length + 1} 组信息作为设计素材基底{exclusionSummary}。</p>
                <p>请确认：</p>
                <ul>
                  <li>满意当前选择 → 我将对这 {selectedCandidates.length + 1} 张图进行深度解析，进入设计执行阶段</li>
                  <li>需要补充更多图像 → 请告诉我希望补充的材质、结构或细节方向</li>
                </ul>
                <p>请回复“满意”或具体补充需求。</p>
                {stage === "candidate-confirmation" ? (
                  <ApparelQuickReply onClick={() => submitMessage("满意，请继续")}>满意，请继续</ApparelQuickReply>
                ) : null}
              </AssistantMessage>
            )}

            {(candidateReply || replyAttachments["candidate-confirmation"]?.length) && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments["candidate-confirmation"] ?? []} />{candidateReply && <span>{candidateReply}</span>}</UserMessage>}
            {candidateAcknowledgement && <AssistantMessage><p>{candidateAcknowledgement}</p></AssistantMessage>}

            {stageIndex >= 7 && (
              <AssistantMessage className="conversation-analysis">
                <p>{candidatesSkipped ? "我正在基于已确认的款式需求和设计方向建立执行语言。" : `我正在对您选择的 ${selectedCandidates.length} 张参考图像进行深度解析，提取廓形、工艺、材质、细节等设计要素...`}</p>
                <TaskDisclosure
                  title={candidatesSkipped ? "设计方向解析" : "图像深度解析"}
                  expanded={candidateAnalysisExpanded}
                  complete={stage !== "candidate-analysis"}
                  controlsId="apparel-candidate-analysis-details"
                  onToggle={() => setCandidateAnalysisExpanded((expanded) => !expanded)}
                >
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} /><span>解析廓形、比例与结构特征</span></div>
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} delay={0.06} /><span>提取工艺、材质与辅料语言</span></div>
                  <div><AnalysisStepIcon complete={stage !== "candidate-analysis"} delay={0.12} /><span>归纳可复用设计要素与改款边界</span></div>
                </TaskDisclosure>
              </AssistantMessage>
            )}

            {stageIndex >= 8 && (
              <AssistantMessage className="apparel-document">
                <h2>《{seriesTitle}》设计执行书</h2>
                <h3>第一部分：策略综述 (WHAT)</h3>
                <h4>设计方向声明</h4>
                <p>{isKnitCardigan ? `基于已确认方向，围绕${apparelItem}的轻盈针织、通勤比例与细腻肌理建立系列；严格保留“${promptExclusions.join("、") || "无额外"}”排除条件。` : "基于用户确认的经典复刻与门襟创新方向，在延续飞行员夹克投资价值的基础上，形成兼具传承价值与个性表达的男士皮外套系列。"}</p>
                <h4>起始复杂度判断</h4>
                <p>用户需求以商业实穿为导向，同时选择了解构创新元素，因此系列从中等偏经典的复杂度起步：先完成稳健改良，再逐步推演至门襟解构与结构实验。</p>
                <h4>三波段规划</h4>
                <table><thead><tr><th>波段</th><th>定位</th><th>SKU编号</th><th>商业目的</th></tr></thead><tbody>
                  <tr><td>Phase 1</td><td>经典传承款</td><td>SKU #01-03</td><td>走量主力，延续经典投资价值</td></tr>
                  <tr><td>Phase 2</td><td>门襟革新款</td><td>SKU #04-06</td><td>高利润风格设计款，平衡实穿与设计感</td></tr>
                  <tr><td>Phase 3</td><td>解构实验款</td><td>SKU #07-08</td><td>品牌形象与创意突破</td></tr>
                </tbody></table>
                <h3>第二部分：设计推演 (WHY)</h3>
                <h4>素材资源盘点</h4>
                <ul>
                  <li><strong>Image_1：</strong>{isKnitCardigan ? `${apparelItem}基础参考，提供针织组织与比例基底。` : "黑色粒面皮革飞行员夹克，作为核心廓形基底与经典细节库。"}</li>
                  <li><strong>Image_2：</strong>{isKnitCardigan ? "轻薄针织参考，提供门襟与肩线变化。" : "黑色大翻领拉链皮夹克，提供领型变体与门襟形式参考。"}</li>
                  <li><strong>Image_3：</strong>{isKnitCardigan ? "同色肌理参考，提供组织与局部细节逻辑。" : "黑白拼接棒球领皮夹克，提供材质拼接与撞色逻辑。"}</li>
                </ul>
                <h4>决策冲突与解决</h4>
                <ul>
                  <li><strong>经典传承与解构创新：</strong>采用渐进式推演。Phase 1 尊重经典基因，Phase 2 专攻门襟单点突破，Phase 3 再释放结构实验。</li>
                  <li><strong>参考图风格差异：</strong>统一以 Image_1 的{apparelItem}比例为系列 DNA，其他图片仅作为局部设计工具。</li>
                  <li><strong>投资传承与商业可行性：</strong>用 3 款走量、3 款利润、2 款形象建立产品金字塔，控制创新工艺与库存风险。</li>
                </ul>
                <h4>公式组合策略</h4>
                <table><thead><tr><th>波段</th><th>主办公式</th><th>辅助公式</th><th>选择理由</th></tr></thead><tbody>
                  <tr><td>Phase 1</td><td>细节转移法、改变形式法</td><td>部位增加法</td><td>{isKnitCardigan ? "在轻盈针织廓形内完成组织、收口与门襟升级，建立稳定系列基因。" : "在经典廓形内完成辅料、毛领与门襟升级，建立稳定系列基因。"}</td></tr>
                  <tr><td>Phase 2</td><td>逆向改款法、款式组合方法</td><td>细节延伸法</td><td>集中突破门襟结构，在实穿边界内制造高识别度与利润空间。</td></tr>
                  <tr><td>Phase 3</td><td>廓形限定法、品类转移法</td><td>组合更换法</td><td>通过比例与材质变化承担品牌形象表达，同时保留{apparelItem}核心 DNA。</td></tr>
                </tbody></table>
              </AssistantMessage>
            )}

            {stageIndex >= 8 && (
              <AssistantMessage>
                <p>以上是《{seriesTitle}》的战略规划：</p>
                <ul>
                  <li>三波段架构：经典传承款（3款）→ 门襟革新款（3款）→ 解构实验款（2款）</li>
                  <li>核心逻辑：以{apparelItem}需求为基底，渐进式融入已确认方向{exclusionSummary}</li>
                  <li>公式组合：细节转移、逆向改款、廓形限定等多公式协同</li>
                </ul>
                <p>请问这个战略方向是否认可？确认后我将制定每款 SKU 的具体执行细节。如有调整意见，请直接告诉我。</p>
                {stage === "strategy" ? (
                  <ApparelQuickReply onClick={() => submitMessage("认可，请继续")}>认可，请继续</ApparelQuickReply>
                ) : null}
              </AssistantMessage>
            )}

            {(strategyReply || replyAttachments.strategy?.length) && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments.strategy ?? []} />{strategyReply && <span>{strategyReply}</span>}</UserMessage>}
            {strategyAcknowledgement && <AssistantMessage><p>{strategyAcknowledgement}</p></AssistantMessage>}

            {stageIndex >= 9 && (
              <AssistantMessage className="apparel-document apparel-matrix">
                <h3>第三部分：执行矩阵 (HOW)</h3>
                <h4>素材编号对照</h4>
                <ul>
                  <li>Image_1：{apparelItem}核心比例与结构参考</li>
                  <li>Image_2：领型、门襟与局部结构参考</li>
                  <li>Image_3：材质、肌理与细节参考</li>
                </ul>
                <p>以下 8 个 SKU 均明确素材调用、设计公式、操作细节与预期效果。</p>
                {activeSkuPlan.map((sku, index) => (
                  <section className="apparel-sku" key={sku[0]}>
                    {index === 0 && <h4>【Phase 1：{phaseTitles[0]}】SKU #01-03</h4>}
                    {index === 3 && <h4>【Phase 2：{phaseTitles[1]}】SKU #04-06</h4>}
                    {index === 6 && <h4>【Phase 3：{phaseTitles[2]}】SKU #07-08</h4>}
                    <strong>SKU #{sku[0]}：{sku[1]}</strong>
                    <table><tbody>
                      <tr><th>素材调用</th><td>{sku[2]}</td></tr>
                      <tr><th>公式名称</th><td>{sku[3]}</td></tr>
                      <tr><th>操作细节</th><td>{sku[4]}</td></tr>
                      <tr><th>预期效果</th><td>保持系列统一基因，同时形成清晰的款式差异与商业梯度。</td></tr>
                    </tbody></table>
                  </section>
                ))}
              </AssistantMessage>
            )}

            {stageIndex >= 9 && (
              <AssistantMessage>
                <p>确认无误后，请回复“开始生图”，我将立即按执行矩阵输出 8 款设计。</p>
                {stage === "matrix" ? (
                  <ApparelQuickReply onClick={() => submitMessage("开始生图")}>开始生图</ApparelQuickReply>
                ) : null}
              </AssistantMessage>
            )}

            {(matrixReply || replyAttachments.matrix?.length) && <UserMessage entrance><ConversationUserAttachments attachments={replyAttachments.matrix ?? []} />{matrixReply && <span>{matrixReply}</span>}</UserMessage>}
            {matrixAcknowledgement && <AssistantMessage><p>{matrixAcknowledgement}</p></AssistantMessage>}

            {stage === "generating" && (
              <AssistantMessage className="apparel-generation-message">
                <p>立即为你生成图片</p>
                {[0, 1].filter((batch) => batch <= batchProgress).map((batch) => {
                  const complete = batch < batchProgress;
                  const start = batch * 4 + 1;
                  const end = Math.min(start + 3, 8);
                  return (
                    <ConversationGeneratedImageBatch
                      title={`我正在为系列的第 ${batch + 1} 批生成图像（SKU #${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}）`}
                      images={Array.from({ length: end - start + 1 }, (_, itemIndex) => ({
                        src: activeReferenceImage,
                        alt: `生成款式 SKU ${start + itemIndex}`,
                      }))}
                      complete={complete}
                      key={batch}
                    />
                  );
                })}
              </AssistantMessage>
            )}

            {stage === "results" && (
              <>
                <AssistantMessage className="apparel-document apparel-result-review">
                  <h2>{seriesTitle}——设计成果展示</h2>
                  <p>全部 8 款{apparelItem}设计已生成完毕。以下按三个设计波段回溯每款的设计逻辑：</p>
                  {activeSkuPlan.map((sku, index) => (
                    <section className="apparel-result-logic" key={sku[0]}>
                      {index === 0 && <h3>Phase 1：{phaseTitles[0]}</h3>}
                      {index === 3 && <h3>Phase 2：{phaseTitles[1]}</h3>}
                      {index === 6 && <h3>Phase 3：{phaseTitles[2]}</h3>}
                      <h4>SKU #{sku[0]}：{sku[1]}</h4>
                      <p><strong>设计逻辑回溯：</strong>{sku[3]}。{sku[4]}</p>
                    </section>
                  ))}
                </AssistantMessage>

                <AssistantMessage className="apparel-results">
                  <p>系列总结：本系列围绕{apparelItem}需求与已确认方向逐步展开。8 款设计覆盖商业基础、风格升级和形象表达三个层次，并保留所有排除条件。</p>
                  <div className="customer-ai-result-grid customer-ai-result-grid--all">
                    {apparelResultItems.map((item) => (
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

                <AssistantMessage>
                  <ConversationTaskCompletion />
                </AssistantMessage>
              </>
            )}
            {resultFollowUps.map((message, index) => (
              <ConversationFollowUpExchange {...message} key={`${message.request}-${index}`} />
            ))}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>

        {!readOnly ? <>
        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer
          className="apparel-composer"
          attachmentMode="image-only"
          ariaLabel="继续款式设计对话"
          value={followUp}
          onChange={setFollowUp}
          onSubmit={(submittedAttachments) => submitMessage(undefined, submittedAttachments)}
          placeholder={composerPlaceholder[stage]}
          hint={stage === "directions" ? "请先从上方表单完成设计方向选择" : stage === "candidates" ? "请先从上方选择参考素材，或选择跳过" : undefined}
          disabled={!composerEnabled || stage === "directions" || stage === "candidates"}
          isRunning={taskRunning}
          onStop={pauseCurrentStep}
        />
        </> : null}
      </section>

      {previewCandidate ? (
        <ImageGalleryLightbox
          categories={apparelCandidateCategories}
          items={apparelCandidateItems}
          activeCategoryId={apparelCandidateCategories[0].id}
          activeItemId={previewCandidate}
          selectedIds={selectedCandidates}
          selectionDisabled={stage !== "candidates"}
          hideSourceAction
          onCategoryChange={() => setPreviewCandidate(apparelCandidateItems[0].id)}
          onNavigate={setPreviewCandidate}
          onToggleSelection={toggleCandidate}
          onClose={() => setPreviewCandidate(null)}
        />
      ) : null}
      {previewResult ? (
        <ImageGalleryLightbox
          title="生成款式"
          categories={apparelResultCategories}
          items={apparelResultItems}
          activeCategoryId={apparelResultCategories[0].id}
          activeItemId={previewResult}
          selectedIds={[]}
          selectionDisabled
          hideSelection
          copyMode="title-only"
          resultActions={{
            onDownload: (item) => downloadResult(item.id, item.title),
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
