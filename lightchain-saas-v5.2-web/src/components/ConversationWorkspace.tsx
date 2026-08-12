import { useEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { Button, QuickReplyButton } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { CandidateImageLightbox, MasonryImageSelection } from "./ImageSelection";
import { TaskConversationComposer } from "./TaskConversationComposer";
import { ResearchScopeForm } from "./ResearchScopeForm";
import { AnalysisStepIcon, ConversationFileCard, ConversationFormTitle, ConversationStatusIcon as StatusIcon, ConversationUserMessage, TaskDisclosure } from "./ConversationPrimitives";
import { candidateCategories, candidatePageCount, candidateReferenceImages, formatCandidateSelection, formatTrendDirectionSelection, getCandidateCategoryLabel, getCandidateReference, getReferencePackageData, trendDirections, trendReportDetails, type CandidateCategoryId } from "../data/referenceCatalog";
import { buildFashionProposalHtml } from "../report/fashionProposalHtml";
import { useI18n } from "../i18n";
import { getLocaleDefaultMarket, getResearchPlatformOptions, getResearchScopeDefaults, researchMarkets, type ResearchMarket } from "../data/researchScope";

type AnalysisPhase = "parsing" | "complete";
type TrendDownloadFormat = "HTML" | "PPT" | "PDF";
type TrendPreviewKind = "research" | "package";
type MessageMetaPosition = { left: number; top: number; side: "assistant" | "user" };

function getMessageMetaPosition(completedBlock: HTMLElement): MessageMetaPosition {
  const isUserMessage = completedBlock.classList.contains("conversation-message--user");
  const anchor = isUserMessage
    ? completedBlock.querySelector<HTMLElement>(".conversation-user-bubble") ?? completedBlock
    : completedBlock;
  const rect = anchor.getBoundingClientRect();
  return {
    left: isUserMessage ? rect.right - 8 : rect.left + 8,
    top: rect.bottom + 28 < window.innerHeight ? rect.bottom : rect.top - 28,
    side: isUserMessage ? "user" : "assistant",
  };
}

const evidenceIds = ["EV-PROP-FILE-001", "EV-PROP-ECOM-001", "EV-PROP-SOC-001", "EV-PROP-TRD-001"];

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
const quickActionReveal = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: revealEase } },
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

function buildCustomerDirectionPackageHtml(selectedDirectionIds: string[], selectedCandidateIds: string[]) {
  const { selectedReferences, selectedDirections, directionLabel, categoryCount } = getReferencePackageData(selectedDirectionIds, selectedCandidateIds);
  return buildFashionProposalHtml({
    kind: "package",
    directions: selectedDirections.map((direction) => ({
      ...direction,
      ...trendReportDetails[direction.id],
      imageUrl: new URL(assetUrl(trendReportDetails[direction.id].image), window.location.href).href,
    })),
    references: selectedReferences.map((reference) => ({
      code: reference.code,
      title: reference.title,
      category: getCandidateCategoryLabel(reference.categoryId),
      imageUrl: new URL(assetUrl(reference.src), window.location.href).href,
    })),
    categoryCount,
    directionLabel,
  });
}

function buildTrendReportHtml(kind: TrendPreviewKind, selectedDirectionIds: string[] = [], selectedCandidateIds: string[] = []) {
  if (kind === "package") return buildCustomerDirectionPackageHtml(selectedDirectionIds, selectedCandidateIds);
  return buildFashionProposalHtml({
    kind: "research",
    directions: trendDirections.map((direction) => ({
      ...direction,
      ...trendReportDetails[direction.id],
      imageUrl: new URL(assetUrl(trendReportDetails[direction.id].image), window.location.href).href,
    })),
    references: [],
    categoryCount: 0,
    directionLabel: "轻量松弛通勤、复古学院混搭，并保留柔性结构与都市轻机能作为验证方向",
  });
}

function downloadTrendAnalysis(format: TrendDownloadFormat) {
  if (format === "HTML") {
    const url = URL.createObjectURL(new Blob([buildTrendReportHtml("research")], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "客户需求调研与视觉方向.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }
  const reportText = [
    "趋势方向分析",
    "",
    "主市场：日本",
    "电商平台：Rakuten Fashion、其他",
    "社媒平台：Instagram、TikTok",
    "方向数量：4",
  ].join("\n");
  const extension = format.toLowerCase();
  const mimeType = format === "PPT" ? "application/vnd.ms-powerpoint" : "application/pdf";
  const content = reportText;
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `趋势方向分析.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadTrendWorkbook() {
  const rows = [
    ["方向编号", "视觉方向", "方向说明", "建议"],
    ...trendDirections.map((direction) => [direction.id, direction.title, direction.description, direction.recommendation]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "视觉方向参考素材.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadCustomerDirectionPackage(selectedCandidateIds: string[], selectedDirectionIds: string[]) {
  const content = buildTrendReportHtml("package", selectedDirectionIds, selectedCandidateIds);
  const url = URL.createObjectURL(new Blob([content], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "客户方向参考包.html";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function TrendDirectionSelectionForm({
  selectedIds,
  confirmed,
  onToggle,
  onConfirm,
}: {
  selectedIds: string[];
  confirmed: boolean;
  onToggle: (directionId: string) => void;
  onConfirm: () => void;
}) {
  return (
    <section className={`trend-direction-form ${confirmed ? "is-confirmed" : ""}`} aria-label="选择客户提案采用的视觉方向" data-node-id="567:65705">
      <ConversationFormTitle
        title="选择客户提案采用的视觉方向"
        helper="支持多选 · 每个方向均关联市场证据和客户需求匹配点"
      />
      <div className="trend-direction-form__grid" role="group" aria-label="视觉方向，支持多选">
        {trendDirections.map((direction) => {
          const selected = selectedIds.includes(direction.id);
          return (
            <button
              type="button"
              className={`visual-direction-choice-card trend-direction-option ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              disabled={confirmed}
              onClick={() => onToggle(direction.id)}
              key={direction.id}
            >
              <img src={assetUrl("assets/figma-confirmed/trend-direction-thumbnail.png")} alt="" />
              <span className="trend-direction-option__copy">
                <strong>{direction.id}·{direction.title}</strong>
                <span>{direction.description}</span>
                <small>{direction.recommendation}</small>
              </span>
              <span className="trend-direction-option__check" aria-hidden="true">
                {selected ? <FigmaIcon name="check" size={12} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {!confirmed ? (
        <div className="trend-direction-form__actions">
          <Button variant="primary" size="small" disabled={!selectedIds.length} onClick={onConfirm}>确认并继续</Button>
        </div>
      ) : null}
    </section>
  );
}

export function ConversationWorkspace({ prompt, profileName }: { prompt: string; profileName?: string }) {
  const { locale } = useI18n();
  const profileScopeDefaults = getResearchScopeDefaults(profileName, locale);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("parsing");
  const [profileVisible, setProfileVisible] = useState(false);
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [scopeFormVisible, setScopeFormVisible] = useState(false);
  const [scopeEntryMessage, setScopeEntryMessage] = useState("继续");
  const [seasonSkipped, setSeasonSkipped] = useState(false);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [scopeResultStage, setScopeResultStage] = useState(0);
  const [trendScanExpanded, setTrendScanExpanded] = useState(true);
  const [trendPreviewOpen, setTrendPreviewOpen] = useState(false);
  const [trendPreviewKind, setTrendPreviewKind] = useState<TrendPreviewKind>("research");
  const [selectedTrendIds, setSelectedTrendIds] = useState<string[]>([]);
  const [trendDirectionsConfirmed, setTrendDirectionsConfirmed] = useState(false);
  const [candidateSearchExpanded, setCandidateSearchExpanded] = useState(true);
  const [candidateSearchStage, setCandidateSearchStage] = useState(0);
  const [candidateSearchRun, setCandidateSearchRun] = useState(0);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSelectionConfirmed, setCandidateSelectionConfirmed] = useState(false);
  const [customerFeedbackSkipped, setCustomerFeedbackSkipped] = useState(false);
  const [candidatePreviewId, setCandidatePreviewId] = useState<string | null>(null);
  const [activeCandidateCategory, setActiveCandidateCategory] = useState<CandidateCategoryId>(candidateCategories[0].id);
  const [candidatePages, setCandidatePages] = useState<Record<CandidateCategoryId, number>>({
    "restrained-ruffle": 1,
    "heritage-botanical": 1,
    "soft-tailoring": 1,
    "transitional-dress": 1,
  });
  const [selectedResearchMarkets, setSelectedResearchMarkets] = useState<ResearchMarket[]>(profileScopeDefaults.markets);
  const [selectedCommerce, setSelectedCommerce] = useState<string[]>(profileScopeDefaults.commerce);
  const [selectedSocial, setSelectedSocial] = useState<string[]>(profileScopeDefaults.social);
  const [otherCommerce, setOtherCommerce] = useState("");
  const scopeTouchedRef = useRef(false);
  const scopePhaseRef = useRef<HTMLDivElement>(null);
  const confirmedResultsRef = useRef<HTMLDivElement>(null);
  const candidatePoolRef = useRef<HTMLDivElement>(null);
  const hoveredMessageRef = useRef<HTMLElement | null>(null);
  const messageMetaHideTimerRef = useRef<number | null>(null);
  const [messageMetaPosition, setMessageMetaPosition] = useState<MessageMetaPosition | null>(null);
  const reduceMotion = useReducedMotion();
  const analysisComplete = analysisPhase === "complete";
  const trendScanComplete = scopeResultStage >= 3;
  const candidateSearchComplete = candidateSearchStage >= 4;

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
    if (profileName || scopeConfirmed || scopeTouchedRef.current) return;
    setSelectedResearchMarkets([getLocaleDefaultMarket(locale)]);
    setSelectedCommerce([]);
    setSelectedSocial([]);
    setOtherCommerce("");
  }, [locale, profileName, scopeConfirmed]);

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

  useEffect(() => {
    if (!scopeConfirmed) return;
    setScopeResultStage(0);
    const timings = reduceMotion
      ? [0, 120, 1600, 1760, 1920]
      : [240, 820, 3400, 4080, 4720];
    const timers = timings.map((delay, index) => window.setTimeout(() => setScopeResultStage(index + 1), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduceMotion, scopeConfirmed]);

  useEffect(() => {
    const reposition = () => {
      const completedBlock = hoveredMessageRef.current;
      if (!completedBlock) return;
      setMessageMetaPosition(getMessageMetaPosition(completedBlock));
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, []);

  useEffect(() => () => {
    if (messageMetaHideTimerRef.current !== null) window.clearTimeout(messageMetaHideTimerRef.current);
  }, []);

  useEffect(() => {
    if (!trendDirectionsConfirmed || !candidateSearchRun) return;
    setCandidateSearchStage(0);
    const timings = reduceMotion
      ? [0, 80, 160, 320, 400]
      : [280, 880, 1480, 3720, 4240];
    const timers = timings.map((delay, index) => window.setTimeout(
      () => setCandidateSearchStage(index + 1),
      delay,
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [candidateSearchRun, reduceMotion, trendDirectionsConfirmed]);

  useEffect(() => {
    if (!candidateSearchStage) return;
    const frame = window.requestAnimationFrame(() => {
      candidatePoolRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: candidateSearchStage >= 5 ? "end" : "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [candidateSearchStage, reduceMotion]);

  useEffect(() => {
    if (!candidateSelectionConfirmed) return;
    const frame = window.requestAnimationFrame(() => {
      candidatePoolRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [candidateSelectionConfirmed, reduceMotion]);

  useEffect(() => {
    if (!customerFeedbackSkipped) return;
    const frame = window.requestAnimationFrame(() => {
      candidatePoolRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerFeedbackSkipped, reduceMotion]);

  const submitFollowUp = () => {
    const message = followUp.trim();
    if (!message) return;
    if (analysisComplete && message === "继续") {
      setScopeEntryMessage("继续");
      setScopeFormVisible(true);
    }
    if (analysisComplete && message === "跳过") setSeasonSkipped(true);
    setFollowUp("");
  };

  const useSeasonQuickReply = (message: "继续" | "跳过" | "没有补充，继续") => {
    if (message === "继续" || message === "没有补充，继续") {
      setScopeEntryMessage(message);
      setScopeFormVisible(true);
      return;
    }
    setSeasonSkipped(true);
  };

  const toggleResearchMarket = (market: ResearchMarket) => {
    scopeTouchedRef.current = true;
    const nextMarkets = selectedResearchMarkets.includes(market)
      ? selectedResearchMarkets.filter((item) => item !== market)
      : [...selectedResearchMarkets, market];
    const nextPlatformOptions = getResearchPlatformOptions(nextMarkets);
    setSelectedResearchMarkets(nextMarkets);
    setSelectedCommerce((current) => current.filter((platform) => nextPlatformOptions.commerce.includes(platform)));
    setSelectedSocial((current) => current.filter((platform) => nextPlatformOptions.social.includes(platform)));
  };

  const toggleSelection = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    scopeTouchedRef.current = true;
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const updateOtherCommerce = (value: string) => {
    scopeTouchedRef.current = true;
    setOtherCommerce(value);
  };

  const confirmResearchScope = () => {
    if (!selectedResearchMarkets.length || !selectedCommerce.length || !selectedSocial.length) return;
    setScopeResultStage(0);
    setScopeConfirmed(true);
  };

  const showMessageMeta = (event: ReactPointerEvent<HTMLDivElement>) => {
    const eventTarget = event.target as HTMLElement;
    const completedBlock = eventTarget.closest<HTMLElement>('[data-message-actions="true"]')
      ?? eventTarget.closest<HTMLElement>(".conversation-message--user");
    if (!completedBlock) {
      if (hoveredMessageRef.current) scheduleMessageMetaHide();
      return;
    }
    if (messageMetaHideTimerRef.current !== null) {
      window.clearTimeout(messageMetaHideTimerRef.current);
      messageMetaHideTimerRef.current = null;
    }
    if (hoveredMessageRef.current === completedBlock && messageMetaPosition) return;
    hoveredMessageRef.current = completedBlock;
    setMessageMetaPosition(getMessageMetaPosition(completedBlock));
  };

  const scheduleMessageMetaHide = () => {
    if (messageMetaHideTimerRef.current !== null) return;
    messageMetaHideTimerRef.current = window.setTimeout(() => {
      messageMetaHideTimerRef.current = null;
      hoveredMessageRef.current = null;
      setMessageMetaPosition(null);
    }, 220);
  };

  const keepMessageMetaOpen = () => {
    if (messageMetaHideTimerRef.current !== null) {
      window.clearTimeout(messageMetaHideTimerRef.current);
      messageMetaHideTimerRef.current = null;
    }
  };

  const copyHoveredMessage = () => {
    const text = hoveredMessageRef.current?.innerText.trim();
    if (text) void navigator.clipboard?.writeText(text);
  };

  const toggleTrendDirection = (directionId: string) => {
    if (trendDirectionsConfirmed) return;
    setSelectedTrendIds((current) => current.includes(directionId)
      ? current.filter((id) => id !== directionId)
      : [...current, directionId]);
  };

  const confirmTrendDirections = () => {
    if (!selectedTrendIds.length || trendDirectionsConfirmed) return;
    setCandidateSearchStage(0);
    setCandidateSearchExpanded(true);
    setCandidateSearchRun((run) => run + 1);
    setTrendDirectionsConfirmed(true);
    setTrendPreviewOpen(false);
  };

  const toggleCandidateReference = (candidateId: string) => {
    if (candidateSelectionConfirmed) return;
    setSelectedCandidateIds((current) => current.includes(candidateId)
      ? current.filter((id) => id !== candidateId)
      : [...current, candidateId]);
  };

  const navigateCandidatePreview = (candidateId: string) => {
    const candidate = getCandidateReference(candidateId);
    if (!candidate) return;
    setCandidatePreviewId(candidate.id);
    setActiveCandidateCategory(candidate.categoryId);
    setCandidatePages((current) => ({ ...current, [candidate.categoryId]: candidate.page }));
  };

  const changeCandidatePreviewCategory = (categoryId: string) => {
    const typedCategoryId = categoryId as CandidateCategoryId;
    const page = candidatePages[typedCategoryId];
    const firstCandidate = candidateReferenceImages.find((item) => item.categoryId === typedCategoryId && item.page === page)
      ?? candidateReferenceImages.find((item) => item.categoryId === typedCategoryId);
    if (!firstCandidate) return;
    setActiveCandidateCategory(typedCategoryId);
    setCandidatePreviewId(firstCandidate.id);
  };

  const openTrendPreview = (kind: TrendPreviewKind) => {
    setTrendPreviewKind(kind);
    setTrendPreviewOpen(true);
  };

  const confirmedCommerce = [...selectedCommerce, ...(otherCommerce.trim() ? [otherCommerce.trim()] : [])].map((platform) => {
    if (platform === "RakutenFashion") return "Rakuten Fashion";
    return platform;
  }).join("、");
  const confirmedMarkets = selectedResearchMarkets.join("、");
  const confirmedSocial = selectedSocial.join("、");
  const researchPlatformOptions = getResearchPlatformOptions(selectedResearchMarkets);
  const scopeCanSubmit = selectedResearchMarkets.length > 0 && selectedCommerce.length > 0 && selectedSocial.length > 0;
  const activeCandidatePage = candidatePages[activeCandidateCategory];
  const visibleCandidateImages = candidateReferenceImages.filter((candidate) =>
    candidate.categoryId === activeCandidateCategory && candidate.page === activeCandidatePage,
  );
  const conversationPlaceholder = !analysisComplete
    ? "Agent 正在解析需求，请稍候..."
    : !scopeFormVisible
      ? "补充季节，或回复“跳过”；输入“继续”进入调研范围..."
      : !scopeConfirmed
        ? "请完成上方调研范围表单，或输入需要补充的条件..."
      : !trendScanComplete
        ? "Agent 正在扫描趋势方向，请稍候..."
        : !trendDirectionsConfirmed
          ? "请在上方选择视觉方向，或输入需要调整的方向..."
          : !candidateSearchComplete
            ? "Agent 正在检索候选参考素材，请稍候..."
            : !candidateSelectionConfirmed
              ? "请在上方选择参考素材，或输入补充筛选要求..."
              : "继续补充条件或提出修改意见...";

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
          <div className="conversation-feed" data-node-id="476:103924" onPointerOver={showMessageMeta} onPointerLeave={scheduleMessageMetaHide}>
            <ConversationUserMessage
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.04, ease: revealEase }}
              data-node-id="476:103925"
            >
              {prompt}
            </ConversationUserMessage>

            <AnimatePresence initial={false}>
              {profileVisible ? (
                <motion.article
                  className="conversation-message conversation-message--assistant conversation-profile-read"
                  data-message-actions="true"
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
                        <AnalysisStepIcon complete />
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
                    data-message-actions="true"
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
                    {!scopeFormVisible && !seasonSkipped ? (
                      <motion.div
                        className="conversation-quick-actions"
                        aria-label="季节确认快捷操作"
                        data-node-id="476:105358"
                        initial={reduceMotion ? false : "hidden"}
                        animate="visible"
                        variants={{ visible: { transition: { delayChildren: reduceMotion ? 0 : 2.84, staggerChildren: reduceMotion ? 0 : 0.12 } } }}
                      >
                        <motion.span className="conversation-quick-action" variants={quickActionReveal}>
                          <Button variant="outline" size="small" onClick={() => useSeasonQuickReply("跳过")}>
                            <FigmaIcon name="arrow-left" size={20} />
                            跳过
                          </Button>
                        </motion.span>
                        <motion.span className="conversation-quick-action" variants={quickActionReveal}>
                          <QuickReplyButton onClick={() => useSeasonQuickReply("没有补充，继续")}>没有补充，继续</QuickReplyButton>
                        </motion.span>
                      </motion.div>
                    ) : null}
                  </motion.article>
                  {seasonSkipped ? (
                    <>
                      <ConversationUserMessage
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                      >
                        跳过
                      </ConversationUserMessage>
                      <motion.article
                        className="conversation-message conversation-message--assistant"
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.08, ease: revealEase }}
                      >
                        <p>已保留季节未指定状态。可以继续进入调研范围。</p>
                        {!scopeFormVisible ? (
                          <div className="conversation-quick-actions">
                            <QuickReplyButton onClick={() => useSeasonQuickReply("继续")}>继续</QuickReplyButton>
                          </div>
                        ) : null}
                      </motion.article>
                    </>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {scopeFormVisible ? (
                <motion.div
                  ref={scopePhaseRef}
                  className="conversation-scope-phase"
                  initial={false}
                  data-node-id="484:106053"
                >
                  <ConversationUserMessage data-node-id="484:106206">{scopeEntryMessage}</ConversationUserMessage>

                  <motion.article className="conversation-message conversation-message--assistant conversation-scope-copy" data-node-id="484:106216">
                    <p>需求理解已确认。接下来确认本次调研覆盖的市场、电商平台和社媒平台。系统已根据业务偏好档案预填常用范围，你可以直接确认，也可以继续增删。</p>
                  </motion.article>

                  <motion.article className="conversation-message conversation-message--assistant conversation-scope-message" data-node-id="484:106226">
                    <p>请选择主要市场、电商平台和社交媒体。</p>
                    <ResearchScopeForm
                      confirmed={scopeConfirmed}
                      profileLinked={Boolean(profileName)}
                      markets={researchMarkets}
                      selectedMarkets={selectedResearchMarkets}
                      commerceOptions={researchPlatformOptions.commerce}
                      selectedCommerce={selectedCommerce}
                      socialOptions={researchPlatformOptions.social}
                      selectedSocial={selectedSocial}
                      otherCommerce={otherCommerce}
                      canSubmit={scopeCanSubmit}
                      onToggleMarket={(market) => toggleResearchMarket(market as ResearchMarket)}
                      onToggleCommerce={(platform) => toggleSelection(platform, setSelectedCommerce)}
                      onToggleSocial={(platform) => toggleSelection(platform, setSelectedSocial)}
                      onOtherCommerceChange={updateOtherCommerce}
                      onConfirm={confirmResearchScope}
                    />
                  </motion.article>

                  {scopeConfirmed ? (
                    <ConversationUserMessage
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      地区：{confirmedMarkets}；电商：{confirmedCommerce}；社媒：{confirmedSocial}
                    </ConversationUserMessage>
                  ) : null}

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
                        {scopeResultStage >= 1 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-confirmed-copy"
                          data-message-actions="true"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                          data-node-id="488:112592"
                        >
                          <p>调研摘要：目标人群 25-34岁；品类 女装；核心视觉词 待验证；排除项 待补充。趋势资料、社媒信号和电商供给/竞争信息将分别呈现，不把单一来源写成确定趋势或销量机会。</p>
                        </motion.article> : null}

                        {scopeResultStage >= 2 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-scan-message"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                          data-node-id="488:112602"
                        >
                          <p data-message-actions={trendScanComplete ? "true" : undefined}>范围已确认。我会先做小样本趋势方向扫描，分别整理趋势资料、电商供给/竞争与社媒信号，不直接进入候选池。</p>
                          <TaskDisclosure
                            title="趋势方向扫描"
                            expanded={trendScanExpanded}
                            complete={trendScanComplete}
                            controlsId="trend-scan-details"
                            onToggle={() => setTrendScanExpanded((expanded) => !expanded)}
                          >
                            <div><AnalysisStepIcon complete={trendScanComplete} delay={0.02} /><span>整理趋势资料库中的可授权方向与章节依据</span></div>
                            <div><AnalysisStepIcon complete={trendScanComplete} delay={0.1} /><span>采集电商、社媒、品牌/独立站公开信号</span></div>
                            <div><AnalysisStepIcon complete={trendScanComplete} delay={0.18} /><span>按时间范围、样本量、证据充分度和数据缺口整理 3-5 个方向</span></div>
                          </TaskDisclosure>
                        </motion.article> : null}

                        {scopeResultStage >= 3 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-trend-result"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.36, ease: revealEase }}
                          data-node-id="567:65705"
                        >
                          <p data-message-actions="true">调研已完成。当前证据更支持“轻量松弛通勤”和“复古学院混搭”作为核心方向；柔性结构与都市轻机能适合小规模验证。判断分别核对了电商供给、社媒内容、品牌采用和趋势资料。社媒互动不等于销量，不同电商平台的数值未合并。</p>
                        </motion.article> : null}

                        {scopeResultStage >= 4 ? <motion.article
                          className="conversation-message conversation-message--assistant trend-file-list"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                          data-node-id="488:112710"
                        >
                          <ConversationFileCard
                            icon="html"
                            name="客户需求调研与视觉方向.html"
                            description="刚刚 · 4个待确认方向 · 分来源展示样本、时间、充分度与缺口"
                          >
                            <button type="button" onClick={() => openTrendPreview("research")}>在线查看</button>
                            <button type="button" onClick={() => downloadTrendAnalysis("HTML")}>下载</button>
                          </ConversationFileCard>
                          <ConversationFileCard
                            icon="excel"
                            name="视觉方向参考素材.xlsx"
                            description="一个工作簿 · 每个视觉方向一个 Sheet · 包含来源与缺失字段说明"
                          >
                            <button type="button" onClick={downloadTrendWorkbook}>下载</button>
                          </ConversationFileCard>
                        </motion.article> : null}

                        {scopeResultStage >= 5 ? <motion.article
                          className="conversation-evidence-message"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                          data-node-id="524:7528"
                        >
                          <div className="conversation-message conversation-message--assistant conversation-evidence-body" data-message-actions="true">
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
                        </motion.article> : null}

                        {scopeResultStage >= 5 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-handoff-copy"
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.12, ease: revealEase }}
                          data-node-id="488:112714"
                        >
                          <p>{trendDirectionsConfirmed ? "已确认以下趋势方向，选择记录保留如下。" : "趋势方向分析及辅助材料已生成。请在下方选择认可方向；确认前不会进入定向候选检索。"}</p>
                        </motion.article> : null}

                        {scopeResultStage >= 5 ? (
                          <motion.article
                            className="conversation-message conversation-message--assistant conversation-trend-result conversation-trend-selection-step"
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.2, ease: revealEase }}
                            data-node-id="567:65705"
                          >
                            <TrendDirectionSelectionForm
                              selectedIds={selectedTrendIds}
                              confirmed={trendDirectionsConfirmed}
                              onToggle={toggleTrendDirection}
                              onConfirm={confirmTrendDirections}
                            />
                          </motion.article>
                        ) : null}

                        {scopeResultStage >= 5 && trendDirectionsConfirmed ? (
                          <ConversationUserMessage variants={conversationBlockReveal}>{formatTrendDirectionSelection(selectedTrendIds)}</ConversationUserMessage>
                        ) : null}

                        {scopeResultStage >= 5 && trendDirectionsConfirmed ? (
                          <motion.div
                            ref={candidatePoolRef}
                            className="conversation-candidate-pool"
                            initial={reduceMotion ? false : "hidden"}
                            animate="visible"
                            variants={conversationBlockReveal}
                            transition={{ duration: reduceMotion ? 0 : 0.38, ease: revealEase }}
                            key="candidate-pool"
                            data-node-id="552:17371"
                          >
                              <AnimatePresence initial={false}>
                                {candidateSearchStage >= 1 ? (
                                  <motion.article
                                    className="conversation-message conversation-message--assistant conversation-candidate-copy"
                                    data-message-actions={candidateSearchComplete ? "true" : undefined}
                                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                                  >
                                    <p>已确认趋势方向：{formatTrendDirectionSelection(selectedTrendIds)}。</p>
                                    <AnimatePresence initial={false}>
                                      {candidateSearchStage >= 2 ? (
                                        <motion.p
                                          key="candidate-search-intro"
                                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                        >
                                          现在根据已确认方向、{confirmedMarkets}、女装和参考图特征，生成定向视觉参考检索条件。
                                        </motion.p>
                                      ) : null}
                                      {candidateSearchStage >= 4 ? (
                                        <motion.p
                                          key="candidate-search-complete"
                                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                        >
                                          定向视觉参考条件已准备完成，候选池将只保留符合已确认方向与需求硬约束的素材。
                                        </motion.p>
                                      ) : null}
                                    </AnimatePresence>
                                  </motion.article>
                                ) : null}
                              </AnimatePresence>
                              <AnimatePresence initial={false}>
                                {candidateSearchStage >= 3 ? (
                                  <motion.article
                                    className="conversation-message conversation-message--assistant conversation-candidate-scan"
                                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                                  >
                                    <TaskDisclosure
                                      title="定向视觉参考检索"
                                      expanded={candidateSearchExpanded}
                                      complete={candidateSearchComplete}
                                      controlsId="candidate-reference-scan-details"
                                      onToggle={() => setCandidateSearchExpanded((expanded) => !expanded)}
                                    >
                                      <div><AnalysisStepIcon complete={candidateSearchComplete} delay={0.02} /><span>组合趋势方向、市场、人群、品类与参考图特征</span></div>
                                      <div><AnalysisStepIcon complete={candidateSearchComplete} delay={0.1} /><span>获取电商商品图、社媒帖子截图、品牌官网/独立站款式图</span></div>
                                      <div><AnalysisStepIcon complete={candidateSearchComplete} delay={0.18} /><span>去重并保留来源页链接、采集时间和授权状态</span></div>
                                    </TaskDisclosure>
                                  </motion.article>
                                ) : null}
                              </AnimatePresence>
                              <AnimatePresence initial={false}>
                                {candidateSearchStage >= 5 ? (
                                  <motion.article
                                    className="conversation-message conversation-message--assistant conversation-candidate-grid-message"
                                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                                  >
                                    <p>从已取得素材中选择客户参考图</p>
                                    <div className={`conversation-candidate-form ${candidateSelectionConfirmed ? "is-readonly" : ""}`} data-node-id="552:17645">
                                      <ConversationFormTitle title="选择参考图 · 支持多选" />
                                      <div className="conversation-candidate-tabs" role="tablist" aria-label="参考图类型">
                                        {candidateCategories.map((category) => (
                                          <button
                                            type="button"
                                            role="tab"
                                            className={activeCandidateCategory === category.id ? "is-selected" : ""}
                                            aria-selected={activeCandidateCategory === category.id}
                                            onClick={() => setActiveCandidateCategory(category.id)}
                                            key={category.id}
                                          >
                                            {category.label}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="conversation-candidate-grid" role="tabpanel" aria-label="候选参考素材">
                                        {visibleCandidateImages.map((candidate) => {
                                          const selected = selectedCandidateIds.includes(candidate.id);
                                          return (
                                            <MasonryImageSelection
                                              src={assetUrl(candidate.src)}
                                              alt={`${candidate.code} ${candidate.title}`}
                                              label={`${candidate.code} · ${candidate.title}`}
                                              selected={selected}
                                              disabled={candidateSelectionConfirmed}
                                              onSelect={() => toggleCandidateReference(candidate.id)}
                                              onPreview={() => setCandidatePreviewId(candidate.id)}
                                              key={candidate.id}
                                            />
                                          );
                                        })}
                                      </div>
                                      <div className="conversation-candidate-form__actions">
                                        <div className="conversation-candidate-pagination" aria-label="候选参考素材分页">
                                          <button
                                            type="button"
                                            aria-label="上一页"
                                            disabled={activeCandidatePage === 1}
                                            onClick={() => setCandidatePages((current) => ({ ...current, [activeCandidateCategory]: current[activeCandidateCategory] - 1 }))}
                                          >
                                            <FigmaIcon name="chevron-left" size={20} />
                                          </button>
                                          <span>{activeCandidatePage} / {candidatePageCount}</span>
                                          <button
                                            type="button"
                                            aria-label="下一页"
                                            disabled={activeCandidatePage === candidatePageCount}
                                            onClick={() => setCandidatePages((current) => ({ ...current, [activeCandidateCategory]: current[activeCandidateCategory] + 1 }))}
                                          >
                                            <FigmaIcon name="chevron-right" size={20} />
                                          </button>
                                        </div>
                                        {!candidateSelectionConfirmed ? (
                                          <>
                                            <span className="conversation-form-selection-count" aria-live="polite">
                                              <span>已选择</span>
                                              <strong>{selectedCandidateIds.length}</strong>
                                              <span>张图片</span>
                                            </span>
                                            <Button variant="primary" size="small" disabled={!selectedCandidateIds.length} onClick={() => setCandidateSelectionConfirmed(true)}>
                                              生成方向参考包
                                            </Button>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                  </motion.article>
                                ) : null}
                              </AnimatePresence>
                              {candidateSelectionConfirmed ? (
                                <ConversationUserMessage
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                >
                                  {formatCandidateSelection(selectedCandidateIds)}
                                </ConversationUserMessage>
                              ) : null}
                              {candidateSelectionConfirmed ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant candidate-reference-handoff"
                                  initial={reduceMotion ? false : "hidden"}
                                  animate="visible"
                                  variants={{
                                    hidden: {},
                                    visible: {
                                      transition: {
                                        delayChildren: reduceMotion ? 0 : 0.36,
                                        staggerChildren: reduceMotion ? 0 : 0.18,
                                      },
                                    },
                                  }}
                                  data-node-id="567:69268"
                                >
                                  <motion.p variants={quickActionReveal} data-message-actions="true">
                                    已将 {selectedCandidateIds.length} 张客户参考图、已确认视觉方向和简洁市场依据整理为对外方向参考包。当前等待客户反馈；可以直接粘贴文字、聊天截图、标注图或文档。
                                  </motion.p>
                                  <motion.div className="candidate-reference-handoff__file" variants={quickActionReveal}>
                                    <ConversationFileCard
                                      icon="html"
                                      name="客户方向参考包.html"
                                      description={`刚刚 · ${selectedCandidateIds.length}张已选参考图 · 含标题、说明与标签`}
                                    >
                                      <button type="button" onClick={() => openTrendPreview("package")}>在线查看</button>
                                      <button
                                        type="button"
                                        onClick={() => downloadCustomerDirectionPackage(
                                          selectedCandidateIds,
                                          selectedTrendIds,
                                        )}
                                      >
                                        下载
                                      </button>
                                    </ConversationFileCard>
                                  </motion.div>
                                  {!customerFeedbackSkipped ? (
                                    <motion.div className="candidate-reference-handoff__actions" variants={quickActionReveal}>
                                      <Button variant="outline" onClick={() => setCustomerFeedbackSkipped(true)}>
                                        暂时跳过客户反馈
                                      </Button>
                                    </motion.div>
                                  ) : null}
                                </motion.article>
                              ) : null}
                              {candidateSelectionConfirmed && customerFeedbackSkipped ? (
                                <ConversationUserMessage
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                >
                                  暂时跳过客户反馈
                                </ConversationUserMessage>
                              ) : null}
                          </motion.div>
                        ) : null}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer
          ariaLabel="继续对话"
          value={followUp}
          onChange={setFollowUp}
          onSubmit={submitFollowUp}
          placeholder={conversationPlaceholder}
          disabled={
            !analysisComplete
            || (scopeConfirmed && !trendScanComplete)
            || (trendDirectionsConfirmed && !candidateSearchComplete)
          }
          motionDelay={0.42}
        />
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
                      <StatusIcon status={index === 0 ? (analysisComplete ? "complete" : "loading") : index === 1 ? (scopeConfirmed ? "complete" : "pending") : (trendDirectionsConfirmed ? "complete" : scopeConfirmed ? "loading" : "pending")} />
                      <span>{step}</span>
                    </motion.div>
                  ))}
                </div>
              </section>
              <section>
                <h2>任务产物</h2>
                <div className="task-detail-row"><FigmaIcon name="add-file" size={16} /><span>{trendScanComplete ? "趋势方向分析已生成" : scopeConfirmed ? "正在生成趋势方向分析…" : analysisComplete ? "等待搜集行业资料完成…" : "等待需求解析完成…"}</span></div>
              </section>
        </div>
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      </aside>

      {messageMetaPosition && typeof document !== "undefined" && createPortal(
        <div
          className={`conversation-message-meta conversation-message-meta--floating is-${messageMetaPosition.side}`}
          style={{ left: messageMetaPosition.left, top: messageMetaPosition.top }}
          onPointerEnter={keepMessageMetaOpen}
          onPointerLeave={scheduleMessageMetaHide}
        >
          {messageMetaPosition.side === "user" ? (
            <>
              <time>10:24</time>
              <div>
                <IconControl label="复制消息" variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl>
              </div>
            </>
          ) : (
            <>
              <div>
                <IconControl label="复制消息" variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl>
                <IconControl label="赞同消息" variant="bare" size="xsmall"><FigmaIcon name="like" size={16} /></IconControl>
                <IconControl label="不赞同消息" variant="bare" size="xsmall"><FigmaIcon name="dislike" size={16} /></IconControl>
              </div>
              <time>10:24</time>
            </>
          )}
        </div>,
        document.body,
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {trendPreviewOpen ? (
            <motion.div
              className="trend-preview-backdrop"
              data-node-id="536:13180"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}
            >
              <motion.section
                className="trend-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="trend-preview-title"
                data-node-id="533:12468"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
              >
                <header className="trend-preview-modal__header">
                  <div>
                    <h2 id="trend-preview-title">{trendPreviewKind === "package" ? "客户方向参考包.html" : "客户需求调研与视觉方向.html"}</h2>
                    <span>AI 生成 · 在线预览</span>
                  </div>
                  <div className="trend-preview-modal__actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => trendPreviewKind === "package"
                        ? downloadCustomerDirectionPackage(selectedCandidateIds, selectedTrendIds)
                        : downloadTrendAnalysis("HTML")}
                    >
                      下载 HTML
                    </Button>
                    <IconControl label="关闭在线查看" variant="bare" size="small" autoFocus onClick={() => setTrendPreviewOpen(false)}>
                      <FigmaIcon name="close" size={20} />
                    </IconControl>
                  </div>
                </header>
                <iframe
                  className="trend-preview-modal__frame"
                  title={trendPreviewKind === "package" ? "客户方向参考包在线预览" : "客户需求调研与视觉方向在线预览"}
                  srcDoc={buildTrendReportHtml(trendPreviewKind, selectedTrendIds, selectedCandidateIds)}
                />
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
      {candidatePreviewId ? (
        <CandidateImageLightbox
          categories={candidateCategories}
          items={candidateReferenceImages}
          activeCategoryId={activeCandidateCategory}
          activeItemId={candidatePreviewId}
          selectedIds={selectedCandidateIds}
          selectionDisabled={candidateSelectionConfirmed}
          onCategoryChange={changeCandidatePreviewCategory}
          onNavigate={navigateCandidatePreview}
          onToggleSelection={toggleCandidateReference}
          onClose={() => setCandidatePreviewId(null)}
        />
      ) : null}
    </motion.main>
  );
}
