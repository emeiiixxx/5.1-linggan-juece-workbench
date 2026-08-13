import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { Button, QuickReplyButton } from "./Button";
import { DownloadFormatMenu, type DownloadFormat } from "./DownloadFormatMenu";
import {
  ImageGalleryLightbox,
  MasonryImageSelection,
  type ImageGalleryCategory,
  type ImageGalleryItem,
} from "./ImageSelection";
import {
  AnalysisStepIcon,
  ConversationFeed,
  ConversationFileCard,
  ConversationFormTitle,
  ConversationStatusIcon,
  ConversationTaskCompletion,
  ConversationUserMessage,
  TaskArtifactRow,
  TaskDisclosure,
  TaskProgressSummary,
  type ConversationStepStatus,
} from "./ConversationPrimitives";
import { FigmaIcon } from "./FigmaIcon";
import { SelectionCard } from "./SelectionCard";
import { IconControl } from "./IconControl";
import { ResearchScopeForm } from "./ResearchScopeForm";
import { TaskConversationComposer } from "./TaskConversationComposer";
import { getResearchPlatformOptions, getResearchScopeDefaults, researchMarkets, type ResearchMarket } from "../data/researchScope";
import { useI18n } from "../i18n";
import { buildFashionProposalHtml, type FashionProposalPlan, type FashionProposalSource } from "../report/fashionProposalHtml";
import { useModalFocus } from "../hooks/useModalFocus";

type PlanningStage =
  | "analyzing"
  | "brief"
  | "scope"
  | "research"
  | "directions"
  | "structure-planning"
  | "structure"
  | "ai-generating"
  | "results"
  | "plan-generating"
  | "complete";

const revealEase = [0.22, 1, 0.36, 1] as const;
const taskLabels = [
  "需求解析与确认",
  "调研范围对齐",
  "趋势分析与确认",
  "商品结构与 AI 改款",
  "生成新品企划案",
];

const directions = [
  {
    id: "ruffle",
    title: "克制荷叶边实穿化",
    description: "把客户偏好的女性化荷叶边收敛到可穿、易搭配的上衣与连衣裙。",
    recommendation: "建议作为核心方向，匹配 35–50 岁女性、百货日常场景与成熟花卉语言",
    src: "assets/new-product/new-product-direction-01.jpg",
  },
  {
    id: "botanical",
    title: "传承植物印花更新",
    description: "保留品牌花卉识别度，用更大比例、低对比底色和局部纹样更新视觉。",
    recommendation: "建议作为核心方向，匹配品牌资产与 Fall Transition 波段",
    src: "assets/new-product/new-product-direction-04.jpg",
  },
  {
    id: "tailoring",
    title: "柔性套装与轻结构",
    description: "以软肩、宽松直筒与可拆分搭配建立轻商务系列。",
    recommendation: "建议小规模测试，覆盖工作、午餐与周末多场景需求",
    src: "assets/new-product/new-product-direction-05.jpg",
  },
  {
    id: "transition",
    title: "过渡季连衣裙层次",
    description: "用七分袖、柔性腰线和中等长度承接夏末至初秋穿着。",
    recommendation: "建议小规模测试，避免过度年轻或礼服化",
    src: "assets/new-product/new-product-direction-07.jpg",
  },
] as const;

const resultSources = [
  "assets/apparel-design/generation-placeholder-1.png",
  "assets/new-product/new-product-direction-04.jpg",
  "assets/figma-confirmed/candidate-gallery-look-02.png",
  "assets/figma-confirmed/candidate-gallery-look-02.png",
  "assets/figma-confirmed/candidate-gallery-look-01.png",
  "assets/figma-confirmed/candidate-gallery-look-01.png",
  "assets/new-product/new-product-direction-07.jpg",
  "assets/new-product/new-product-direction-05.jpg",
] as const;

const resultDisplayLabels = [
  "C01. TikTok Shop US · USD 20.00",
  "C02 · BELK / 品牌公开站平台",
  "Amazon US · 都市轻通勤层次",
  "TikTok Shop US · 都市轻通勤层次",
  "Amazon US · 柔性系列改款",
  "TikTok Shop US · 柔性系列改款",
  "BELK · 过渡季上衣改款",
  "Amazon US · 过渡季连衣裙改款",
] as const;

const lightboxCategories: readonly ImageGalleryCategory[] = directions.map((direction) => ({
  id: direction.id,
  label: direction.title,
}));

const resultItems: readonly ImageGalleryItem[] = resultSources.map((src, index) => ({
  id: `A${String(index + 1).padStart(2, "0")}`,
  code: `A${String(index + 1).padStart(2, "0")}`,
  title: index < 2 ? "都市轻通勤层次" : index < 4 ? "梦境花园的清晨" : "柔性系列改款",
  categoryId: directions[Math.floor(index / 2)]?.id ?? directions[0].id,
  src,
  subtitle: resultDisplayLabels[index] ?? `AI 改款结果 ${index + 1}`,
  badges: [
    index % 2 === 0 ? "Amazon US" : "TikTok Shop US",
    "2026年8月 / 2027年2月",
    directions[Math.floor(index / 2)]?.title ?? directions[0].title,
  ],
}));

const regeneratedResultSources = [
  "assets/new-product/regenerated-look-01.jpg",
  "assets/new-product/regenerated-look-02.jpg",
  "assets/new-product/regenerated-look-03.jpg",
  "assets/new-product/regenerated-look-04.jpg",
] as const;

const reportSourceCatalog: Record<string, FashionProposalSource> = {
  淘宝: { name: "淘宝", detail: "中国电商公开商品与价格样本", url: "https://www.taobao.com/" },
  京东: { name: "京东", detail: "中国综合零售公开商品样本", url: "https://www.jd.com/" },
  抖音: { name: "抖音", detail: "中国内容与电商公开趋势信号", url: "https://www.douyin.com/" },
  小红书: { name: "小红书", detail: "中国生活方式内容公开样本", url: "https://www.xiaohongshu.com/" },
  微博: { name: "微博", detail: "中国公开社交讨论样本", url: "https://weibo.com/" },
  ZOZOTOWN: { name: "ZOZOTOWN", detail: "日本女装零售供给观察", url: "https://zozo.jp/" },
  RakutenFashion: { name: "Rakuten Fashion", detail: "日本电商供给与品牌分布", url: "https://brandavenue.rakuten.co.jp/" },
  "LINE SHOPPING": { name: "LINE SHOPPING", detail: "日本购物入口公开样本", url: "https://shopping.line.me/" },
  Instagram: { name: "Instagram", detail: "公开视觉内容与互动信号", url: "https://www.instagram.com/" },
  TikTok: { name: "TikTok", detail: "公开短视频内容与互动信号", url: "https://www.tiktok.com/" },
  X: { name: "X", detail: "公开社交讨论与趋势信号", url: "https://x.com/" },
  Amazon: { name: "Amazon", detail: "公开商品、价格与评价样本", url: "https://www.amazon.com/" },
  "TikTok Shop": { name: "TikTok Shop", detail: "公开商品与内容电商样本", url: "https://shop.tiktok.com/us" },
  品牌官网: { name: "BELK", detail: "品牌及零售公开商品样本", url: "https://www.belk.com/" },
  Pinterest: { name: "Pinterest", detail: "公开视觉收藏与趋势信号", url: "https://www.pinterest.com/" },
  Zalando: { name: "Zalando", detail: "欧洲时尚零售公开商品样本", url: "https://www.zalando.com/" },
};

function buildResearchReportHtml(markets: ResearchMarket[], commerce: string[], social: string[]) {
  const platforms = [...new Set([...commerce, ...social])];
  const sources = platforms.map((platform) => reportSourceCatalog[platform]).filter((source): source is FashionProposalSource => Boolean(source));
  return buildFashionProposalHtml({
    kind: "research",
    title: "调研与视觉方向报告",
    deck: "围绕本次新品企划范围整理多来源市场信号，形成四个可执行的视觉方向，并明确证据充分度、数据缺口与下一步验证边界。",
    kicker: "NEW PRODUCT RESEARCH & DIRECTION",
    topbarMeta: `${markets.join(" · ") || "市场待确认"} / Womenswear / 2026.08`,
    directions: directions.map((direction, index) => ({
      id: direction.id,
      title: direction.title,
      description: direction.description,
      recommendation: direction.recommendation,
      signal: index < 2 ? "CORE DIRECTION" : "TEST DIRECTION",
      cue: index === 0 ? "成熟花卉 · 日常实穿" : index === 1 ? "品牌资产 · 印花更新" : index === 2 ? "轻结构 · 多场景" : "过渡季 · 层次搭配",
      imageUrl: assetUrl(direction.src),
    })),
    references: [],
    categoryCount: directions.length,
    directionLabel: `${markets.join("、") || "待确认市场"}；电商：${commerce.join("、") || "未选择"}；社媒：${social.join("、") || "未选择"}`,
    sources,
  });
}

function buildMerchandisingPlan(confirmedDirectionCount: number): FashionProposalPlan {
  return {
    summary: [
      { value: "8", label: "建议开发款数", detail: "稳定款 3、主力款 3、内容测试款 2；款数为系统建议。" },
      { value: String(confirmedDirectionCount || 2), label: "确认视觉方向", detail: "以成熟花卉与克制女性化为核心，轻结构与过渡季层次作为测试。" },
      { value: "USD 10–20", label: "目标价格带", detail: "依据任务输入；供应商报价与毛利结构仍需补充。" },
      { value: "2", label: "上市波段", detail: "2026 年 8 月首发，2027 年 2 月补充验证。" },
    ],
    assortment: [
      { category: "花卉上衣", role: "稳定款", styles: "2 款", price: "USD 10–14", channel: "Amazon US", rationale: "宽松易搭配，承接成熟客群日常需求与搜索型购买。" },
      { category: "荷叶边上衣", role: "主力款", styles: "1 款", price: "USD 14–18", channel: "双渠道", rationale: "控制装饰量，以领口和袖口形成明确但不过度年轻的识别点。" },
      { category: "过渡季连衣裙", role: "主力款", styles: "2 款", price: "USD 18–20", channel: "Amazon US", rationale: "七分袖、中长裙摆与柔性腰线覆盖夏末至初秋场景。" },
      { category: "轻结构套装", role: "测试款", styles: "1 款", price: "USD 20", channel: "TikTok Shop", rationale: "用成套表达和比例对比测试内容传播与连带购买。" },
      { category: "印花内容款", role: "内容测试", styles: "2 款", price: "USD 16–20", channel: "TikTok Shop", rationale: "保留品牌花卉语言，用更大比例与低对比底色增强视频识别。" },
    ],
    designGuidelines: [
      { label: "DROP PLAN", title: "双波段上市", detail: "首波承接 2026 年 8 月夏末至初秋需求，补充波段放在 2027 年 2 月验证跨季延展。", tags: ["2026.08 首发", "2027.02 补充", "波段占比待确认"] },
      { label: "COLOR SYSTEM", title: "成熟花卉低对比色盘", detail: "以陶土橙、雾蓝绿和暖米白为核心，深棕与黑色只用于轮廓收束和渠道测试。", tags: ["陶土橙", "雾蓝绿", "暖米白", "深棕点缀"] },
      { label: "MATERIAL DIRECTION", title: "轻量、柔垂、易护理", detail: "优先验证人棉、粘纤混纺与轻质梭织；荷叶边和抽褶位置需要控制厚度，供应商报价与成分尚待确认。", tags: ["人棉候选", "粘纤混纺", "轻质梭织", "成本待验证"] },
      { label: "SILHOUETTE RULE", title: "宽松直身与柔性腰线", detail: "上衣保持宽松易搭配，连衣裙采用中长裙摆和柔性腰线；内容测试款可增加比例对比，但避免紧身和礼服化。", tags: ["宽松直身", "中长裙摆", "柔性腰线", "克制荷叶边"] },
    ],
    channels: [
      { name: "Amazon US", strategy: "优先稳定、宽松、易搭配的商品表达，以搜索词、尺码信息和多场景穿着降低决策成本。", focus: ["稳定款与主力款", "正面商品图", "尺码与面料信息", "日常场景"] },
      { name: "TikTok Shop US", strategy: "增加轮廓对比、成套搭配和前后变化，用短视频验证款式钩子，不把互动数据直接等同于销量。", focus: ["内容测试款", "比例变化", "成套表达", "视频首帧识别"] },
    ],
    assumptions: [
      "缺少历史销售、退货率与尺码分布，款数和角色占比为系统建议。",
      "缺少 OTB 与毛利目标，价格仅按任务输入形成梯度。",
      "缺少供应商报价、MOQ 与交期，面料和工艺尚未进入成本验证。",
      "AI 款式图用于概念沟通，开款前仍需完成版型、工艺与知识产权复核。",
    ],
  };
}

function AssistantMessage({ children, className = "", actions = true }: { children: ReactNode; className?: string; actions?: boolean }) {
  return (
    <motion.article
      className={`conversation-message conversation-message--assistant new-product-message ${className}`}
      data-message-actions={actions ? "true" : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: revealEase }}
    >
      {children}
    </motion.article>
  );
}

function NewProductLoadingTask({ title, lines, complete = false }: { title: string; lines: string[]; complete?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const controlsId = useId();
  return (
    <TaskDisclosure title={title} expanded={expanded} complete={complete} controlsId={controlsId} onToggle={() => setExpanded((value) => !value)}>
      {lines.map((line, index) => (
        <div key={line}>
          <AnalysisStepIcon complete={complete} delay={index * 0.06} />
          <span>{line}</span>
        </div>
      ))}
    </TaskDisclosure>
  );
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

async function inlineLocalImages(html: string) {
  const documentCopy = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(documentCopy.querySelectorAll("img[src]"));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src");
    if (!source || source.startsWith("data:")) return;
    const resolved = new URL(source, window.location.href);
    if (resolved.origin !== window.location.origin) return;
    try {
      const response = await fetch(resolved.href);
      if (!response.ok) return;
      image.setAttribute("src", await blobToDataUrl(await response.blob()));
    } catch {
      // Keep the original path if a local demo asset cannot be embedded.
    }
  }));
  return `<!doctype html>\n${documentCopy.documentElement.outerHTML}`;
}

async function downloadHtmlFile(name: string, html: string) {
  const content = await inlineLocalImages(html);
  const url = URL.createObjectURL(new Blob([content], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function replaceFileExtension(name: string, extension: DownloadFormat) {
  return `${name.replace(/\.[^.]+$/, "")}.${extension}`;
}

async function downloadReportFile(name: string, description: string, html: string | undefined, format: DownloadFormat) {
  const fallbackHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${name}</title></head><body><h1>${name}</h1><p>${description}</p></body></html>`;
  const content = html ?? fallbackHtml;
  if (format === "html") {
    await downloadHtmlFile(replaceFileExtension(name, "html"), content);
    return;
  }
  if (format === "pdf") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.opener = null;
    const printableHtml = await inlineLocalImages(content);
    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 0);
    return;
  }

  const powerpointHtml = await inlineLocalImages(content);
  const url = URL.createObjectURL(new Blob([powerpointHtml], { type: "application/vnd.ms-powerpoint;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = replaceFileExtension(name, "ppt");
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DownloadableFile({ name, description, html, onPreview }: { name: string; description: string; html?: string; onPreview?: () => void }) {
  return (
    <ConversationFileCard icon="html" name={name} description={description}>
      <button type="button" onClick={onPreview ?? (() => window.alert(`${name} 为只读在线查看版本。`))}>在线查看</button>
      <DownloadFormatMenu onSelect={(format) => downloadReportFile(name, description, html, format)} />
    </ConversationFileCard>
  );
}

export function NewProductPlanningWorkspace({ prompt, profileName, attachments = [], initialState = "default" }: {
  prompt: string;
  profileName?: string;
  attachments?: { name: string; previewUrl?: string }[];
  initialState?: "default" | "complete";
}) {
  const { locale, t } = useI18n();
  const scopeDefaults = getResearchScopeDefaults(profileName, locale);
  const startsComplete = initialState === "complete";
  const [stage, setStage] = useState<PlanningStage>(startsComplete ? "complete" : "analyzing");
  const [analysisExpanded, setAnalysisExpanded] = useState(!startsComplete);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [followUp, setFollowUp] = useState("");
  const [markets, setMarkets] = useState<ResearchMarket[]>(scopeDefaults.markets);
  const [commerce, setCommerce] = useState<string[]>(scopeDefaults.commerce);
  const [social, setSocial] = useState<string[]>(scopeDefaults.social);
  const [otherCommerce, setOtherCommerce] = useState("");
  const [selectedDirections, setSelectedDirections] = useState<string[]>(
    startsComplete ? directions.slice(0, 2).map((direction) => direction.id) : [],
  );
  const [selectedResults, setSelectedResults] = useState<string[]>(
    startsComplete ? resultItems.slice(0, 5).map((item) => item.id) : [],
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activePreviewCategory, setActivePreviewCategory] = useState<string>(directions[0].id);
  const [regenerationPhase, setRegenerationPhase] = useState<"idle" | "queued" | "generating">("idle");
  const [regenerationTargetIds, setRegenerationTargetIds] = useState<string[]>([]);
  const [regeneratedSources, setRegeneratedSources] = useState<Record<string, string>>({});
  const [regenerationRound, setRegenerationRound] = useState(0);
  const [reportPreview, setReportPreview] = useState<{ name: string; html: string } | null>(null);
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const reportPreviewDialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const feedEndRef = useRef<HTMLDivElement>(null);
  useModalFocus(reportPreviewDialogRef, Boolean(reportPreview), () => setReportPreview(null));
  const regenerationBusy = regenerationPhase !== "idle";
  const displayedResultItems = useMemo(
    () => resultItems.map((item) => ({ ...item, src: regeneratedSources[item.id] ?? item.src })),
    [regeneratedSources],
  );

  useEffect(() => {
    if (stage !== "analyzing") return;
    const timer = window.setTimeout(() => {
      setStage("brief");
      setAnalysisExpanded(false);
    }, reduceMotion ? 0 : 1800);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "research") return;
    const timer = window.setTimeout(() => setStage("directions"), reduceMotion ? 0 : 2600);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "structure-planning") return;
    const timer = window.setTimeout(() => setStage("structure"), reduceMotion ? 0 : 2400);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "ai-generating") return;
    const timer = window.setTimeout(() => setStage("results"), reduceMotion ? 0 : 2800);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (stage !== "plan-generating") return;
    const timer = window.setTimeout(() => setStage("complete"), reduceMotion ? 0 : 2400);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, stage]);

  useEffect(() => {
    if (regenerationPhase !== "queued") return;
    const timer = window.setTimeout(() => setRegenerationPhase("generating"), reduceMotion ? 0 : 320);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, regenerationPhase]);

  useEffect(() => {
    if (regenerationPhase !== "generating") return;
    const timer = window.setTimeout(() => {
      setRegeneratedSources((current) => {
        const next = { ...current };
        regenerationTargetIds.forEach((id, index) => {
          next[id] = regeneratedResultSources[(regenerationRound + index) % regeneratedResultSources.length] ?? regeneratedResultSources[0];
        });
        return next;
      });
      setRegenerationPhase("idle");
      setRegenerationTargetIds([]);
      setRegenerationRound((value) => value + 1);
      setSelectedResults([]);
    }, reduceMotion ? 0 : 1700);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, regenerationPhase, regenerationRound, regenerationTargetIds]);

  useEffect(() => {
    if (!reportPreview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [reportPreview]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [reduceMotion, regenerationPhase, regenerationRound, selectedResults.length, stage]);

  const taskStates = useMemo<ConversationStepStatus[]>(() => {
    const order: PlanningStage[] = ["analyzing", "brief", "scope", "research", "directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"];
    const index = order.indexOf(stage);
    return [
      stage === "analyzing" ? "loading" : "complete",
      index < 2 ? "pending" : index < 4 ? "loading" : "complete",
      index < 4 ? "pending" : index === 4 ? "loading" : "complete",
      index < 5 ? "pending" : index < 9 ? "loading" : "complete",
      stage === "complete" ? "complete" : stage === "plan-generating" ? "loading" : "pending",
    ];
  }, [stage]);

  const toggle = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const toggleMarket = (market: ResearchMarket) => {
    const nextMarkets = markets.includes(market)
      ? markets.filter((item) => item !== market)
      : [...markets, market];
    const nextOptions = getResearchPlatformOptions(nextMarkets);
    setMarkets(nextMarkets);
    setCommerce((current) => current.filter((platform) => nextOptions.commerce.includes(platform)));
    setSocial((current) => current.filter((platform) => nextOptions.social.includes(platform)));
  };

  const toggleResult = (id: string) => {
    setSelectedResults((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const startRegeneration = () => {
    if (!selectedResults.length || regenerationBusy) return;
    setRegenerationTargetIds([...selectedResults]);
    setRegenerationPhase("queued");
  };

  const submitFollowUp = () => {
    const value = followUp.trim();
    if (!value) return;
    setFollowUp("");
    if (stage === "brief") setStage("scope");
  };

  const placeholder: Record<PlanningStage, string> = {
    analyzing: "Agent 正在解析新品企划需求，请稍候...",
    brief: "补充条件，或回复“满意，请继续”...",
    scope: "请完成上方调研范围表单，或输入补充条件...",
    research: "Agent 正在完成多来源调研与视觉方向整理...",
    directions: "请在上方选择视觉方向，支持多选...",
    "structure-planning": "Agent 正在调用工具完成商品结构规划...",
    structure: "确认商品结构，或继续补充经营约束...",
    "ai-generating": "Agent 正在生成专业改款提示词与 AI 款式图...",
    results: "选择喜欢的图片，或输入局部修改要求...",
    "plan-generating": "Agent 正在写入新品企划案，请稍候...",
    complete: "任务已完成，可提出修改意见或追加任务...",
  };

  const composerRunning = regenerationBusy || ["analyzing", "research", "structure-planning", "ai-generating", "plan-generating"].includes(stage);
  const selectedDirectionLabels = directions.filter((item) => selectedDirections.includes(item.id)).map((item) => item.title);
  const researchPlatformOptions = getResearchPlatformOptions(markets);
  const researchReportHtml = useMemo(() => buildResearchReportHtml(markets, commerce, social), [commerce, markets, social]);
  const confirmedDirections = useMemo(
    () => directions.filter((direction) => selectedDirections.includes(direction.id)),
    [selectedDirections],
  );
  const confirmedDirectionReportItems = useMemo(
    () => confirmedDirections.map((direction, index) => ({
      id: direction.id,
      title: direction.title,
      description: direction.description,
      recommendation: direction.recommendation,
      signal: index < 2 ? "CONFIRMED CORE" : "CONFIRMED TEST",
      cue: index < 2 ? "核心商品方向" : "小规模验证方向",
      imageUrl: assetUrl(direction.src),
    })),
    [confirmedDirections],
  );
  const merchandisingPlan = useMemo(() => buildMerchandisingPlan(confirmedDirections.length), [confirmedDirections.length]);
  const planSources = useMemo(() => {
    const sourceCandidates = ["Amazon", "TikTok Shop", "品牌官网", ...commerce, ...social]
      .map((platform) => reportSourceCatalog[platform])
      .filter((source): source is FashionProposalSource => Boolean(source));
    return [...new Map(sourceCandidates.map((source) => [source.name, source])).values()];
  }, [commerce, social]);
  const productStructureHtml = useMemo(() => buildFashionProposalHtml({
    kind: "plan",
    title: "商品结构规划",
    deck: "把已确认的视觉方向转换为可讨论的品类组合、款式角色、价格梯度、上市波段与渠道分工，并清楚标注当前数据缺口。",
    kicker: "ASSORTMENT STRUCTURE PLAN",
    topbarMeta: "United States / Womenswear / Fall Transition 2026",
    directions: confirmedDirectionReportItems,
    references: [],
    categoryCount: merchandisingPlan.assortment.length,
    directionLabel: `${confirmedDirections.map((direction) => direction.title).join("、") || "方向待确认"}；渠道：Amazon US、TikTok Shop US`,
    sources: planSources,
    plan: merchandisingPlan,
    evidenceMetrics: [
      { value: "8", label: "建议开发款数" },
      { value: String(confirmedDirections.length), label: "确认视觉方向" },
      { value: String(merchandisingPlan.assortment.length), label: "规划品类" },
    ],
  }), [confirmedDirectionReportItems, confirmedDirections, merchandisingPlan, planSources]);
  const newProductPlanHtml = useMemo(() => {
    const confirmedResults = displayedResultItems.filter((item) => selectedResults.includes(item.id));

    return buildFashionProposalHtml({
      kind: "plan",
      title: "2026 秋季女装新品企划案",
      deck: "面向 Amazon US 与 TikTok Shop US 的过渡季女装方案，以成熟花卉、克制女性化与轻松廓形建立可销售、可传播的系列结构。",
      kicker: "NEW PRODUCT MERCHANDISING PLAN",
      topbarMeta: "United States / Womenswear / Fall Transition 2026",
      directions: confirmedDirectionReportItems,
      references: confirmedResults.map((item) => ({
        code: item.code,
        title: item.subtitle ?? item.title,
        category: directions.find((direction) => direction.id === item.categoryId)?.title ?? item.title,
        imageUrl: assetUrl(item.src),
      })),
      categoryCount: merchandisingPlan.assortment.length,
      directionLabel: `${confirmedDirections.map((direction) => direction.title).join("、") || "方向待确认"}；渠道：Amazon US、TikTok Shop US`,
      sources: planSources,
      plan: merchandisingPlan,
    });
  }, [confirmedDirectionReportItems, confirmedDirections, displayedResultItems, merchandisingPlan, planSources, selectedResults]);

  const stopCurrentTask = () => {
    if (regenerationBusy) {
      setRegenerationPhase("idle");
      setRegenerationTargetIds([]);
    } else if (stage === "research") setStage("scope");
    else if (stage === "structure-planning") setStage("directions");
    else if (stage === "ai-generating") setStage("structure");
    else if (stage === "plan-generating") setStage("results");
    else if (stage === "analyzing") setStage("brief");
  };

  return (
    <motion.main className={`workspace-region workspace-region--conversation new-product-workspace ${detailPanelOpen ? "has-detail-panel" : ""}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="conversation-stage" aria-label="新品企划任务对话">
        <div className="conversation-scroll">
          <ConversationFeed className="new-product-feed">
            <ConversationUserMessage entrance>
              {attachments.length ? (
                <span className="new-product-user-attachments" aria-label="已上传的参考资料">
                  {attachments.map((attachment) => (
                    <span className="new-product-user-attachment" title={attachment.name} key={`${attachment.name}-${attachment.previewUrl ?? "file"}`}>
                      {attachment.previewUrl ? <img src={attachment.previewUrl} alt="" /> : <FigmaIcon name="file" size={16} />}
                      <span>{attachment.name}</span>
                    </span>
                  ))}
                </span>
              ) : null}
              <span>{prompt}</span>
            </ConversationUserMessage>

            <AssistantMessage actions={false}>
              <p>{stage === "analyzing" ? "正在读取需求资料并整理企划边界。" : "已完成需求解析，并保留所有未提供字段为未指定。"}</p>
              <TaskDisclosure title="解析新品企划需求" expanded={analysisExpanded} complete={stage !== "analyzing"} controlsId="new-product-analysis" onToggle={() => setAnalysisExpanded((value) => !value)}>
                {["读取本次文字、图片和文档", "读取已应用的业务偏好档案", "识别品类、人群、价格、渠道、波段与排除条件", "记录缺失信息，不补造未提供内容"].map((line, index) => <div key={line}><AnalysisStepIcon complete={stage !== "analyzing"} delay={index * 0.06} /><span>{line}</span></div>)}
              </TaskDisclosure>
            </AssistantMessage>

            {stage !== "analyzing" ? (
              <AssistantMessage className="new-product-brief">
                <p><strong>我已整理本次新品企划需求：</strong></p>
                <p>品类：连衣裙、裤装、上衣、套装、卫衣；目标人群：Amazon 30 岁以上，TikTok Shop 20–35 岁初入职场。</p>
                <p>价格段：USD 10–20；市场与渠道：美国，Amazon US、TikTok Shop US。</p>
                <p>波段：2026 年 8 月、2027 年 2 月；计划款数：未指定，将在商品结构中给出待确认建议。</p>
                <p>排除条件：过度年轻/辣妹风、皮衣、瑜伽、牛仔、外套、皮草、棉服。</p>
                <p>资料缺口：无历史销售、旧企划、OTB 预算和真实供应商报价。缺失内容不会补造。</p>
                {stage === "brief" ? (
                  <div className="new-product-quick-replies">
                    <Button variant="outline" size="small" onClick={() => setComposerFocusRequest((request) => request + 1)}>补充条件</Button>
                    <QuickReplyButton onClick={() => setStage("scope")}>满意，请继续</QuickReplyButton>
                  </div>
                ) : null}
              </AssistantMessage>
            ) : null}

            {["scope", "research", "directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <>
                <ConversationUserMessage>满意，请继续</ConversationUserMessage>
                <AssistantMessage>
                  <p>需求摘要已确认。请确认地区，以及本次实际需要研究的平台和网站。趋势资料库固定启用；不同平台的数据会分别保留，不合并成单一销量、销售额或热度。</p>
                  <p>请选择主要市场、电商平台和社交媒体。</p>
                  <ResearchScopeForm
                    confirmed={stage !== "scope"}
                    profileLinked={Boolean(profileName)}
                    markets={researchMarkets}
                    selectedMarkets={markets}
                    commerceOptions={researchPlatformOptions.commerce}
                    selectedCommerce={commerce}
                    socialOptions={researchPlatformOptions.social}
                    selectedSocial={social}
                    otherCommerce={otherCommerce}
                    canSubmit={Boolean(markets.length && commerce.length && social.length)}
                    onToggleMarket={(value) => toggleMarket(value as ResearchMarket)}
                    onToggleCommerce={(value) => toggle(value, setCommerce)}
                    onToggleSocial={(value) => toggle(value, setSocial)}
                    onOtherCommerceChange={setOtherCommerce}
                    onConfirm={() => setStage("research")}
                  />
                </AssistantMessage>
              </>
            ) : null}

            {["research", "directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage actions={false}>
                <p>调研范围已确认，正在自动完成多来源调研与视觉方向整理。</p>
                <NewProductLoadingTask
                  title="调研与证据整理"
                  complete={stage !== "research"}
                  lines={["解析范围并生成本地语言关键词与排除词", "采集电商、社媒、品牌/独立站和趋势资料", "标准化证据并过滤错误市场、人群和品类", "验证趋势、竞争与企业适配，整理参考商品素材"]}
                />
              </AssistantMessage>
            ) : null}

            {["directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage>
                <p>调研已完成。当前证据更支持“克制荷叶边实穿化”和“传承植物印花更新”作为核心方向；社媒互动不等于销量，不同平台的数值未合并。</p>
                <DownloadableFile
                  name="调研与视觉方向报告.html"
                  description="刚刚 · 4 个待确认方向 · 分来源展示证据充分度与数据缺口"
                  html={researchReportHtml}
                  onPreview={() => setReportPreview({ name: "调研与视觉方向报告.html", html: researchReportHtml })}
                />
                <section className={`new-product-direction-form ${stage !== "directions" ? "is-confirmed" : ""}`}>
                  <ConversationFormTitle
                    title={t("选择本次企划采用的视觉方向")}
                    helper={t("支持多选，方向确认后才进入商品结构和 AI 改款。")}
                    status={stage === "directions" ? "pending" : "confirmed"}
                    statusLabel={t(stage === "directions" ? "待确认" : "已确认")}
                  />
                  <div className="new-product-direction-grid">
                    {directions.map((direction) => {
                      const selected = selectedDirections.includes(direction.id);
                      return (
                        <SelectionCard
                          mode="checkbox"
                          selected={selected}
                          disabled={stage !== "directions"}
                          image={{ src: assetUrl(direction.src) }}
                          title={direction.title}
                          description={direction.description}
                          supporting={direction.recommendation}
                          onSelect={() => toggle(direction.id, setSelectedDirections)}
                          key={direction.id}
                        />
                      );
                    })}
                  </div>
                  {stage === "directions" ? <div className="new-product-form-actions"><Button variant="primary" size="small" disabled={!selectedDirections.length} onClick={() => setStage("structure-planning")}>确认并继续</Button></div> : null}
                </section>
              </AssistantMessage>
            ) : null}

            {["structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage)
              ? <ConversationUserMessage>{selectedDirectionLabels.join("、")}</ConversationUserMessage>
              : null}

            {["structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage actions={false}>
                <p>{stage === "structure-planning" ? "视觉方向已确认，正在自动完成商品结构规划。" : "视觉方向已确认，商品结构规划已完成。"}</p>
                <NewProductLoadingTask
                  title="商品结构规划"
                  complete={stage !== "structure-planning"}
                  lines={["将确认方向转换为品类、款数与款式角色假设", "按 Amazon 与 TikTok Shop 客群规划稳定款、主力款和测试款", "整理价格、波段、色彩、面料、廓形及渠道差异", "标记缺少历史销售、OTB 与供应商报价的待确认假设"]}
                />
              </AssistantMessage>
            ) : null}

            {["structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage>
                <p>已按你确认的 {selectedDirections.length} 个方向完成商品结构规划。Amazon 以宽松、易搭配的稳定款和主力款为主；TikTok Shop 增加比例对比与成套表达测试。无历史销售和 OTB，因此款数、占比与价格梯度均标记为“系统建议 / 待确认假设”。</p>
                <DownloadableFile
                  name="商品结构规划.html"
                  description="刚刚 · 品类、款数、价格、波段、色彩、面料、廓形及渠道差异"
                  html={productStructureHtml}
                  onPreview={() => setReportPreview({ name: "商品结构规划.html", html: productStructureHtml })}
                />
                {stage === "structure" ? (
                  <div className="conversation-quick-action">
                    <Button variant="primary" size="small" onClick={() => setStage("ai-generating")}>继续生成 AI 改款 <FigmaIcon name="arrow-right" size={16} /></Button>
                  </div>
                ) : null}
              </AssistantMessage>
            ) : null}

            {["ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage actions={false}>
                <p>商品结构已确认，正在生成专业改款提示词与 AI 款式图。</p>
                <NewProductLoadingTask
                  title="AI 改款生成"
                  complete={stage !== "ai-generating"}
                  lines={["将视觉方向、参考商品和商品结构转成逐款设计约束", "生成正向与负向提示词、锚点引用和系列一致性要求", "完成服装属性完整性检查后生成图片", "检查空白图、明显重复和与目标人群不符的结果"]}
                />
              </AssistantMessage>
            ) : null}

            {["results", "plan-generating", "complete"].includes(stage) ? (
              <AssistantMessage actions={false}>
                <p>8 张 AI 改款图已生成。它们继承已确认视觉方向、参考商品特征和商品结构，并按渠道客群区分廓形与表达。</p>
                <DownloadableFile name="AI 改款结果.html" description="刚刚 · 专业服装提示词已通过完整性检查 · AI 概念表达" />
                <p>{t("请从改款结果中，选择你喜欢的图片")}</p>
                <section className="new-product-results-form">
                  <ConversationFormTitle
                    title={t("选择新品企划案的 AI 改款图")}
                    helper={t("选择你满意的图片。你可以基于所选图片重新生成更多方案，或直接将其用于生成新品企划。")}
                    status={stage === "results" ? "pending" : "confirmed"}
                    statusLabel={t(stage === "results" ? "待确认" : "已确认")}
                  />
                  <div className="new-product-results-grid">
                    {displayedResultItems.map((item) => (
                      <MasonryImageSelection
                        key={item.id}
                        src={assetUrl(item.src)}
                        alt={`${item.code} ${item.title}`}
                        label={item.subtitle ?? item.title}
                        selected={selectedResults.includes(item.id)}
                        disabled={regenerationBusy || stage !== "results"}
                        loading={regenerationPhase === "generating" && regenerationTargetIds.includes(item.id)}
                        loadingLabel={t("生成中...")}
                        onSelect={() => toggleResult(item.id)}
                        onPreview={() => { setPreviewId(item.id); setActivePreviewCategory(item.categoryId); }}
                      />
                    ))}
                  </div>
                  <div className="new-product-results-actions">
                    <span>{t("已选择")} <strong>{selectedResults.length}</strong> {t("张图片")}</span>
                    {stage === "results" ? (
                      <>
                        <Button className="new-product-regenerate-button" disabled={!selectedResults.length || regenerationBusy} onClick={startRegeneration}>
                          <FigmaIcon name="regenerate-image" size={16} />
                          {t(regenerationBusy ? "重新生成中" : "重新生成")}
                        </Button>
                        <Button variant="primary" disabled={!selectedResults.length || regenerationBusy} onClick={() => setStage("plan-generating")}>{t("生成企划")}</Button>
                      </>
                    ) : null}
                  </div>
                </section>
              </AssistantMessage>
            ) : null}

            {regenerationBusy ? (
              <>
                <ConversationUserMessage>重新生成{regenerationTargetIds.join("、")}</ConversationUserMessage>
                <AssistantMessage actions={false}><p>立即为你重新生成所选图片，其他图片保持不变。</p></AssistantMessage>
              </>
            ) : null}

            {regenerationRound > 0 && !regenerationBusy && stage === "results" ? (
              <AssistantMessage actions={false}><p>已完成局部重新生成，继续在上方表单选择你满意的图片。</p></AssistantMessage>
            ) : null}

            {["plan-generating", "complete"].includes(stage) ? (
              <>
                <ConversationUserMessage>{selectedResults.join("、")}</ConversationUserMessage>
                <AssistantMessage actions={false}>
                  <p>正在将已确认图片、调研依据、视觉方向和商品结构写入新品企划案。</p>
                  <NewProductLoadingTask title="生成新品企划案" complete={stage === "complete"} lines={["锁定用户确认的 AI 款式图", "关联调研证据、视觉方向与商品结构", "生成统一只读 HTML 查看版本", "准备 HTML、PPT、PDF 下载文件"]} />
                </AssistantMessage>
              </>
            ) : null}

            {stage === "complete" ? (
              <AssistantMessage>
                <ConversationTaskCompletion
                  message={<>新品企划案已完成，已写入 {selectedResults.length} 张你确认的 AI 款式图，并保留调研依据、视觉方向和商品结构。所有内容只读；需要修改时系统会生成新版本并只重跑受影响步骤。</>}
                  suggestions={["推荐后续：分析可持续丹宁面料", "基于这份报告制作客户提案"]}
                >
                  <DownloadableFile
                    name="新品企划案.html"
                    description="刚刚 · 商品结构、渠道策略、确认方向与 AI 款式图 · 只读演示版"
                    html={newProductPlanHtml}
                    onPreview={() => setReportPreview({ name: "新品企划案.html", html: newProductPlanHtml })}
                  />
                </ConversationTaskCompletion>
              </AssistantMessage>
            ) : null}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>

        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer ariaLabel="继续新品企划对话" value={followUp} onChange={setFollowUp} onSubmit={submitFollowUp} placeholder={placeholder[stage]} isRunning={composerRunning} onStop={stopCurrentTask} motionDelay={0.25} focusRequest={composerFocusRequest} />
      </section>

      <aside className={`task-detail-rail ${detailPanelOpen ? "is-expanded" : "is-collapsed"}`}>
        <div className="task-detail-panel" aria-label="新品企划任务概览">
          <header><strong>概览</strong><button type="button" onClick={() => setDetailPanelOpen(false)} aria-label="收起概览"><FigmaIcon name="expand-window" size={20} /></button></header>
          <section>
            <h2 className="task-progress-heading">任务进展</h2>
            <TaskProgressSummary labels={taskLabels} states={taskStates} completeLabel="新品企划案已生成" />
          </section>
          <section>
            <h2>任务产物</h2>
            <TaskArtifactRow kind="file">{stage === "complete" ? "新品企划案.html" : "正在生成新品企划产物…"}</TaskArtifactRow>
          </section>
          <section><h2>参考信息</h2><p className="new-product-reference-copy">电商、社媒、品牌公开站与趋势资料按来源保留，不合并为虚构销量。</p></section>
        </div>
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      </aside>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {reportPreview ? (
            <motion.div
              className="trend-preview-backdrop"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}
            >
              <motion.section
                ref={reportPreviewDialogRef}
                className="trend-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-product-report-preview-title"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: revealEase }}
              >
                <header className="trend-preview-modal__header">
                  <div>
                    <h2 id="new-product-report-preview-title">{reportPreview.name}</h2>
                    <span>{t("AI 生成 · 在线预览")}</span>
                  </div>
                  <div className="trend-preview-modal__actions">
                    <DownloadFormatMenu
                      triggerStyle="outline"
                      onSelect={(format) => downloadReportFile(reportPreview.name, "AI 生成 · 在线预览", reportPreview.html, format)}
                    />
                    <IconControl label={t("关闭在线查看")} variant="bare" size="small" autoFocus onClick={() => setReportPreview(null)}>
                      <FigmaIcon name="close" size={20} />
                    </IconControl>
                  </div>
                </header>
                <iframe className="trend-preview-modal__frame" title={`${reportPreview.name}${t("在线查看")}`} srcDoc={reportPreview.html} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer" />
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      {previewId ? (
        <ImageGalleryLightbox
          categories={lightboxCategories}
          items={displayedResultItems}
          activeCategoryId={activePreviewCategory}
          activeItemId={previewId}
          selectedIds={selectedResults}
          selectionDisabled={stage !== "results" || regenerationBusy}
          showCategories={false}
          onCategoryChange={(categoryId) => {
            setActivePreviewCategory(categoryId);
            const first = displayedResultItems.find((item) => item.categoryId === categoryId);
            if (first) setPreviewId(first.id);
          }}
          onNavigate={setPreviewId}
          onToggleSelection={toggleResult}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </motion.main>
  );
}
