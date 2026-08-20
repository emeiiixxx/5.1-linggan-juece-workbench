import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { BusinessButton, Button, QuickReplyButton } from "./Button";
import { DownloadFormatMenu } from "./DownloadFormatMenu";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { ImageGalleryLightbox, MasonryImageSelection, type ImageGalleryItem } from "./ImageSelection";
import { TaskConversationComposer, type TaskConversationAttachment } from "./TaskConversationComposer";
import { ConversationUserAttachments, type ConversationUserAttachment } from "./ConversationUserAttachments";
import { ResearchScopeForm } from "./ResearchScopeForm";
import { SelectionCard } from "./SelectionCard";
import { AnalysisStepIcon, ConversationFeed, ConversationFileCard, ConversationFollowUpExchange, ConversationFormTitle, ConversationTaskCompletion, ConversationUserMessage, ImageSelectionActions, SelectAllControl, TaskArtifactRow, TaskDetailPanel, TaskDisclosure } from "./ConversationPrimitives";
import { candidateCategories, candidatePageCount, candidateReferenceImages, formatCandidateSelection, formatTrendDirectionSelection, getCandidateCategoryLabel, getCandidateReference, trendDirections, trendReportDetails, type CandidateCategoryId } from "../data/referenceCatalog";
import { buildFashionProposalHtml } from "../report/fashionProposalHtml";
import { translateHtmlCopy, translateSystemCopy, useI18n } from "../i18n";
import { extractPromptContext } from "../utils/promptContext";
import { getResearchPlatformOptions, getResearchScopeDefaults, researchMarkets, type ResearchMarket } from "../data/researchScope";
import { useModalFocus } from "../hooks/useModalFocus";
import { buildConditionAcknowledgement } from "../utils/taskAcknowledgement";
import { scrollWithinConversation } from "../utils/conversationScroll";

type AnalysisPhase = "parsing" | "complete";
type GenerationDecision = "skip" | "confirm";
type TrendDownloadFormat = "HTML" | "PPT" | "PDF";
type TrendPreviewKind = "research" | "ai-results" | "proposal";
const customerProposalReferenceEvidence = {
  "01": {
    subtitle: "Amazon US · 女装通勤款公开商品资料",
    badges: ["Amazon US", "轻量通勤", "跨场景"],
    sourceUrl: "https://www.amazon.com/Best-Sellers-Womens-Fashion/zgbs/fashion/7147440011",
  },
  "02": {
    subtitle: "Google Trends · 女装面料与层次信号",
    badges: ["Google Trends", "柔性结构", "层次"],
    sourceUrl: "https://trends.google.com/trends/explore?cat=68&geo=US",
  },
  "03": {
    subtitle: "TikTok Creative Center · 学院风服饰内容信号",
    badges: ["TikTok", "复古学院", "社媒趋势"],
    sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
  },
  "04": {
    subtitle: "BELK · 都市功能女装公开商品资料",
    badges: ["BELK", "都市轻机能", "通勤"],
    sourceUrl: "https://www.belk.com/women/womens-clothing/",
  },
} as const;

const customerProposalReferenceStyles: readonly ImageGalleryItem[] = trendDirections.map((direction, index) => {
  const evidence = customerProposalReferenceEvidence[direction.id];
  return {
    id: `customer-reference-style-${direction.id}`,
    categoryId: candidateCategories[index]?.id ?? candidateCategories[0].id,
    code: `REF ${direction.id}`,
    src: trendReportDetails[direction.id].image,
    title: direction.title,
    subtitle: evidence.subtitle,
    badges: [...evidence.badges],
    sourceUrl: evidence.sourceUrl,
    detailLines: [
      "趋势资料 · 2027年2月",
      `匹配理由：${evidence.subtitle}`,
      "获取时间：2026-08-06",
    ],
  };
});

const revealEase = [0.22, 1, 0.36, 1] as const;
const profileRevealDelay = 120;
const analysisRevealDelay = 320;
const analysisTaskRevealDelay = 0.08;
const analysisLoadingDuration = 1600;
const conversationBlockReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: revealEase } },
};
const confirmedResultsReveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const quickActionReveal = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: revealEase } },
};

const customerAiResultImages = candidateCategories.flatMap((category) =>
  candidateReferenceImages
    .filter((candidate) => candidate.categoryId === category.id && candidate.page === 1)
    .slice(0, 3)
    .map((candidate, index) => ({
      ...candidate,
      title: `${category.label}方案 ${String(index + 1).padStart(2, "0")}`,
      subtitle: "AI 改款结果 · 继承已确认视觉方向",
      badges: ["AI 改款", category.label],
      sourceUrl: undefined,
    })),
);

type CustomerAiResultBatch = {
  id: string;
  createdAt: string;
  items: ImageGalleryItem[];
};

type CustomerAiRevisionMessage = {
  id: string;
  request: string;
  attachments: TaskConversationAttachment[];
  response: string;
  isGenerating: boolean;
  resultBatchId?: string;
};

type PendingCustomerAiRevision = {
  messageId: string;
  round: number;
  sourceBatchId: string;
  selectedItemIds: string[];
  selectedItemLabels: string[];
};

const initialCustomerAiResultBatch: CustomerAiResultBatch = {
  id: "customer-ai-initial",
  createdAt: "2026-08-18 16:33",
  items: customerAiResultImages.map((item) => ({ ...item })),
};

function formatCustomerGenerationTime() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createCustomerAiResultBatch(
  round: number,
  sourceItems: readonly ImageGalleryItem[],
  selectedItemIds: readonly string[],
): CustomerAiResultBatch {
  const selected = new Set(selectedItemIds);
  const regenerateAll = selected.size === 0;
  const revisionSources = [
    "assets/figma-confirmed/candidate-gallery-look-01.png",
    "assets/figma-confirmed/candidate-gallery-look-02.png",
    "assets/figma-confirmed/trend-reference-primary.jpg",
  ];
  return {
    id: `customer-ai-revision-${round}`,
    createdAt: formatCustomerGenerationTime(),
    items: sourceItems.map((item, index) => {
      const revised = regenerateAll || selected.has(item.id);
      return {
        ...item,
        id: `customer-B${round}-${String(index + 1).padStart(2, "0")}`,
        code: `B${round}-${String(index + 1).padStart(2, "0")}`,
        src: revised ? revisionSources[(index + round) % revisionSources.length] : item.src,
        subtitle: revised && !item.subtitle?.includes("修改版") ? `${item.subtitle ?? item.title} · 修改版` : item.subtitle,
      };
    }),
  };
}

function StreamingText({ children }: { children: string; delay?: number }) {
  return <span className="conversation-streaming-text">{children}</span>;
}

function getProfileSummary(profileName: string) {
  if (profileName.includes("卡宾")) return "品类：鞋袋　价格段：CNY 200–1,000　市场：中国、欧美　年龄段：3–18岁";
  if (profileName.includes("日本")) return "品类：女装　价格段：JPY 8,000–18,000　市场：日本、韩国、美国　年龄段：25–34岁、35–44岁";
  if (profileName.includes("灭霸") || profileName.includes("Thanos")) return "品类：女装、男装、童装　价格段：USD 1,000–999,999,999　市场：日本、韩国、美国　年龄段：多年龄段";
  return "已应用该档案中保存的品类、价格、市场与年龄范围";
}

function getProfileAnalysisDefaults(profileName: string | undefined) {
  if (!profileName) return null;
  if (profileName.includes("卡宾")) return { category: "鞋袋", price: "CNY 200–1,000", audience: "3–18岁" };
  if (profileName.includes("日本")) return { category: "女装", price: "JPY 8,000–18,000", audience: "25–34岁、35–44岁" };
  if (profileName.includes("灭霸") || profileName.includes("Thanos")) return { category: "女装、男装、童装", price: "USD 1,000–999,999,999", audience: "多年龄段" };
  return null;
}

function buildTrendReportHtml(
  kind: TrendPreviewKind,
  selectedDirectionIds: string[] = [],
  selectedCandidateIds: string[] = [],
  resultItems: readonly ImageGalleryItem[] = customerAiResultImages,
) {
  if (kind === "ai-results" || kind === "proposal") {
    const selectedResults = resultItems.filter((item) =>
      kind === "ai-results" || selectedCandidateIds.includes(item.id),
    );
    const selectedDirections = trendDirections.filter((direction) => selectedDirectionIds.includes(direction.id));
    return buildFashionProposalHtml({
      kind: "package",
      title: kind === "proposal" ? "正式客户提案" : "AI 改款结果",
      deck: kind === "proposal"
        ? "整合客户需求、市场证据、确认方向与 AI 改款图，形成可直接对外沟通的只读提案。"
        : "展示已通过完整性检查的服装改款提示词与 AI 概念图，供选图与正式提案确认使用。",
      kicker: kind === "proposal" ? "FORMAL CLIENT PROPOSAL" : "AI RESTYLING RESULTS",
      directions: selectedDirections.map((direction) => ({
        ...direction,
        ...trendReportDetails[direction.id],
        imageUrl: new URL(assetUrl(trendReportDetails[direction.id].image), window.location.href).href,
      })),
      references: selectedResults.map((reference) => ({
        code: reference.code,
        title: reference.title,
        category: getCandidateCategoryLabel(reference.categoryId as CandidateCategoryId),
        imageUrl: new URL(assetUrl(reference.src), window.location.href).href,
      })),
      categoryCount: new Set(selectedResults.map((reference) => reference.categoryId)).size,
      directionLabel: formatTrendDirectionSelection(selectedDirectionIds) || "已确认视觉方向",
    });
  }
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

function downloadCustomerProposalFile(
  kind: "ai-results" | "proposal",
  format: TrendDownloadFormat,
  selectedDirectionIds: string[],
  selectedResultIds: string[],
  locale: "zh-CN" | "ja-JP" | "en-US",
  resultItems: readonly ImageGalleryItem[] = customerAiResultImages,
) {
  const baseName = translateSystemCopy(kind === "proposal" ? "正式客户提案" : "AI改款结果", locale);
  const html = translateHtmlCopy(buildTrendReportHtml(kind, selectedDirectionIds, selectedResultIds, resultItems), locale);
  const mimeType = format === "HTML"
    ? "text/html;charset=utf-8"
    : format === "PPT"
      ? "application/vnd.ms-powerpoint"
      : "application/pdf";
  const content = format === "HTML" ? html : translateSystemCopy(`${baseName}\n\n${formatTrendDirectionSelection(selectedDirectionIds)}\n已确认 ${selectedResultIds.length} 张 AI 改款图`, locale);
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}.${format.toLowerCase()}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadCustomerAiImage(item: ImageGalleryItem) {
  const extension = item.src.split("?")[0].split(".").pop() || "jpg";
  const link = document.createElement("a");
  link.href = assetUrl(item.src);
  link.download = `${item.code}-${item.title}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadTrendAnalysis(format: TrendDownloadFormat, locale: "zh-CN" | "ja-JP" | "en-US") {
  const analysisName = translateSystemCopy("趋势方向分析", locale);
  if (format === "HTML") {
    const url = URL.createObjectURL(new Blob([translateHtmlCopy(buildTrendReportHtml("research"), locale)], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${translateSystemCopy("客户需求调研与视觉方向", locale)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }
  const reportText = translateSystemCopy([
    "趋势方向分析",
    "",
    "主市场：日本",
    "电商平台：Rakuten Fashion、其他",
    "社媒平台：Instagram、TikTok",
    "方向数量：4",
  ].join("\n"), locale);
  const extension = format.toLowerCase();
  const mimeType = format === "PPT" ? "application/vnd.ms-powerpoint" : "application/pdf";
  const content = reportText;
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${analysisName}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function TrendDirectionSelectionForm({
  selectedIds,
  confirmed,
  onToggle,
  onToggleAll,
  onConfirm,
}: {
  selectedIds: string[];
  confirmed: boolean;
  onToggle: (directionId: string) => void;
  onToggleAll: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className={`new-product-direction-form ${confirmed ? "is-confirmed" : ""}`} aria-label="选择客户提案采用的视觉方向" data-node-id="567:65705">
      <ConversationFormTitle
        title="选择客户提案采用的视觉方向"
        helper="支持多选 · 每个方向均关联市场证据和客户需求匹配点"
        status={confirmed ? "confirmed" : "pending"}
        statusLabel={confirmed ? "已确认" : "待确认"}
      />
      <div className="new-product-direction-grid" role="group" aria-label="视觉方向，支持多选">
        {trendDirections.map((direction) => {
          const selected = selectedIds.includes(direction.id);
          return (
            <SelectionCard
              mode="checkbox"
              selected={selected}
              disabled={confirmed}
              image={{ src: assetUrl("assets/figma-confirmed/trend-direction-thumbnail.png") }}
              title={`${direction.id}·${direction.title}`}
              description={direction.description}
              supporting={direction.recommendation}
              onSelect={() => onToggle(direction.id)}
              key={direction.id}
            />
          );
        })}
      </div>
      {!confirmed ? (
        <div className="new-product-form-actions">
          <SelectAllControl selected={selectedIds.length === trendDirections.length} className="selection-select-all--leading" onToggle={onToggleAll} />
          <BusinessButton points={10} disabled={!selectedIds.length} onClick={onConfirm}>确认并继续</BusinessButton>
        </div>
      ) : null}
    </section>
  );
}

export function ConversationWorkspace({ prompt, profileName, attachments = [], initialState = "default", onTaskProgress, onTaskComplete, readOnly = false }: {
  prompt: string;
  profileName?: string;
  attachments?: ConversationUserAttachment[];
  initialState?: "default" | "complete";
  onTaskProgress?: () => void;
  onTaskComplete?: () => void;
  readOnly?: boolean;
}) {
  const { locale, t } = useI18n();
  const startsComplete = initialState === "complete";
  const completionReportedRef = useRef(startsComplete);
  const profileScopeDefaults = getResearchScopeDefaults(profileName, locale, prompt);
  const promptContext = useMemo(() => extractPromptContext(prompt), [prompt]);
  const profileAnalysisDefaults = getProfileAnalysisDefaults(profileName);
  const parsedMarket = promptContext.market ?? (profileName ? profileScopeDefaults.markets.join("、") : "未指定");
  const parsedAudience = promptContext.audience ?? profileAnalysisDefaults?.audience ?? "未指定";
  const parsedCategory = promptContext.garments?.join("、") || profileAnalysisDefaults?.category || "未指定";
  const parsedPrice = promptContext.price ?? profileAnalysisDefaults?.price ?? "未指定";
  const parsedSeason = promptContext.season ?? "待补充";
  const missingSummary = promptContext.season ? "当前描述未发现必须补充项" : "已确认缺失信息：季节";
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(!startsComplete);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>(startsComplete ? "complete" : "parsing");
  const [profileVisible, setProfileVisible] = useState(startsComplete && Boolean(profileName));
  const [analysisVisible, setAnalysisVisible] = useState(startsComplete);
  const [followUp, setFollowUp] = useState("");
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const [scopeFormVisible, setScopeFormVisible] = useState(startsComplete);
  const [scopeEntryMessage, setScopeEntryMessage] = useState("继续");
  const [scopeEntryAttachments, setScopeEntryAttachments] = useState<TaskConversationAttachment[]>([]);
  const [seasonSkipped, setSeasonSkipped] = useState(false);
  const [scopeConfirmed, setScopeConfirmed] = useState(startsComplete);
  const [scopeResultStage, setScopeResultStage] = useState(startsComplete ? 5 : 0);
  const [trendScanExpanded, setTrendScanExpanded] = useState(true);
  const [trendPreviewOpen, setTrendPreviewOpen] = useState(false);
  const [trendPreviewKind, setTrendPreviewKind] = useState<TrendPreviewKind>("research");
  const [selectedTrendIds, setSelectedTrendIds] = useState<string[]>(
    startsComplete ? trendDirections.slice(0, 2).map((direction) => direction.id) : [],
  );
  const [trendDirectionsConfirmed, setTrendDirectionsConfirmed] = useState(startsComplete);
  const [candidateSearchExpanded, setCandidateSearchExpanded] = useState(true);
  const [candidateSearchStage, setCandidateSearchStage] = useState(0);
  const [candidateSearchRun, setCandidateSearchRun] = useState(0);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSelectionConfirmed, setCandidateSelectionConfirmed] = useState(false);
  const [customerFeedbackSkipped, setCustomerFeedbackSkipped] = useState(false);
  const [generationDecision, setGenerationDecision] = useState<GenerationDecision | null>(startsComplete ? "confirm" : null);
  const [generationEntryMessage, setGenerationEntryMessage] = useState("确认并生成");
  const [generationEntryAttachments, setGenerationEntryAttachments] = useState<TaskConversationAttachment[]>([]);
  const scopeAcknowledgement = buildConditionAcknowledgement({
    message: scopeEntryMessage,
    attachments: scopeEntryAttachments,
    ignoredMessages: ["继续", "跳过", "没有补充，继续", "确认需求，继续"],
  });
  const generationAcknowledgement = buildConditionAcknowledgement({
    message: generationEntryMessage,
    attachments: generationEntryAttachments,
    ignoredMessages: ["确认并生成", "跳过"],
  });
  const [additionalMessages, setAdditionalMessages] = useState<Array<{ request: string; attachments: TaskConversationAttachment[]; response: string }>>([]);
  const [customerProposalStage, setCustomerProposalStage] = useState<"idle" | "ai-generating" | "results" | "proposal-generating" | "complete">(startsComplete ? "complete" : "idle");
  const [aiGenerationProgress, setAiGenerationProgress] = useState(startsComplete ? 4 : 0);
  const [proposalGenerationProgress, setProposalGenerationProgress] = useState(startsComplete ? 4 : 0);
  const [aiGenerationExpanded, setAiGenerationExpanded] = useState(true);
  const [proposalGenerationExpanded, setProposalGenerationExpanded] = useState(true);
  const [selectedAiResultIds, setSelectedAiResultIds] = useState<string[]>(
    startsComplete ? customerAiResultImages.slice(0, 5).map((item) => item.id) : [],
  );
  const [aiResultsConfirmed, setAiResultsConfirmed] = useState(startsComplete);
  const [aiResultPreviewId, setAiResultPreviewId] = useState<string | null>(null);
  const [aiResultPreviewReadOnly, setAiResultPreviewReadOnly] = useState(false);
  const [aiResultPreviewHideSelection, setAiResultPreviewHideSelection] = useState(false);
  const [customerAiResultBatches, setCustomerAiResultBatches] = useState<CustomerAiResultBatch[]>([initialCustomerAiResultBatch]);
  const [customerAiRevisionMessages, setCustomerAiRevisionMessages] = useState<CustomerAiRevisionMessage[]>([]);
  const [pendingCustomerAiRevision, setPendingCustomerAiRevision] = useState<PendingCustomerAiRevision | null>(null);
  const [customerProposalEntryMessage, setCustomerProposalEntryMessage] = useState("");
  const [customerProposalEntryAttachments, setCustomerProposalEntryAttachments] = useState<TaskConversationAttachment[]>([]);
  const [candidatePreviewId, setCandidatePreviewId] = useState<string | null>(null);
  const [referenceStylePreviewId, setReferenceStylePreviewId] = useState<string | null>(null);
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
  const feedEndRef = useRef<HTMLDivElement>(null);
  const trendPreviewDialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const analysisComplete = analysisPhase === "complete";
  const trendScanComplete = scopeResultStage >= 3;
  const candidateSearchComplete = candidateSearchStage >= 4;
  const displayedCustomerAiResults = customerAiResultBatches[customerAiResultBatches.length - 1]?.items ?? customerAiResultImages;
  const allCustomerGeneratedItems = useMemo(() => [...customerAiResultBatches].reverse().flatMap((batch) =>
    batch.items.map((item) => ({ ...item, groupDate: batch.createdAt })),
  ), [customerAiResultBatches]);
  const selectedAiResultSummary = displayedCustomerAiResults
    .filter((item) => selectedAiResultIds.includes(item.id))
    .map((item) => `${item.code} · ${item.title}`)
    .join("、");
  const customerRegenerationBusy = Boolean(pendingCustomerAiRevision);
  const customerProposalRunning = customerProposalStage === "ai-generating" || customerProposalStage === "proposal-generating" || customerRegenerationBusy;
  useModalFocus(trendPreviewDialogRef, trendPreviewOpen, () => setTrendPreviewOpen(false));

  useEffect(() => {
    if (startsComplete) return;
    if (reduceMotion) {
      setProfileVisible(Boolean(profileName));
      setAnalysisVisible(true);
      setAnalysisPhase("complete");
      return;
    }
    const profileTimer = window.setTimeout(
      () => setProfileVisible(Boolean(profileName)),
      profileRevealDelay,
    );
    const analysisTimer = window.setTimeout(
      () => setAnalysisVisible(true),
      analysisRevealDelay,
    );
    const completionTimer = window.setTimeout(
      () => setAnalysisPhase("complete"),
      analysisRevealDelay + analysisTaskRevealDelay * 1000 + analysisLoadingDuration,
    );
    return () => {
      window.clearTimeout(profileTimer);
      window.clearTimeout(analysisTimer);
      window.clearTimeout(completionTimer);
    };
  }, [profileName, reduceMotion, startsComplete]);

  useEffect(() => {
    if (profileName || scopeConfirmed || scopeTouchedRef.current) return;
    const defaults = getResearchScopeDefaults(undefined, locale, prompt);
    setSelectedResearchMarkets(defaults.markets);
    setSelectedCommerce(defaults.commerce);
    setSelectedSocial(defaults.social);
    setOtherCommerce("");
  }, [locale, profileName, prompt, scopeConfirmed]);

  useEffect(() => {
    if (!trendPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [trendPreviewOpen]);

  useEffect(() => {
    if (!scopeFormVisible) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(scopePhaseRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, scopeFormVisible]);

  useEffect(() => {
    if (!scopeConfirmed) return;
    if (startsComplete) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(confirmedResultsRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, scopeConfirmed, startsComplete]);

  useEffect(() => {
    if (!scopeConfirmed) return;
    if (startsComplete) return;
    setScopeResultStage(0);
    if (reduceMotion) {
      setScopeResultStage(5);
      return;
    }
    const stages = [
      { delay: 120, value: 1 },
      { delay: 420, value: 2 },
      { delay: 1400, value: 5 },
    ];
    const timers = stages.map(({ delay, value }) => window.setTimeout(() => setScopeResultStage(value), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduceMotion, scopeConfirmed, startsComplete]);

  useEffect(() => {
    if (!trendDirectionsConfirmed || !candidateSearchRun) return;
    if (startsComplete) return;
    setCandidateSearchStage(0);
    if (reduceMotion) {
      setCandidateSearchStage(5);
      return;
    }
    const stages = [
      { delay: 120, value: 1 },
      { delay: 420, value: 3 },
      { delay: 1600, value: 5 },
    ];
    const timers = stages.map(({ delay, value }) => window.setTimeout(
      () => setCandidateSearchStage(value),
      delay,
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [candidateSearchRun, reduceMotion, startsComplete, trendDirectionsConfirmed]);

  useEffect(() => {
    if (candidateSearchStage !== 1 && candidateSearchStage !== 5) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(candidatePoolRef.current, {
        behavior: reduceMotion ? "auto" : "smooth",
        block: candidateSearchStage >= 5 ? "end" : "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [candidateSearchStage, reduceMotion]);

  useEffect(() => {
    if (!candidateSelectionConfirmed) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(candidatePoolRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [candidateSelectionConfirmed, reduceMotion]);

  useEffect(() => {
    if (!customerFeedbackSkipped) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(candidatePoolRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerFeedbackSkipped, generationDecision, reduceMotion]);

  useEffect(() => {
    if (customerProposalStage !== "ai-generating") return;
    if (reduceMotion) {
      setAiGenerationProgress(4);
      setCustomerProposalStage("results");
      return;
    }
    const timers = [
      window.setTimeout(() => setAiGenerationProgress(1), 180),
      window.setTimeout(() => setAiGenerationProgress(2), 820),
      window.setTimeout(() => setAiGenerationProgress(3), 1500),
      window.setTimeout(() => setAiGenerationProgress(4), 2200),
      window.setTimeout(() => setCustomerProposalStage("results"), 2800),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [customerProposalStage, reduceMotion]);

  useEffect(() => {
    if (customerProposalStage !== "proposal-generating") return;
    if (reduceMotion) {
      setProposalGenerationProgress(4);
      setCustomerProposalStage("complete");
      return;
    }
    const timers = [
      window.setTimeout(() => setProposalGenerationProgress(1), 160),
      window.setTimeout(() => setProposalGenerationProgress(2), 700),
      window.setTimeout(() => setProposalGenerationProgress(3), 1280),
      window.setTimeout(() => setProposalGenerationProgress(4), 1880),
      window.setTimeout(() => setCustomerProposalStage("complete"), 2400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [customerProposalStage, reduceMotion]);

  useEffect(() => {
    if (!pendingCustomerAiRevision) return;
    const pending = pendingCustomerAiRevision;
    const timer = window.setTimeout(() => {
      const sourceBatch = customerAiResultBatches.find((batch) => batch.id === pending.sourceBatchId)
        ?? customerAiResultBatches[customerAiResultBatches.length - 1]
        ?? initialCustomerAiResultBatch;
      const nextBatch = createCustomerAiResultBatch(pending.round, sourceBatch.items, pending.selectedItemIds);
      const unchangedCount = Math.max(sourceBatch.items.length - pending.selectedItemIds.length, 0);
      setCustomerAiResultBatches((current) => [...current, nextBatch]);
      setCustomerAiRevisionMessages((current) => current.map((message) => message.id === pending.messageId ? {
        ...message,
        isGenerating: false,
        resultBatchId: nextBatch.id,
        response: pending.selectedItemLabels.length
          ? `已完成 ${pending.selectedItemLabels.join("、")} 的修改，并与 ${unchangedCount} 张未提出修改意见的图片合并为一组新的完整候选。旧版本和本组图片都已保留，请从下面的新表单重新选择。`
          : "已根据你的修改要求生成一组新的完整候选。旧版本和本组图片都已保留，请从下面的新表单重新选择。",
      } : message));
      setSelectedAiResultIds([]);
      setPendingCustomerAiRevision(null);
    }, reduceMotion ? 0 : 2200);
    return () => window.clearTimeout(timer);
  }, [customerAiResultBatches, pendingCustomerAiRevision, reduceMotion]);

  useEffect(() => {
    if (customerProposalStage === "idle") return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(candidatePoolRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerProposalStage, reduceMotion]);

  useEffect(() => {
    if (customerProposalStage !== "complete" || completionReportedRef.current) return;
    completionReportedRef.current = true;
    onTaskComplete?.();
  }, [customerProposalStage, onTaskComplete]);

  useEffect(() => {
    if (!additionalMessages.length) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(feedEndRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [additionalMessages.length, reduceMotion]);

  useEffect(() => {
    if (!customerAiRevisionMessages.length) return;
    const frame = window.requestAnimationFrame(() => {
      scrollWithinConversation(feedEndRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerAiResultBatches.length, customerAiRevisionMessages.length, pendingCustomerAiRevision, reduceMotion]);

  const submitFollowUp = (submittedAttachments: TaskConversationAttachment[]) => {
    const message = followUp.trim();
    if (!message && !submittedAttachments.length) return;
    onTaskProgress?.();
    let handled = false;
    if (customerProposalStage === "results") {
      const normalizedMessage = message.replace(selectedAiResultSummary, "").replace(/^\s*[，,、:：]\s*/, "").trim();
      const confirmsProposal = selectedAiResultIds.length > 0 && (
        !normalizedMessage
        || ["确认", "发送", "生成提案", "确认并生成提案"].includes(normalizedMessage)
      );
      if (confirmsProposal) generateFormalCustomerProposal(message || selectedAiResultSummary, submittedAttachments);
      else startCustomerAiRevision(message, submittedAttachments);
      handled = true;
    } else if (trendDirectionsConfirmed && customerProposalStage === "idle") {
      setGenerationEntryMessage(message);
      setGenerationEntryAttachments(submittedAttachments);
      startCustomerAiGeneration();
      handled = true;
    } else if (analysisComplete && !scopeFormVisible) {
      setScopeEntryAttachments(submittedAttachments);
      if (message === "继续") {
        setScopeEntryMessage("继续");
        setScopeFormVisible(true);
      } else if (message === "跳过") {
        setSeasonSkipped(true);
      } else {
        setScopeEntryMessage(message);
        setScopeFormVisible(true);
      }
      handled = true;
    }
    if (!handled) setAdditionalMessages((current) => [...current, {
      request: message,
      attachments: submittedAttachments,
      response: message
        ? `已收到你的追加要求：“${message}”。我会在当前客户提案流程中继续处理，并保留已经确认的内容。`
        : `已收到你补充的 ${submittedAttachments.length} 份资料。我会在当前客户提案流程中继续处理，并保留已经确认的内容。`,
    }]);
    setFollowUp("");
  };

  const submitCompletionSuggestion = (suggestion: string) => {
    onTaskProgress?.();
    setFollowUp("");
    setAdditionalMessages((current) => [...current, {
      request: suggestion,
      attachments: [],
      response: `已收到你的追加要求：“${suggestion}”。我会基于当前客户提案继续处理，并保留已确认的客户需求、市场依据、视觉方向和 AI 改款结果。`,
    }]);
  };

  const useSeasonQuickReply = (message: "继续" | "跳过" | "没有补充，继续" | "确认需求，继续") => {
    if (message !== "跳过") {
      setScopeEntryMessage(message);
      setScopeEntryAttachments([]);
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

  const toggleTrendDirection = (directionId: string) => {
    if (trendDirectionsConfirmed) return;
    setSelectedTrendIds((current) => current.includes(directionId)
      ? current.filter((id) => id !== directionId)
      : [...current, directionId]);
  };

  const confirmTrendDirections = () => {
    if (!selectedTrendIds.length || trendDirectionsConfirmed) return;
    setTrendDirectionsConfirmed(true);
    setTrendPreviewOpen(false);
    setGenerationDecision("confirm");
    setGenerationEntryMessage(formatTrendDirectionSelection(selectedTrendIds));
    setGenerationEntryAttachments([]);
    setAiGenerationProgress(0);
    setAiGenerationExpanded(true);
    setCustomerProposalStage("ai-generating");
  };

  const toggleCandidateReference = (candidateId: string) => {
    if (candidateSelectionConfirmed) return;
    setSelectedCandidateIds((current) => current.includes(candidateId)
      ? current.filter((id) => id !== candidateId)
      : [...current, candidateId]);
  };

  const startCustomerAiGeneration = () => {
    setGenerationDecision("confirm");
    setAiGenerationProgress(0);
    setAiGenerationExpanded(true);
    setCustomerProposalStage("ai-generating");
  };

  const requestCustomerGenerationFeedback = () => {
    setComposerFocusRequest((request) => request + 1);
  };

  const confirmCustomerAiGeneration = () => {
    setGenerationEntryMessage("确认并生成");
    setGenerationEntryAttachments([]);
    startCustomerAiGeneration();
  };

  const toggleAiResult = (resultId: string) => {
    if (aiResultsConfirmed || customerProposalRunning) return;
    const next = selectedAiResultIds.includes(resultId)
      ? selectedAiResultIds.filter((id) => id !== resultId)
      : [...selectedAiResultIds, resultId];
    setSelectedAiResultIds(next);
    setFollowUp(displayedCustomerAiResults
      .filter((item) => next.includes(item.id))
      .map((item) => `${item.code} · ${item.title}`)
      .join("、"));
  };

  const generateFormalCustomerProposal = (
    message = followUp.trim() || selectedAiResultSummary,
    submittedAttachments: TaskConversationAttachment[] = [],
  ) => {
    if (!selectedAiResultIds.length || customerProposalRunning) return;
    setCustomerProposalEntryMessage(message);
    setCustomerProposalEntryAttachments(submittedAttachments);
    setFollowUp("");
    setAiResultsConfirmed(true);
    setProposalGenerationProgress(0);
    setProposalGenerationExpanded(true);
    setCustomerProposalStage("proposal-generating");
  };

  const startCustomerAiRevision = (message: string, submittedAttachments: TaskConversationAttachment[]) => {
    if (customerRegenerationBusy || aiResultsConfirmed) return;
    const latestBatch = customerAiResultBatches[customerAiResultBatches.length - 1] ?? initialCustomerAiResultBatch;
    const selectedItems = latestBatch.items.filter((item) => selectedAiResultIds.includes(item.id));
    const messageId = `customer-ai-revision-message-${Date.now()}`;
    setCustomerAiRevisionMessages((current) => [...current, {
      id: messageId,
      request: message || "请重新调整这一组方案",
      attachments: submittedAttachments,
      response: selectedItems.length
        ? `收到你的修改需求，我将修改你选中的 ${selectedItems.map((item) => `${item.code} · ${item.title}`).join("、")}，并与没有提出修改意见的图片重新组合。`
        : "收到你的修改需求，我将重新调整整组方案，并保留已生成的旧版本。",
      isGenerating: true,
    }]);
    setPendingCustomerAiRevision({
      messageId,
      round: customerAiResultBatches.length,
      sourceBatchId: latestBatch.id,
      selectedItemIds: selectedItems.map((item) => item.id),
      selectedItemLabels: selectedItems.map((item) => `${item.code} · ${item.title}`),
    });
    setAiResultPreviewId(null);
  };

  const stopCustomerProposalTask = () => {
    if (customerRegenerationBusy) {
      setPendingCustomerAiRevision(null);
      setCustomerAiRevisionMessages((current) => current.map((message) => message.isGenerating ? {
        ...message,
        isGenerating: false,
        response: "本次修改已暂停，已生成的图片不会被覆盖。你可以调整要求后继续。",
      } : message));
      return;
    }
    if (customerProposalStage === "ai-generating") {
      setAiGenerationProgress(0);
      setCustomerProposalStage("idle");
      setGenerationDecision(null);
      return;
    }
    if (customerProposalStage === "proposal-generating") {
      setProposalGenerationProgress(0);
      setCustomerProposalStage("results");
      setAiResultsConfirmed(false);
    }
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
  const allResearchPlatformOptions = getResearchPlatformOptions(researchMarkets);
  const researchScopeAllSelected = researchMarkets.every((market) => selectedResearchMarkets.includes(market))
    && allResearchPlatformOptions.commerce.every((platform) => selectedCommerce.includes(platform))
    && allResearchPlatformOptions.social.every((platform) => selectedSocial.includes(platform));
  const scopeCanSubmit = selectedResearchMarkets.length > 0 && selectedCommerce.length > 0 && selectedSocial.length > 0;
  const activeCandidatePage = candidatePages[activeCandidateCategory];
  const visibleCandidateImages = candidateReferenceImages.filter((candidate) =>
    candidate.categoryId === activeCandidateCategory && candidate.page === activeCandidatePage,
  );
  const toggleAllAiResults = () => {
    if (aiResultsConfirmed || customerProposalRunning) return;
    const next = selectedAiResultIds.length === displayedCustomerAiResults.length
      ? []
      : displayedCustomerAiResults.map((item) => item.id);
    setSelectedAiResultIds(next);
    setFollowUp(displayedCustomerAiResults
      .filter((item) => next.includes(item.id))
      .map((item) => `${item.code} · ${item.title}`)
      .join("、"));
  };
  const conversationPlaceholder = !analysisComplete
    ? "Agent 正在解析需求，请稍候..."
    : !scopeFormVisible
      ? "补充季节或其他条件；输入“继续”进入调研范围..."
      : !scopeConfirmed
        ? "请完成上方调研范围表单，或输入需要补充的条件..."
        : !trendScanComplete
          ? "Agent 正在扫描趋势方向，请稍候..."
          : !trendDirectionsConfirmed
            ? "请在上方选择视觉方向，或输入需要调整的方向..."
            : customerProposalStage === "ai-generating"
                ? "Agent 正在生成专业改款提示词与 AI 概念图..."
                : customerProposalStage === "results"
                  ? "请选择图片；名称会回显到输入框，也可输入修改要求..."
                  : customerProposalStage === "proposal-generating"
                    ? "Agent 正在写入正式客户提案，请稍候..."
                    : customerProposalStage === "complete"
                      ? "任务已完成，可提出修改意见或追加任务..."
                      : "继续补充条件或提出修改意见...";

  const renderCustomerAiResultForm = (batch: CustomerAiResultBatch) => {
    const activeBatch = batch.id === customerAiResultBatches[customerAiResultBatches.length - 1]?.id
      && customerProposalStage === "results"
      && !aiResultsConfirmed;
    const latestBatch = batch.id === customerAiResultBatches[customerAiResultBatches.length - 1]?.id;
    const selectedIds = activeBatch || (latestBatch && aiResultsConfirmed) ? selectedAiResultIds : [];
    return (
      <section
        className={`new-product-results-form customer-ai-results-form ${activeBatch ? "" : "is-confirmed"}`}
        aria-label="选择进入正式客户提案的 AI 改款图"
        key={batch.id}
      >
        <ConversationFormTitle
          title="选择进入正式客户提案的 AI 改款图"
          helper="选择后名称会回显到输入框；可直接发送、生成提案，或在输入框说明修改要求。"
          status={activeBatch ? "pending" : "confirmed"}
          statusLabel={activeBatch ? "待确认" : "已保留"}
        />
        <div className="customer-ai-result-grid customer-ai-result-grid--all">
          {batch.items.map((item) => (
            <MasonryImageSelection
              key={item.id}
              src={assetUrl(item.src)}
              alt={`${item.code} ${item.title}`}
              label={`${item.code} · ${item.title}`}
              selected={selectedIds.includes(item.id)}
              disabled={!activeBatch || customerProposalRunning}
              onSelect={() => toggleAiResult(item.id)}
              onPreview={() => {
                setAiResultPreviewReadOnly(!activeBatch);
                setAiResultPreviewHideSelection(false);
                setAiResultPreviewId(item.id);
              }}
            />
          ))}
        </div>
        <ImageSelectionActions
          selectedCount={selectedIds.length}
          totalCount={batch.items.length}
          disabled={!activeBatch || customerProposalRunning}
          hint=""
          onToggleAll={toggleAllAiResults}
        >
          {activeBatch ? (
            <BusinessButton points={999} disabled={!selectedAiResultIds.length || customerProposalRunning} onClick={() => generateFormalCustomerProposal()}>
              生成提案
            </BusinessButton>
          ) : null}
        </ImageSelectionActions>
      </section>
    );
  };

  return (
    <motion.main
      className={`workspace-region workspace-region--conversation ${detailPanelOpen ? "has-detail-panel" : ""} ${readOnly ? "is-read-only" : ""}`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
    >
      <section className="conversation-stage" aria-label="任务对话">
        <div className="conversation-scroll">
          <ConversationFeed data-node-id="476:103924" metaDisabled={readOnly}>
            <ConversationUserMessage
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.04, ease: revealEase }}
              data-node-id="476:103925"
            >
              <ConversationUserAttachments attachments={attachments} />
              <span>{prompt}</span>
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
                    <strong>{profileName}</strong>
                    <span>{profileName ? getProfileSummary(profileName) : null}</span>
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
                        <span>{profileName ? "读取业务偏好档案" : "检查业务偏好档案"}</span>
                      </div>
                      <p>{profileName ? "已读取并理解业务偏好档案内容" : "本任务未应用业务偏好档案，将仅使用当前描述。"}</p>
                      <div>
                        <AnalysisStepIcon complete={analysisComplete} delay={0.02} />
                        <span>解析客户资料与首轮描述</span>
                      </div>
                      <p>{analysisComplete ? "已整理" : "正在整理"}{parsedSeason === "待补充" ? "目标季节" : parsedSeason}相关公开资料，以建立本次需求语境。</p>
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
                          {missingSummary}
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
                    transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.08, ease: revealEase }}
                  >
                    <p><StreamingText delay={0.62}>已完成本次需求解析</StreamingText></p>
                    <motion.div
                      className="conversation-analysis-summary"
                      initial={reduceMotion ? false : "hidden"}
                      animate="visible"
                      variants={conversationBlockReveal}
                      transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.12, ease: revealEase }}
                    >
                      <strong><StreamingText delay={0.82}>本次需求理解：</StreamingText></strong>
                      <ul>
                        <li><StreamingText delay={0.94}>目标：根据当前描述形成客户可评审的方向方案</StreamingText></li>
                        <li><StreamingText delay={1.08}>{`市场：${parsedMarket}　人群：${parsedAudience}`}</StreamingText></li>
                        <li><StreamingText delay={1.22}>{`品类：${parsedCategory}　季节：${parsedSeason}`}</StreamingText></li>
                        <li><StreamingText delay={1.36}>{`价格：${parsedPrice}　设计方向：待补充`}</StreamingText></li>
                        <li><StreamingText delay={1.5}>参考图特征：未上传，待补充</StreamingText></li>
                        <li><StreamingText delay={1.64}>保留元素：待补充　排除元素：待补充</StreamingText></li>
                        <li><StreamingText delay={1.78}>{promptContext.season ? "必要字段已从当前描述中识别" : "待补充：季节"}</StreamingText></li>
                      </ul>
                    </motion.div>
                  </motion.article>
                  <motion.article
                    className="conversation-message conversation-message--assistant conversation-analysis-confirmation"
                    initial={reduceMotion ? false : "hidden"}
                    animate="visible"
                    variants={conversationBlockReveal}
                    transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.18, ease: revealEase }}
                  >
                    <p><StreamingText delay={2.02}>{promptContext.season ? `已识别季节为【${promptContext.season}】，确认后进入调研范围。` : "请确认【季节】，可直接补充；没有补充时可继续进入调研范围。"}</StreamingText></p>
                    {!scopeFormVisible && !seasonSkipped ? (
                      <motion.div
                        className="conversation-quick-actions"
                        aria-label="季节确认快捷操作"
                        data-node-id="476:105358"
                        initial={reduceMotion ? false : "hidden"}
                        animate="visible"
                        variants={{ visible: { transition: { delayChildren: reduceMotion ? 0 : 0.24, staggerChildren: reduceMotion ? 0 : 0.06 } } }}
                      >
                        {!promptContext.season ? <motion.span className="conversation-quick-action" variants={quickActionReveal}>
                          <Button variant="outline" size="small" onClick={() => setComposerFocusRequest((request) => request + 1)}>补充条件</Button>
                        </motion.span> : null}
                        <motion.span className="conversation-quick-action" variants={quickActionReveal}>
                          <QuickReplyButton onClick={() => useSeasonQuickReply(promptContext.season ? "确认需求，继续" : "没有补充，继续")}>{promptContext.season ? "确认需求，继续" : "没有补充，继续"}</QuickReplyButton>
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
                  <ConversationUserMessage data-node-id="484:106206">
                    <ConversationUserAttachments attachments={scopeEntryAttachments} />
                    {scopeEntryMessage && <span>{scopeEntryMessage}</span>}
                  </ConversationUserMessage>

                  <motion.article className="conversation-message conversation-message--assistant conversation-scope-copy" data-node-id="484:106216">
                    {scopeAcknowledgement ? <p>{scopeAcknowledgement}</p> : null}
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
                      onToggleAll={() => {
                        scopeTouchedRef.current = true;
                        setSelectedResearchMarkets(researchScopeAllSelected ? profileScopeDefaults.markets : [...researchMarkets]);
                        setSelectedCommerce(researchScopeAllSelected ? profileScopeDefaults.commerce : [...allResearchPlatformOptions.commerce]);
                        setSelectedSocial(researchScopeAllSelected ? profileScopeDefaults.social : [...allResearchPlatformOptions.social]);
                      }}
                      onReset={() => {
                        scopeTouchedRef.current = true;
                        setSelectedResearchMarkets(profileScopeDefaults.markets);
                        setSelectedCommerce(profileScopeDefaults.commerce);
                        setSelectedSocial(profileScopeDefaults.social);
                        setOtherCommerce("");
                      }}
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
                          <p>调研摘要：目标人群 {parsedAudience}；品类 {parsedCategory}；核心视觉词待验证；排除项待补充。趋势资料、社媒信号和电商供给/竞争信息将分别呈现，不把单一来源写成确定趋势或销量机会。</p>
                        </motion.article> : null}

                        {scopeResultStage >= 2 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-scan-message"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                          data-node-id="488:112602"
                        >
                          <p>范围已确认。我会先做小样本趋势方向扫描，分别整理趋势资料、电商供给/竞争与社媒信号，不直接进入候选池。</p>
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
                          className="conversation-message conversation-message--assistant conversation-trend-result trend-file-list"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.36, ease: revealEase }}
                          data-node-id="567:65705"
                        >
                          <p data-message-actions="true">调研已完成。当前证据更支持“轻量松弛通勤”和“复古学院混搭”作为核心方向；柔性结构与都市轻机能适合小规模验证。判断分别核对了电商供给、社媒内容、品牌采用和趋势资料。社媒互动不等于销量，不同电商平台的数值未合并。</p>
                          {scopeResultStage >= 4 ? (
                            <>
                              <ConversationFileCard
                                icon="html"
                                name="客户需求调研与视觉方向.html"
                                description="刚刚 · 4个待确认方向 · 分来源展示样本、时间、充分度与缺口"
                              >
                                <button type="button" onClick={() => openTrendPreview("research")}>在线查看</button>
                                <DownloadFormatMenu onSelect={(format) => downloadTrendAnalysis(format.toUpperCase() as TrendDownloadFormat, locale)} />
                              </ConversationFileCard>
                              <p>本次判断综合参考了目标市场电商商品、社媒内容、趋势资料和用户上传资料。具体来源、样本范围与数据缺口可在调研报告中查看。</p>
                            </>
                          ) : null}
                        </motion.article> : null}

                        {scopeResultStage >= 5 ? <motion.article
                          className="conversation-message conversation-message--assistant conversation-handoff-copy"
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                          data-node-id="488:112714"
                        >
                          <p>{trendDirectionsConfirmed ? "已确认以下趋势方向，选择记录保留如下。" : "趋势方向分析及辅助材料已生成。请在下方选择认可方向；确认前不会进入定向候选检索。"}</p>
                        </motion.article> : null}

                        {scopeResultStage >= 5 ? (
                          <motion.article
                            className="conversation-message conversation-message--assistant conversation-trend-result conversation-trend-selection-step"
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                            data-node-id="567:65705"
                          >
                            <TrendDirectionSelectionForm
                              selectedIds={selectedTrendIds}
                              confirmed={trendDirectionsConfirmed}
                              onToggle={toggleTrendDirection}
                              onToggleAll={() => setSelectedTrendIds(selectedTrendIds.length === trendDirections.length ? [] : trendDirections.map((direction) => direction.id))}
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
                            data-node-id="620:33330"
                          >
                              {/* 已移除定向参考检索、参考包与客户反馈等待阶段。 */}
                              {false && (<>
                              <AnimatePresence initial={false}>
                                {candidateSearchStage >= 1 ? (
                                  <motion.article
                                    className="conversation-message conversation-message--assistant conversation-candidate-copy"
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
                                      <ConversationFormTitle
                                        title="选择参考图 · 支持多选"
                                        status={candidateSelectionConfirmed ? "confirmed" : "pending"}
                                        statusLabel={candidateSelectionConfirmed ? "已确认" : "待确认"}
                                      />
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
                                            <SelectAllControl
                                              selected={selectedCandidateIds.length === candidateReferenceImages.length}
                                              className="selection-select-all--leading"
                                              onToggle={() => setSelectedCandidateIds(selectedCandidateIds.length === candidateReferenceImages.length
                                                ? []
                                                : candidateReferenceImages.map((candidate) => candidate.id))}
                                            />
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
                                        delayChildren: reduceMotion ? 0 : 0.08,
                                        staggerChildren: reduceMotion ? 0 : 0.08,
                                      },
                                    },
                                  }}
                                  data-node-id="567:69268"
                                >
                                  <motion.p variants={quickActionReveal}>
                                    已确认 {selectedCandidateIds.length} 张客户参考图及视觉方向。当前等待客户反馈；可以直接粘贴文字、聊天截图、标注图或文档。
                                  </motion.p>
                                  {!customerFeedbackSkipped ? (
                                    <motion.div className="candidate-reference-handoff__actions" variants={quickActionReveal}>
                                      <Button variant="outline" onClick={() => setCustomerFeedbackSkipped(true)}>
                                        <span>暂时跳过客户反馈</span>
                                        <FigmaIcon name="arrow-right" size={16} />
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
                              {candidateSelectionConfirmed && customerFeedbackSkipped ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant candidate-generation-assumptions"
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.08, ease: revealEase }}
                                  data-node-id="620:31947"
                                  data-message-meta="disabled"
                                  data-copy-exclude="true"
                                >
                                  <p>
                                    已暂时跳过客户反馈，以下未指定项将作为待确认假设。<br />
                                    采用的基础参考款：C05、C06、C07、C03<br />
                                    必须保留：已确认视觉方向、成熟客群与舒适覆盖度<br />
                                    必须排除：过度年轻、夸张露肤、第三方标识与直接复刻<br />
                                    款式修改方向：基于已选锚点做保守、差异与趋势延展三类发散<br />
                                    计划生成：12 款原型演示概念图<br />
                                    发散要求：每款至少改变两个有意义的设计轴；颜色替换不单独计为新款<br />
                                    新增参考图作用：本轮未新增，默认使用已选候选图作为锚点
                                  </p>
                                  {!generationDecision ? (
                                    <div className="candidate-generation-assumptions__actions">
                                      <Button variant="secondary" size="small" onClick={requestCustomerGenerationFeedback}>补充反馈</Button>
                                      <BusinessButton points={10} onClick={confirmCustomerAiGeneration}>确认并生成</BusinessButton>
                                    </div>
                                  ) : null}
                                </motion.article>
                              ) : null}
                              {generationDecision ? (
                                <ConversationUserMessage
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                >
                                  <ConversationUserAttachments attachments={generationEntryAttachments} />
                                  {generationDecision === "confirm" ? generationEntryMessage : "跳过"}
                                </ConversationUserMessage>
                              ) : null}
                              </>)}
                              {generationDecision === "confirm" && customerProposalStage !== "idle" ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant customer-ai-generation-message"
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.08, ease: revealEase }}
                                  data-node-id="620:32088"
                                >
                                  {generationAcknowledgement ? <p>{generationAcknowledgement}</p> : null}
                                  <p>视觉方向已确认，正在生成专业服装改款提示词与 AI 概念图。</p>
                                  <TaskDisclosure
                                    title="AI改款生成"
                                    expanded={aiGenerationExpanded}
                                    complete={customerProposalStage !== "ai-generating"}
                                    controlsId="customer-ai-generation-details"
                                    onToggle={() => setAiGenerationExpanded((expanded) => !expanded)}
                                  >
                                    <div><AnalysisStepIcon complete={aiGenerationProgress >= 1} delay={0.02} /><span>将确认方向、需求约束与企业能力边界结构化</span></div>
                                    <div><AnalysisStepIcon complete={aiGenerationProgress >= 2} delay={0.1} /><span>检查每款至少两个有意义的设计变化轴</span></div>
                                    <div><AnalysisStepIcon complete={aiGenerationProgress >= 3} delay={0.18} /><span>通过完整性检查后生成图片，并检查空白、重复与人群偏差</span></div>
                                    <div><AnalysisStepIcon complete={aiGenerationProgress >= 4} delay={0.26} /><span>将专业改款提示词与 AI 概念图整理为可查看结果</span></div>
                                  </TaskDisclosure>
                                </motion.article>
                              ) : null}
                              {["results", "proposal-generating", "complete"].includes(customerProposalStage) ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant customer-ai-results-message"
                                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
                                  data-node-id={aiResultsConfirmed ? "620:33330" : selectedAiResultIds.length ? "620:32881" : "620:32330"}
                                >
                                  <p>首批 12 张 AI 改款图已完成。已继承客户确认的视觉方向与需求约束，并分别在廓形、比例、结构、花型或细节上形成差异，不以换色充当新款。选择图片后可直接生成提案；如需调整，请在输入框说明，系统会追加一组新方案，已生成图片不会被覆盖。</p>
                                  <ConversationFileCard
                                    icon="html"
                                    name="AI改款结果（12张）.html"
                                    description="刚刚 · 服装改款提示词已在后台通过完整性检查 · AI概念表达"
                                  >
                                    <button type="button" onClick={() => openTrendPreview("ai-results")}>在线查看</button>
                                    <DownloadFormatMenu onSelect={(format) => downloadCustomerProposalFile("ai-results", format.toUpperCase() as TrendDownloadFormat, selectedTrendIds, displayedCustomerAiResults.map((item) => item.id), locale, displayedCustomerAiResults)} />
                                  </ConversationFileCard>
                                  <p>请从改款结果中选择进入正式客户提案的图片。</p>
                                  {renderCustomerAiResultForm(customerAiResultBatches[0])}
                                </motion.article>
                              ) : null}
                              {customerAiRevisionMessages.map((message) => {
                                const resultBatch = message.resultBatchId
                                  ? customerAiResultBatches.find((batch) => batch.id === message.resultBatchId)
                                  : undefined;
                                return (
                                  <ConversationFollowUpExchange
                                    request={message.request}
                                    attachments={message.attachments}
                                    response={message.response}
                                    key={message.id}
                                  >
                                    {message.isGenerating ? (
                                      <TaskDisclosure title="AI改款工具调用" expanded complete={false} controlsId={`${message.id}-details`} onToggle={() => undefined}>
                                        <div><AnalysisStepIcon complete delay={0.02} /><span>已锁定需要修改的图片与用户意见</span></div>
                                        <div><AnalysisStepIcon complete={false} delay={0.1} /><span>正在生成修改款，并与未修改图片合并为完整候选</span></div>
                                        <div><AnalysisStepIcon complete={false} delay={0.18} /><span>正在保留旧版本并写入新的时间分组</span></div>
                                      </TaskDisclosure>
                                    ) : resultBatch ? renderCustomerAiResultForm(resultBatch) : null}
                                  </ConversationFollowUpExchange>
                                );
                              })}
                              {aiResultsConfirmed ? (
                                <ConversationUserMessage
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                >
                                  <ConversationUserAttachments attachments={customerProposalEntryAttachments} />
                                  {customerProposalEntryMessage || selectedAiResultSummary}
                                </ConversationUserMessage>
                              ) : null}
                              {["proposal-generating", "complete"].includes(customerProposalStage) ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant customer-proposal-generation-message"
                                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
                                  data-node-id="620:33742"
                                  >
                                  <p>正在将客户需求、市场证据、确认方向和 AI 改款图写入正式客户提案。</p>
                                  <TaskDisclosure
                                    title="生成正式客户提案"
                                    expanded={proposalGenerationExpanded}
                                    complete={customerProposalStage === "complete"}
                                    controlsId="formal-customer-proposal-details"
                                    onToggle={() => setProposalGenerationExpanded((expanded) => !expanded)}
                                  >
                                    <div><AnalysisStepIcon complete={proposalGenerationProgress >= 1} delay={0.02} /><span>锁定用户确认的 AI 改款图</span></div>
                                    <div><AnalysisStepIcon complete={proposalGenerationProgress >= 2} delay={0.1} /><span>关联市场数据、确认方向与改款依据</span></div>
                                    <div><AnalysisStepIcon complete={proposalGenerationProgress >= 3} delay={0.18} /><span>生成单一文件语言的只读 HTML</span></div>
                                    <div><AnalysisStepIcon complete={proposalGenerationProgress >= 4} delay={0.26} /><span>准备 HTML、PPT、PDF 下载文件</span></div>
                                  </TaskDisclosure>
                                </motion.article>
                              ) : null}
                              {customerProposalStage === "complete" ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant customer-proposal-complete-message"
                                  data-message-actions="true"
                                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
                                >
                                  <ConversationTaskCompletion
                                    message={<>正式客户提案已完成，已写入 {selectedAiResultIds.length} 张确认后的 AI 改款图，并保留客户需求、市场与趋势依据、视觉方向和方案对比。未包含内部 Design Brief、BOM、打样、MOQ、成本、交期或供应链计划。</>}
                                    suggestions={[]}
                                  >
                                    <ConversationFileCard icon="html" name="正式客户提案.html" description="刚刚 · 统一HTML查看器 · 可下载HTML/PPT/PDF · 不支持在线编辑">
                                      <button type="button" onClick={() => openTrendPreview("proposal")}>在线查看</button>
                                      <DownloadFormatMenu onSelect={(format) => downloadCustomerProposalFile("proposal", format.toUpperCase() as TrendDownloadFormat, selectedTrendIds, selectedAiResultIds, locale, displayedCustomerAiResults)} />
                                    </ConversationFileCard>
                                  </ConversationTaskCompletion>
                                </motion.article>
                              ) : null}
                              {customerProposalStage === "complete" ? (
                                <motion.article
                                  className="conversation-message conversation-message--assistant customer-proposal-handoff-message"
                                  data-message-actions="true"
                                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.08, ease: revealEase }}
                                >
                                  <ConversationTaskCompletion
                                    message="任务已完成。"
                                    suggestions={readOnly ? [] : ["基于这份提案生成客户演示稿", "整理确认款的后续开发清单", "为这份提案生成客户跟进邮件"]}
                                    onSuggestion={readOnly ? undefined : submitCompletionSuggestion}
                                  />
                                </motion.article>
                              ) : null}
                          </motion.div>
                        ) : null}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {additionalMessages.map((message, index) => (
              <ConversationFollowUpExchange {...message} key={`${message.request}-${index}`} />
            ))}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>

        {!readOnly ? <>
        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer
          ariaLabel="继续对话"
          value={followUp}
          onChange={setFollowUp}
          onSubmit={submitFollowUp}
          placeholder={conversationPlaceholder}
          disabled={
            !analysisComplete
            || (scopeFormVisible && !scopeConfirmed)
            || (scopeConfirmed && !trendScanComplete)
          }
          isRunning={customerProposalRunning}
          hint={scopeFormVisible && !scopeConfirmed ? "请先完成调研范围确认" : customerProposalStage === "results" ? "生成提案将扣除 999 积分" : undefined}
          onStop={stopCustomerProposalTask}
          motionDelay={0.16}
          focusRequest={composerFocusRequest}
        />
        </> : null}
      </section>

      <aside className={`task-detail-rail ${detailPanelOpen ? "is-expanded" : "is-collapsed"}`}>
        <TaskDetailPanel
          ariaLabel="任务概览"
          onCollapse={() => setDetailPanelOpen(false)}
          artifacts={
            <>
              {scopeResultStage >= 4 ? (
                <TaskArtifactRow kind="file" onClick={() => openTrendPreview("research")}>
                  客户需求调研与视觉方向.html
                </TaskArtifactRow>
              ) : null}
              {["results", "proposal-generating", "complete"].includes(customerProposalStage) ? (
                <TaskArtifactRow kind="file" onClick={() => openTrendPreview("ai-results")}>
                  AI改款结果（12张）.html
                </TaskArtifactRow>
              ) : null}
              {customerProposalStage === "complete" ? (
                <TaskArtifactRow kind="file" onClick={() => openTrendPreview("proposal")}>
                  正式客户提案.html
                </TaskArtifactRow>
              ) : null}
              {customerProposalStage === "ai-generating" ? (
                <TaskArtifactRow kind="file">正在生成 AI改款结果.html…</TaskArtifactRow>
              ) : null}
              {scopeResultStage < 4 && customerProposalStage === "idle" ? (
                <TaskArtifactRow kind="file">{
                  trendDirectionsConfirmed
                    ? "等待开始 AI 改款…"
                    : scopeConfirmed
                      ? "等待确认视觉方向…"
                      : analysisComplete
                        ? "等待搜集行业资料完成…"
                        : "等待需求解析完成…"
                }</TaskArtifactRow>
              ) : null}
            </>
          }
          referenceTitle="参考款式"
          references={(trendScanComplete ? customerProposalReferenceStyles : []).map((item) => ({
            id: item.id,
            label: item.title,
            href: item.sourceUrl ?? "#",
            thumbnail: item.src,
            meta: item.subtitle,
            date: "2026-08-06",
          }))}
          onReferenceSelect={(reference) => {
            if (reference.id) setReferenceStylePreviewId(reference.id);
          }}
          generatedReferences={(["results", "proposal-generating", "complete"].includes(customerProposalStage) ? allCustomerGeneratedItems : []).map((item) => ({
            id: item.id,
            label: `${item.code} · ${item.title}`,
            href: "#",
            thumbnail: item.src,
            meta: item.subtitle,
            date: item.groupDate.slice(0, 10),
            groupDate: item.groupDate,
          }))}
          generatedTitle="生成款式"
          onGeneratedSelect={(reference) => {
            if (!reference.id) return;
            setAiResultPreviewReadOnly(!displayedCustomerAiResults.some((item) => item.id === reference.id) || customerProposalStage !== "results");
            setAiResultPreviewHideSelection(true);
            setAiResultPreviewId(reference.id);
          }}
        />
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      </aside>

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
                ref={trendPreviewDialogRef}
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
                    <h2 id="trend-preview-title">{
                      trendPreviewKind === "ai-results"
                        ? "AI改款结果（12张）.html"
                        : trendPreviewKind === "proposal"
                          ? "正式客户提案.html"
                          : "客户需求调研与视觉方向.html"
                    }</h2>
                    <span>{t("AI 生成 · 在线预览")}</span>
                  </div>
                  <div className="trend-preview-modal__actions">
                    <DownloadFormatMenu
                      triggerStyle="outline"
                      onSelect={(format) => {
                        const downloadFormat = format.toUpperCase() as TrendDownloadFormat;
                        if (trendPreviewKind === "ai-results" || trendPreviewKind === "proposal") downloadCustomerProposalFile(trendPreviewKind, downloadFormat, selectedTrendIds, trendPreviewKind === "ai-results" ? displayedCustomerAiResults.map((item) => item.id) : selectedAiResultIds, locale, displayedCustomerAiResults);
                        else downloadTrendAnalysis(downloadFormat, locale);
                      }}
                    />
                    <IconControl label={t("关闭在线查看")} variant="bare" size="small" autoFocus onClick={() => setTrendPreviewOpen(false)}>
                      <FigmaIcon name="close" size={20} />
                    </IconControl>
                  </div>
                </header>
                <iframe
                  className="trend-preview-modal__frame"
                  title={trendPreviewKind === "ai-results" ? "AI改款结果在线预览" : trendPreviewKind === "proposal" ? "正式客户提案在线预览" : "客户需求调研与视觉方向在线预览"}
                  srcDoc={translateHtmlCopy(buildTrendReportHtml(
                    trendPreviewKind,
                    selectedTrendIds,
                    trendPreviewKind === "proposal" ? selectedAiResultIds : displayedCustomerAiResults.map((item) => item.id),
                    displayedCustomerAiResults,
                  ), locale)}
                  sandbox="allow-scripts allow-popups"
                  referrerPolicy="no-referrer"
                />
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
      {candidatePreviewId ? (
        <ImageGalleryLightbox
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
      {referenceStylePreviewId ? (
        <ImageGalleryLightbox
          title={t("参考款式")}
          categories={candidateCategories}
          items={customerProposalReferenceStyles}
          activeCategoryId={customerProposalReferenceStyles.find((item) => item.id === referenceStylePreviewId)?.categoryId ?? candidateCategories[0].id}
          activeItemId={referenceStylePreviewId}
          selectedIds={[]}
          selectionDisabled
          referenceActions={{
            onDownload: downloadCustomerAiImage,
            onOpenSource: (item) => {
              if (item.sourceUrl) window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            },
          }}
          hideSelection
          presentation="reference"
          showCategories={false}
          onCategoryChange={() => undefined}
          onNavigate={setReferenceStylePreviewId}
          onToggleSelection={() => undefined}
          onClose={() => setReferenceStylePreviewId(null)}
        />
      ) : null}
      {aiResultPreviewId ? (
        <ImageGalleryLightbox
          title={aiResultPreviewHideSelection ? t("生成款式") : "选择进入正式客户提案的 AI 改款图"}
          categories={candidateCategories}
          items={allCustomerGeneratedItems}
          activeCategoryId={allCustomerGeneratedItems.find((item) => item.id === aiResultPreviewId)?.categoryId ?? candidateCategories[0].id}
          activeItemId={aiResultPreviewId}
          selectedIds={aiResultPreviewReadOnly ? [] : selectedAiResultIds}
          selectionDisabled={aiResultPreviewReadOnly || aiResultsConfirmed || customerProposalStage !== "results" || customerProposalRunning}
          hideSelection={aiResultPreviewHideSelection}
          resultActions={{
            onDownload: downloadCustomerAiImage,
          }}
          presentation={aiResultPreviewHideSelection ? "detail" : "gallery"}
          showCategories={false}
          onCategoryChange={(categoryId) => {
            const firstResult = allCustomerGeneratedItems.find((item) => item.categoryId === categoryId);
            if (firstResult) {
              setAiResultPreviewReadOnly(!displayedCustomerAiResults.some((item) => item.id === firstResult.id));
              setAiResultPreviewId(firstResult.id);
            }
          }}
          onNavigate={(itemId) => {
            setAiResultPreviewReadOnly(!displayedCustomerAiResults.some((item) => item.id === itemId) || customerProposalStage !== "results");
            setAiResultPreviewId(itemId);
          }}
          onToggleSelection={toggleAiResult}
          onClose={() => {
            setAiResultPreviewId(null);
            setAiResultPreviewReadOnly(false);
            setAiResultPreviewHideSelection(false);
          }}
        />
      ) : null}
    </motion.main>
  );
}
