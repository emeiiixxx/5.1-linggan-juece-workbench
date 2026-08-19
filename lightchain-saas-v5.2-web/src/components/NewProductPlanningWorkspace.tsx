import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { BusinessButton, Button, QuickReplyButton } from "./Button";
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
  ConversationFollowUpExchange,
  ConversationFormTitle,
  ConversationStatusIcon,
  ConversationTaskCompletion,
  ConversationUserMessage,
  ImageSelectionActions,
  SelectAllControl,
  TaskArtifactRow,
  TaskDetailPanel,
  TaskDisclosure,
} from "./ConversationPrimitives";
import { FigmaIcon } from "./FigmaIcon";
import { SelectionCard } from "./SelectionCard";
import { IconControl } from "./IconControl";
import { ResearchScopeForm } from "./ResearchScopeForm";
import { TaskConversationComposer, type TaskConversationAttachment } from "./TaskConversationComposer";
import { ConversationUserAttachments } from "./ConversationUserAttachments";
import { getResearchPlatformOptions, getResearchScopeDefaults, researchMarkets, type ResearchMarket } from "../data/researchScope";
import { translateHtmlCopy, useI18n } from "../i18n";
import { buildFashionProposalHtml, type FashionProposalPlan, type FashionProposalSource } from "../report/fashionProposalHtml";
import { buildNewProductPlanHtml } from "../report/newProductPlanHtml";
import { useModalFocus } from "../hooks/useModalFocus";
import { extractPromptContext, getPromptExclusions } from "../utils/promptContext";
import { buildConditionAcknowledgement } from "../utils/taskAcknowledgement";
import { scrollWithinConversation } from "../utils/conversationScroll";

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

type ExceptionDemoStage = "ready" | "network" | "reconnecting" | "parse-failed" | "retrying" | "credits";

const revealEase = [0.22, 1, 0.36, 1] as const;
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

const directionReferenceEvidence = {
  ruffle: {
    subtitle: "Google Trends · 2027年2月 · 趋势资料",
    badges: ["Google Trends", "过渡季", "荷叶边实穿化"],
    sourceUrl: "https://trends.google.com/trends/explore?cat=68&geo=US",
  },
  botanical: {
    subtitle: "TikTok Creative Center · 2027年2月 · 社媒资料",
    badges: ["TikTok", "社媒趋势", "植物印花"],
    sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
  },
  tailoring: {
    subtitle: "BELK · 2026年8月 · 品牌与零售资料",
    badges: ["BELK", "轻结构", "通勤套装"],
    sourceUrl: "https://www.belk.com/women/womens-clothing/",
  },
  transition: {
    subtitle: "Amazon US · 2026年8月 · 商品资料",
    badges: ["Amazon US", "过渡季", "连衣裙层次"],
    sourceUrl: "https://www.amazon.com/Best-Sellers-Womens-Fashion/zgbs/fashion/7147440011",
  },
} as const;

const newProductReferenceSources = [
  "assets/new-product/new-product-direction-01.jpg",
  "assets/new-product/new-product-direction-04.jpg",
  "assets/new-product/new-product-direction-05-optimized.jpg",
  "assets/new-product/new-product-direction-07.jpg",
  "assets/new-product/regenerated-look-01.jpg",
  "assets/new-product/regenerated-look-02-optimized.jpg",
  "assets/new-product/regenerated-look-03-optimized.jpg",
  "assets/new-product/regenerated-look-04-optimized.jpg",
  "assets/figma-confirmed/candidate-gallery-look-01-optimized.jpg",
  "assets/figma-confirmed/candidate-gallery-look-02-optimized.jpg",
  "assets/figma-confirmed/candidate-reference-02-optimized.jpg",
  "assets/figma-confirmed/trend-direction-thumbnail-optimized.jpg",
  "assets/figma-confirmed/trend-reference-primary-optimized.jpg",
  "assets/plan-flow/reference-01-optimized.jpg",
  "assets/plan-flow/reference-02.jpg",
  "assets/plan-flow/reference-03.jpg",
  "assets/plan-flow/reference-04-optimized.jpg",
  "assets/plan-flow/reference-05.jpg",
  "assets/plan-flow/reference-06.jpg",
  "assets/plan-flow/reference-07.jpg",
] as const;

const newProductReferenceLabels = [
  "柔和领口层次",
  "低对比植物印花",
  "松弛直身比例",
  "过渡季七分袖",
  "轻盈荷叶边",
  "雾感花卉组合",
  "日常通勤叠搭",
  "柔性腰线",
  "轻结构上装",
  "成熟花型更新",
  "自然垂坠轮廓",
  "短视频首帧造型",
  "低饱和配色",
  "宽松套装组合",
  "小体量装饰细节",
  "中长比例造型",
  "柔软肩线",
  "夏末层次搭配",
  "初秋轻外搭",
  "系列化陈列组合",
] as const;

const newProductReferenceItems: readonly ImageGalleryItem[] = newProductReferenceSources.map((src, index) => {
  const direction = directions[index % directions.length];
  const evidence = directionReferenceEvidence[direction.id];
  return {
    id: `new-product-reference-${String(index + 1).padStart(2, "0")}`,
    categoryId: direction.id,
    code: `REF ${String(index + 1).padStart(2, "0")}`,
    title: `${direction.title} · ${newProductReferenceLabels[index]}`,
    subtitle: evidence.subtitle,
    src,
    badges: [...evidence.badges],
    sourceUrl: evidence.sourceUrl,
    detailLines: [
      "趋势资料 · 2027年2月",
      `匹配理由：${evidence.subtitle}`,
      "获取时间：2026-08-06",
    ],
  };
});

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

type GeneratedResultBatch = {
  id: string;
  createdAt: string;
  items: ImageGalleryItem[];
};

type AdditionalMessage = {
  id: string;
  request: string;
  attachments: TaskConversationAttachment[];
  response: string;
  resultBatchId?: string;
  resultGeneration?: boolean;
  isGenerating?: boolean;
};

type PendingResultGeneration = {
  messageId: string;
  round: number;
  sourceBatchId: string;
  selectedItemIds: string[];
  selectedItemLabels: string[];
};

const initialResultBatch: GeneratedResultBatch = {
  id: "initial-results",
  createdAt: "2026-08-18 16:33",
  items: [...resultItems],
};

function formatGenerationTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}

function createResultBatch(round: number, sourceItems: readonly ImageGalleryItem[], selectedItemIds: readonly string[]): GeneratedResultBatch {
  const selectedIdSet = new Set(selectedItemIds);
  const regenerateAll = selectedIdSet.size === 0;
  return {
    id: `result-batch-${round}`,
    createdAt: formatGenerationTime(),
    items: sourceItems.map((item, index) => {
      const shouldRegenerate = regenerateAll || selectedIdSet.has(item.id);
      const baseSubtitle = (item.subtitle ?? item.title).replace(/ · 修改版$/, "");
      return {
        ...item,
        id: `B${round}-${String(index + 1).padStart(2, "0")}`,
        src: shouldRegenerate
          ? regeneratedResultSources[(round + index - 1) % regeneratedResultSources.length] ?? item.src
          : item.src,
        subtitle: shouldRegenerate ? `${baseSubtitle} · 修改版` : item.subtitle,
      };
    }),
  };
}

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

function NewProductExceptionAnalysisTask({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const controlsId = useId();

  return (
    <div className="new-product-exception-analysis">
      <TaskDisclosure
        title="解析新品企划需求"
        expanded={expanded}
        complete={false}
        status={failed ? "error" : "loading"}
        controlsId={controlsId}
        onToggle={() => setExpanded((value) => !value)}
      >
        <div className="new-product-exception-step is-complete">
          <span className="new-product-exception-step__icon"><FigmaIcon name="dot" size={16} /></span>
          <span>读取业务偏好档案 — 完成</span>
        </div>
        <p>已读取并理解业务偏好档案内容。</p>
        <div className="new-product-exception-step is-complete">
          <span className="new-product-exception-step__icon"><FigmaIcon name="dot" size={16} /></span>
          <span>解析客户资料与首轮描述 — 完成</span>
        </div>
        <p>已保留本次文字、图片、文档与新品企划约束。</p>
        <div className={`new-product-exception-step ${failed ? "is-error" : "is-loading"}`}>
          <span className="new-product-exception-step__icon">
            {failed
              ? <FigmaIcon name="info-circle" size={16} />
              : <img className="conversation-analysis-spinner" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />}
          </span>
          <span>{failed ? "解析失败 — 连接超时" : "正在继续解析新品企划约束..."}</span>
          {failed ? <Button className="new-product-exception-retry" variant="ghost" size="small" onClick={onRetry}>重试</Button> : null}
        </div>
      </TaskDisclosure>
    </div>
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
  const { locale, t } = useI18n();
  const localizedName = t(name);
  const localizedDescription = t(description);
  const localizedHtml = html ? translateHtmlCopy(html, locale) : html;
  return (
    <ConversationFileCard icon="html" name={localizedName} description={localizedDescription}>
      <button type="button" onClick={onPreview ?? (() => window.alert(`${localizedName} ${t("为只读在线查看版本。")}`))}>{t("在线查看")}</button>
      <DownloadFormatMenu onSelect={(format) => downloadReportFile(localizedName, localizedDescription, localizedHtml, format)} />
    </ConversationFileCard>
  );
}

export function NewProductPlanningWorkspace({ prompt, profileName, attachments = [], initialState = "default", onTaskProgress, onTaskComplete }: {
  prompt: string;
  profileName?: string;
  attachments?: { name: string; previewUrl?: string }[];
  initialState?: "default" | "confirmation" | "complete" | "exception";
  onTaskProgress?: () => void;
  onTaskComplete?: () => void;
}) {
  const { locale, t } = useI18n();
  const scopeDefaults = getResearchScopeDefaults(profileName, locale, prompt);
  const promptContext = useMemo(() => extractPromptContext(prompt), [prompt]);
  const promptExclusions = useMemo(() => getPromptExclusions(prompt), [prompt]);
  const briefCategory = promptContext.garments?.join("、") || "未指定";
  const briefAudience = promptContext.audience ?? "未指定";
  const briefMarket = promptContext.market ?? "未指定";
  const briefSeason = promptContext.season ?? "未指定";
  const briefChannels = scopeDefaults.commerce.length ? scopeDefaults.commerce.join("、") : "未指定";
  const startsComplete = initialState === "complete";
  const exceptionDemo = initialState === "exception";
  const startsAtConfirmation = initialState === "confirmation" || exceptionDemo;
  const completionReportedRef = useRef(startsComplete);
  const detailAutoOpenedRef = useRef(startsComplete);
  const [stage, setStage] = useState<PlanningStage>(startsComplete ? "complete" : startsAtConfirmation ? "brief" : "analyzing");
  const [exceptionDemoStage, setExceptionDemoStage] = useState<ExceptionDemoStage>("ready");
  const [exceptionCreditsResolved, setExceptionCreditsResolved] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(!startsComplete && !startsAtConfirmation);
  const [detailPanelOpen, setDetailPanelOpen] = useState(startsComplete);
  const [followUp, setFollowUp] = useState("");
  const [planEntryMessage, setPlanEntryMessage] = useState("");
  const [planEntryAttachments, setPlanEntryAttachments] = useState<TaskConversationAttachment[]>([]);
  const [briefEntryMessage, setBriefEntryMessage] = useState("满意，请继续");
  const [briefEntryAttachments, setBriefEntryAttachments] = useState<TaskConversationAttachment[]>([]);
  const briefAcknowledgement = buildConditionAcknowledgement({
    message: briefEntryMessage,
    attachments: briefEntryAttachments,
    ignoredMessages: ["满意，请继续"],
  });
  const [additionalMessages, setAdditionalMessages] = useState<AdditionalMessage[]>([]);
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
  const [resultBatches, setResultBatches] = useState<GeneratedResultBatch[]>([initialResultBatch]);
  const [pendingResultGeneration, setPendingResultGeneration] = useState<PendingResultGeneration | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [referencePreviewId, setReferencePreviewId] = useState<string | null>(null);
  const [previewReadOnly, setPreviewReadOnly] = useState(false);
  const [previewHideSelection, setPreviewHideSelection] = useState(false);
  const [activePreviewCategory, setActivePreviewCategory] = useState<string>(directions[0].id);
  const [reportPreview, setReportPreview] = useState<{ name: string; html: string } | null>(null);
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const reportPreviewDialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const feedEndRef = useRef<HTMLDivElement>(null);
  useModalFocus(reportPreviewDialogRef, Boolean(reportPreview), () => setReportPreview(null));
  const displayedResultItems = useMemo(
    () => resultBatches[resultBatches.length - 1]?.items ?? [...resultItems],
    [resultBatches],
  );
  const allGeneratedResultItems = useMemo(
    () => [...resultBatches].reverse().flatMap((batch) => batch.items.map((item) => ({ ...item, groupDate: batch.createdAt }))),
    [resultBatches],
  );
  const selectedResultSummary = useMemo(
    () => displayedResultItems
      .filter((item) => selectedResults.includes(item.id))
      .map((item) => `${item.code}·${item.title}`)
      .join("、"),
    [displayedResultItems, selectedResults],
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
    if (!exceptionDemo || exceptionDemoStage !== "reconnecting") return;
    const timer = window.setTimeout(() => setExceptionDemoStage("parse-failed"), reduceMotion ? 600 : 2200);
    return () => window.clearTimeout(timer);
  }, [exceptionDemo, exceptionDemoStage, reduceMotion]);

  useEffect(() => {
    if (!exceptionDemo || exceptionDemoStage !== "retrying") return;
    const timer = window.setTimeout(() => {
      setExceptionDemoStage("ready");
      setStage("scope");
    }, reduceMotion ? 600 : 2200);
    return () => window.clearTimeout(timer);
  }, [exceptionDemo, exceptionDemoStage, reduceMotion]);

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
    if (!pendingResultGeneration) return;
    const timer = window.setTimeout(() => {
      const sourceBatch = resultBatches.find((batch) => batch.id === pendingResultGeneration.sourceBatchId)
        ?? resultBatches[resultBatches.length - 1]
        ?? initialResultBatch;
      const nextBatch = createResultBatch(
        pendingResultGeneration.round,
        sourceBatch.items,
        pendingResultGeneration.selectedItemIds,
      );
      const modifiedCount = pendingResultGeneration.selectedItemIds.length || nextBatch.items.length;
      const retainedCount = Math.max(0, nextBatch.items.length - modifiedCount);
      const modifiedLabels = pendingResultGeneration.selectedItemLabels.join("、");
      setResultBatches((current) => [...current, nextBatch]);
      setAdditionalMessages((current) => current.map((message) => message.id === pendingResultGeneration.messageId
        ? {
            ...message,
            response: pendingResultGeneration.selectedItemIds.length
              ? `已完成 ${modifiedLabels} 的修改，并与 ${retainedCount} 张未提出修改意见的图片合并为新的 ${nextBatch.items.length} 张候选。旧版本和本组图片均已保留在右侧“生成款式”中，并按生成时间分组。请从下面的新表单重新选择。`
              : `已根据你的反馈生成 ${nextBatch.items.length} 张新的 AI 改款图。上一组和本组图片都已保留在右侧“生成款式”中，并按生成时间分组。请从下面的新表单继续选择，或输入新的修改要求。`,
            resultBatchId: nextBatch.id,
            isGenerating: false,
          }
        : message));
      setSelectedResults([]);
      setPendingResultGeneration(null);
    }, reduceMotion ? 600 : 2200);
    return () => window.clearTimeout(timer);
  }, [pendingResultGeneration, reduceMotion, resultBatches]);

  useEffect(() => {
    if (stage !== "complete" || completionReportedRef.current) return;
    completionReportedRef.current = true;
    onTaskComplete?.();
  }, [onTaskComplete, stage]);

  useEffect(() => {
    if (!reportPreview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [reportPreview]);

  useEffect(() => {
    scrollWithinConversation(feedEndRef.current, { behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [additionalMessages.length, exceptionDemoStage, reduceMotion, resultBatches.length, selectedResults.length, stage]);

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

  const updateResultSelection = (next: string[]) => {
    setSelectedResults(next);
    setFollowUp(displayedResultItems
      .filter((item) => next.includes(item.id))
      .map((item) => `${item.code}·${item.title}`)
      .join("、"));
  };

  const toggleResult = (id: string) => {
    const next = selectedResults.includes(id)
      ? selectedResults.filter((item) => item !== id)
      : [...selectedResults, id];
    updateResultSelection(next);
  };

  const toggleAllResults = () => {
    updateResultSelection(selectedResults.length === displayedResultItems.length ? [] : displayedResultItems.map((item) => item.id));
  };

  const downloadGalleryItem = (item: ImageGalleryItem) => {
    const source = assetUrl(item.src);
    const extension = source.split("?")[0]?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg";
    const link = document.createElement("a");
    link.href = source;
    link.download = `${item.code}.${extension}`;
    link.click();
  };

  const continueToAiGeneration = () => {
    setStage("ai-generating");
  };

  const continueToPlanFromSelection = (
    message = followUp.trim(),
    submittedAttachments: TaskConversationAttachment[] = [],
    reportProgress = true,
  ) => {
    if (!selectedResults.length) return;
    if (reportProgress) onTaskProgress?.();
    setPlanEntryMessage(message || selectedResultSummary);
    setPlanEntryAttachments(submittedAttachments);
    setFollowUp("");
    setStage("plan-generating");
  };

  const continueFromBrief = (
    message = "满意，请继续",
    submittedAttachments: TaskConversationAttachment[] = [],
    reportProgress = true,
  ) => {
    if (reportProgress) onTaskProgress?.();
    setBriefEntryMessage(message);
    setBriefEntryAttachments(submittedAttachments);
    setFollowUp("");
    if (exceptionDemo) {
      setExceptionDemoStage("network");
      return;
    }
    setStage("scope");
  };

  const submitFollowUp = (submittedAttachments: TaskConversationAttachment[]) => {
    const value = followUp.trim();
    if (!value && !submittedAttachments.length) return;
    onTaskProgress?.();
    setFollowUp("");
    if (stage === "brief") {
      continueFromBrief(value, submittedAttachments, false);
      return;
    }
    const normalizedValue = value.toLocaleLowerCase().replace(/[\s，。！!、]/g, "");
    const confirmsStructure = [
      "继续",
      "继续生成",
      "继续生成ai改款",
      "确认继续",
      "确认并继续",
    ].includes(normalizedValue);
    if (stage === "structure" && !submittedAttachments.length && confirmsStructure) {
      continueToAiGeneration();
      return;
    }
    if (stage === "results") {
      if (selectedResults.length) {
        const normalizedSelectionSummary = selectedResultSummary.toLocaleLowerCase().replace(/[\s，。！!、]/g, "");
        const selectionPrefixRemoved = value.startsWith(selectedResultSummary)
          ? value.slice(selectedResultSummary.length).trim().replace(/^[，。！!、:：；;]+/, "").trim()
          : value;
        const normalizedSelectionFollowUp = selectionPrefixRemoved.toLocaleLowerCase().replace(/[\s，。！!、]/g, "");
        const confirmsSelection = !submittedAttachments.length && (
          !normalizedSelectionFollowUp
          || normalizedSelectionFollowUp === normalizedSelectionSummary
          || ["生成企划", "确认生成企划", "确认", "继续"].includes(normalizedSelectionFollowUp)
        );
        if (confirmsSelection) {
          continueToPlanFromSelection(value, submittedAttachments, false);
          return;
        }

        const selectedItems = displayedResultItems.filter((item) => selectedResults.includes(item.id));
        const selectedItemLabels = selectedItems.map((item) => `${item.code}·${item.title}`);
        const messageId = `result-generation-${Date.now()}`;
        const sourceBatchId = resultBatches[resultBatches.length - 1]?.id ?? initialResultBatch.id;
        setPreviewId(null);
        setAdditionalMessages((current) => [...current, {
          id: messageId,
          request: value,
          attachments: submittedAttachments,
          response: `收到你的修改需求，我将修改你选中的 ${selectedItemLabels.join("、")}，并保留其余未提出修改意见的图片。正在调用 AI 改款工具生成修改版本。`,
          resultGeneration: true,
          isGenerating: true,
        }]);
        setPendingResultGeneration({
          messageId,
          round: resultBatches.length,
          sourceBatchId,
          selectedItemIds: [...selectedResults],
          selectedItemLabels,
        });
        return;
      }
      const messageId = `result-generation-${Date.now()}`;
      setSelectedResults([]);
      setPreviewId(null);
      setAdditionalMessages((current) => [...current, {
        id: messageId,
        request: value,
        attachments: submittedAttachments,
        response: "正在调用 AI 改款工具，根据你的反馈生成一组新的款式图。",
        resultGeneration: true,
        isGenerating: true,
      }]);
      setPendingResultGeneration({
        messageId,
        round: resultBatches.length,
        sourceBatchId: resultBatches[resultBatches.length - 1]?.id ?? initialResultBatch.id,
        selectedItemIds: [],
        selectedItemLabels: [],
      });
      return;
    }
    setAdditionalMessages((current) => [...current, {
      id: `follow-up-${Date.now()}`,
      request: value,
      attachments: submittedAttachments,
      response: value
        ? `已收到你的追加要求：“${value}”。我会在当前新品企划流程中继续处理，并保留已经确认的内容。`
        : `已收到你补充的 ${submittedAttachments.length} 份资料。我会在当前新品企划流程中继续处理，并保留已经确认的内容。`,
    }]);
  };

  const submitCompletionSuggestion = (suggestion: string) => {
    onTaskProgress?.();
    setFollowUp("");
    setAdditionalMessages((current) => [...current, {
      id: `completion-follow-up-${Date.now()}`,
      request: suggestion,
      attachments: [],
      response: `已收到你的追加要求：“${suggestion}”。我会基于当前新品企划案继续处理，并保留已确认的调研依据、视觉方向和款式结果。`,
    }]);
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
    results: "选择用于企划的图片，或输入修改要求...",
    "plan-generating": "Agent 正在写入新品企划案，请稍候...",
    complete: "任务已完成，可提出修改意见或追加任务...",
  };

  const composerRunning = Boolean(pendingResultGeneration) || ["analyzing", "research", "structure-planning", "ai-generating", "plan-generating"].includes(stage);
  const exceptionNotice = useMemo(() => exceptionDemoStage === "network"
    ? {
        message: "网络异常，重连中...",
        actionLabel: "立即重试",
        onAction: () => setExceptionDemoStage("reconnecting"),
        processing: true,
      }
    : exceptionDemoStage === "credits"
        ? {
            message: "您的积分余额不足",
            actionLabel: "购买积分",
            onAction: () => window.dispatchEvent(new CustomEvent("lightchain:open-credits")),
          }
        : null, [exceptionDemoStage]);

  useEffect(() => {
    if (!exceptionDemo || exceptionDemoStage !== "credits") return;
    const resumeAfterPurchase = () => {
      setExceptionCreditsResolved(true);
      setExceptionDemoStage("ready");
      setStage("research");
    };
    window.addEventListener("lightchain:credits-purchased", resumeAfterPurchase);
    return () => window.removeEventListener("lightchain:credits-purchased", resumeAfterPurchase);
  }, [exceptionDemo, exceptionDemoStage]);
  const researchReferencesReady = ["directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage);
  const productStructureReady = ["structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage);
  const aiResultsReady = ["results", "plan-generating", "complete"].includes(stage);

  useEffect(() => {
    if (!researchReferencesReady || detailAutoOpenedRef.current) return;
    detailAutoOpenedRef.current = true;
    setDetailPanelOpen(true);
  }, [researchReferencesReady]);
  const selectedDirectionLabels = directions.filter((item) => selectedDirections.includes(item.id)).map((item) => item.title);
  const researchPlatformOptions = getResearchPlatformOptions(markets);
  const allResearchPlatformOptions = getResearchPlatformOptions(researchMarkets);
  const researchScopeAllSelected = researchMarkets.every((market) => markets.includes(market))
    && allResearchPlatformOptions.commerce.every((platform) => commerce.includes(platform))
    && allResearchPlatformOptions.social.every((platform) => social.includes(platform));
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
  const aiResultsHtml = useMemo(() => buildFashionProposalHtml({
    kind: "package",
    title: "AI 改款结果",
    deck: "汇总本轮基于已确认视觉方向、参考商品与商品结构生成的 AI 改款图，供筛选与后续新品企划使用。",
    kicker: "AI DESIGN VARIATIONS",
    topbarMeta: `${briefMarket} / ${briefCategory} / ${briefSeason}`,
    directions: confirmedDirectionReportItems,
    references: allGeneratedResultItems.map((item) => ({
      code: item.code,
      title: item.subtitle ?? item.title,
      category: directions.find((direction) => direction.id === item.categoryId)?.title ?? item.title,
      imageUrl: assetUrl(item.src),
    })),
    categoryCount: new Set(allGeneratedResultItems.map((item) => item.categoryId)).size,
    directionLabel: confirmedDirections.map((direction) => direction.title).join("、") || "方向待确认",
    sources: planSources,
  }), [allGeneratedResultItems, briefCategory, briefMarket, briefSeason, confirmedDirectionReportItems, confirmedDirections, planSources]);
  const newProductPlanHtml = useMemo(() => {
    const confirmedResults = displayedResultItems.filter((item) => selectedResults.includes(item.id));

    return buildNewProductPlanHtml({
      title: `${briefSeason === "未指定" ? "待确认季节" : briefSeason} ${briefCategory}新品企划案`,
      market: briefMarket,
      category: briefCategory,
      season: briefSeason,
      audience: briefAudience,
      channels: briefChannels,
      directions: confirmedDirectionReportItems,
      references: confirmedResults.map((item) => ({
        code: item.code,
        title: item.subtitle ?? item.title,
        category: directions.find((direction) => direction.id === item.categoryId)?.title ?? item.title,
        imageUrl: assetUrl(item.src),
      })),
      directionLabel: `${confirmedDirections.map((direction) => direction.title).join("、") || "方向待确认"}；渠道：${briefChannels}`,
      sources: planSources,
      plan: merchandisingPlan,
    });
  }, [briefAudience, briefCategory, briefChannels, briefMarket, briefSeason, confirmedDirectionReportItems, confirmedDirections, displayedResultItems, merchandisingPlan, planSources, selectedResults]);

  const stopCurrentTask = () => {
    if (pendingResultGeneration) {
      const messageId = pendingResultGeneration.messageId;
      setPendingResultGeneration(null);
      setAdditionalMessages((current) => current.map((message) => message.id === messageId
        ? { ...message, response: "已停止本轮 AI 改款生成。你可以继续修改要求后重新发送。", isGenerating: false }
        : message));
    } else if (stage === "research") setStage("scope");
    else if (stage === "structure-planning") setStage("directions");
    else if (stage === "ai-generating") setStage("structure");
    else if (stage === "plan-generating") setStage("results");
    else if (stage === "analyzing") setStage("brief");
  };

  const renderResultForm = (batch: GeneratedResultBatch) => {
    const isLatestBatch = resultBatches[resultBatches.length - 1]?.id === batch.id;
    const isActive = stage === "results" && isLatestBatch && !pendingResultGeneration;
    const formSelectedResults = isLatestBatch ? selectedResults : [];

    return (
      <section className="new-product-results-form" key={batch.id}>
        <ConversationFormTitle
          title={t("选择新品企划案的 AI 改款图")}
          helper={t("选择图片后，名称会回显到输入框。你可以发送确认，也可以直接生成企划；需要修改时请在输入框回复。")}
          status={isActive ? "pending" : "confirmed"}
          statusLabel={t(isActive ? "待确认" : isLatestBatch && (stage === "complete" || stage === "plan-generating") ? "已确认" : "已生成")}
        />
        <div className="new-product-results-grid">
          {batch.items.map((item) => (
            <MasonryImageSelection
              key={item.id}
              src={assetUrl(item.src)}
              alt={`${item.code} ${item.title}`}
              label={item.subtitle ?? item.title}
              selected={formSelectedResults.includes(item.id)}
              disabled={!isActive}
              onSelect={() => toggleResult(item.id)}
              onPreview={() => { setPreviewReadOnly(!isActive); setPreviewHideSelection(false); setPreviewId(item.id); setActivePreviewCategory(item.categoryId); }}
            />
          ))}
        </div>
        <ImageSelectionActions
          selectedCount={formSelectedResults.length}
          totalCount={batch.items.length}
          disabled={!isActive}
          hint=""
          onToggleAll={toggleAllResults}
        >
          {isActive ? (
            <BusinessButton points={999} disabled={!formSelectedResults.length} onClick={() => continueToPlanFromSelection()}>{t("生成企划")}</BusinessButton>
          ) : null}
        </ImageSelectionActions>
      </section>
    );
  };

  return (
    <motion.main className={`workspace-region workspace-region--conversation new-product-workspace ${detailPanelOpen ? "has-detail-panel" : ""}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="conversation-stage" aria-label="新品企划任务对话">
        <div className="conversation-scroll">
          <ConversationFeed className="new-product-feed">
            <ConversationUserMessage entrance>
              <ConversationUserAttachments attachments={attachments} />
              <span>{prompt}</span>
            </ConversationUserMessage>

            <AssistantMessage actions={false}>
              <p>{stage === "analyzing" ? "正在读取需求资料并整理企划边界。" : "已完成需求解析，并保留所有未提供字段为未指定。"}</p>
              <TaskDisclosure title="解析新品企划需求" expanded={analysisExpanded} complete={stage !== "analyzing"} controlsId="new-product-analysis" onToggle={() => setAnalysisExpanded((value) => !value)}>
                {["读取本次文字、图片和文档", profileName ? "读取已应用的业务偏好档案" : "确认本任务未应用业务偏好档案", "识别品类、人群、价格、渠道、波段与排除条件", "记录缺失信息，不补造未提供内容"].map((line, index) => <div key={line}><AnalysisStepIcon complete={stage !== "analyzing"} delay={index * 0.06} /><span>{line}</span></div>)}
              </TaskDisclosure>
            </AssistantMessage>

            {stage !== "analyzing" ? (
              <AssistantMessage className="new-product-brief">
                <p><strong>我已整理本次新品企划需求：</strong></p>
                <p>品类：{briefCategory}；目标人群：{briefAudience}。</p>
                <p>价格段：未指定；市场与渠道：{briefMarket}，{briefChannels}。</p>
                <p>波段：{briefSeason}；计划款数：未指定，将在商品结构中给出待确认建议。</p>
                <p>排除条件：{promptExclusions.length ? promptExclusions.join("、") : "未指定"}。</p>
                <p>资料缺口：无历史销售、旧企划、OTB 预算和真实供应商报价。缺失内容不会补造。</p>
                {stage === "brief" && (!exceptionDemo || exceptionDemoStage === "ready") ? (
                  <div className="new-product-quick-replies">
                    <Button variant="outline" size="small" onClick={() => setComposerFocusRequest((request) => request + 1)}>补充条件</Button>
                    <QuickReplyButton onClick={() => continueFromBrief()}>满意，请继续</QuickReplyButton>
                  </div>
                ) : null}
              </AssistantMessage>
            ) : null}

            {exceptionDemo && ["network", "reconnecting", "parse-failed", "retrying"].includes(exceptionDemoStage) ? (
              <ConversationUserMessage>
                <ConversationUserAttachments attachments={briefEntryAttachments} />
                {briefEntryMessage ? <span>{briefEntryMessage}</span> : null}
              </ConversationUserMessage>
            ) : null}

            {exceptionDemo && ["reconnecting", "parse-failed", "retrying"].includes(exceptionDemoStage) ? (
              <AssistantMessage actions={false}>
                <p>{exceptionDemoStage === "retrying" ? "正在重新解析新品企划需求，已提交的需求与附件不会丢失。" : "网络已恢复，正在从中断位置继续解析，已提交的需求与附件不会丢失。"}</p>
                <NewProductExceptionAnalysisTask
                  failed={exceptionDemoStage === "parse-failed"}
                  onRetry={() => setExceptionDemoStage("retrying")}
                />
              </AssistantMessage>
            ) : null}

            {["scope", "research", "directions", "structure-planning", "structure", "ai-generating", "results", "plan-generating", "complete"].includes(stage) ? (
              <>
                <ConversationUserMessage>
                  <ConversationUserAttachments attachments={briefEntryAttachments} />
                  {briefEntryMessage && <span>{briefEntryMessage}</span>}
                </ConversationUserMessage>
                <AssistantMessage>
                  {briefAcknowledgement ? <p>{briefAcknowledgement}</p> : null}
                  <p>需求摘要已确认。请确认地区，以及本次实际需要研究的平台和网站。趋势资料库固定启用；不同平台的数据会分别保留，不合并成单一销量、销售额或热度。</p>
                  <p>请选择主要市场、电商平台和社交媒体。</p>
                  <ResearchScopeForm
                    confirmed={stage !== "scope" || exceptionDemoStage === "credits"}
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
                    onToggleAll={() => {
                      setMarkets(researchScopeAllSelected ? scopeDefaults.markets : [...researchMarkets]);
                      setCommerce(researchScopeAllSelected ? scopeDefaults.commerce : [...allResearchPlatformOptions.commerce]);
                      setSocial(researchScopeAllSelected ? scopeDefaults.social : [...allResearchPlatformOptions.social]);
                    }}
                    onReset={() => {
                      setMarkets(scopeDefaults.markets);
                      setCommerce(scopeDefaults.commerce);
                      setSocial(scopeDefaults.social);
                      setOtherCommerce("");
                    }}
                    onConfirm={() => {
                      if (exceptionDemo && !exceptionCreditsResolved) {
                        setExceptionDemoStage("credits");
                        return;
                      }
                      setStage("research");
                    }}
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
                  {stage === "directions" ? <div className="new-product-form-actions"><SelectAllControl selected={selectedDirections.length === directions.length} className="selection-select-all--leading" onToggle={() => setSelectedDirections(selectedDirections.length === directions.length ? [] : directions.map((direction) => direction.id))} /><BusinessButton points={10} disabled={!selectedDirections.length} onClick={() => setStage("structure-planning")}>确认并继续</BusinessButton></div> : null}
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
                    <Button variant="primary" size="small" onClick={() => { onTaskProgress?.(); continueToAiGeneration(); }}>继续生成 AI 改款 <FigmaIcon name="arrow-right" size={16} /></Button>
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
                <DownloadableFile
                  name="AI 改款结果.html"
                  description="刚刚 · 专业服装提示词已通过完整性检查 · AI 概念表达"
                  html={aiResultsHtml}
                  onPreview={() => setReportPreview({ name: "AI 改款结果.html", html: aiResultsHtml })}
                />
                <p>{t("请从改款结果中选择要用于新品企划的图片。如果不满意或希望调整，直接在输入框说明修改要求，我会追加生成一组新方案；已生成图片不会被覆盖。")}</p>
                {renderResultForm(resultBatches[0] ?? initialResultBatch)}
              </AssistantMessage>
            ) : null}

            {additionalMessages.filter((message) => message.resultGeneration).map((message, index) => {
              const resultBatch = resultBatches.find((batch) => batch.id === message.resultBatchId);
              return (
                <ConversationFollowUpExchange
                  request={message.request}
                  attachments={message.attachments}
                  response={message.response}
                  key={message.id || `${message.resultBatchId}-${index}`}
                >
                  {message.isGenerating ? (
                    <NewProductLoadingTask
                      title="AI 改款工具调用中"
                      lines={pendingResultGeneration?.messageId === message.id && pendingResultGeneration.selectedItemIds.length
                        ? ["解析选中图片与对应修改要求", "仅重做用户选中的 AI 款式图", "合并未提出修改意见的原有图片", "检查完整性并生成新的选择表单"]
                        : ["解析本轮不满意点与修改要求", "保留已确认的视觉方向和商品结构", "生成一组新的 AI 改款图", "检查结果完整性并写入生成款式"]}
                    />
                  ) : resultBatch ? renderResultForm(resultBatch) : null}
                </ConversationFollowUpExchange>
              );
            })}

            {["plan-generating", "complete"].includes(stage) ? (
              <>
                <ConversationUserMessage>
                  <ConversationUserAttachments attachments={planEntryAttachments} />
                  <span>{planEntryMessage || selectedResultSummary}</span>
                </ConversationUserMessage>
                <AssistantMessage actions={false}>
                  <p>正在将已确认图片、调研依据、视觉方向和商品结构写入新品企划案。</p>
                  <NewProductLoadingTask title="生成新品企划案" complete={stage === "complete"} lines={["锁定用户确认的 AI 款式图", "关联调研证据、视觉方向与商品结构", "生成统一只读 HTML 查看版本", "准备 HTML、PPT、PDF 下载文件"]} />
                </AssistantMessage>
              </>
            ) : null}

            {stage === "complete" ? (
              <>
                <AssistantMessage>
                  <ConversationTaskCompletion
                    message={<>新品企划案已完成，已写入 {selectedResults.length} 张你确认的 AI 款式图，并保留调研依据、视觉方向和商品结构。所有内容只读；需要修改时请在输入框提出，系统会生成新版本并只重跑受影响步骤。</>}
                    suggestions={[]}
                  >
                    <DownloadableFile
                      name="新品企划案.html"
                      description="刚刚 · 统一 HTML 查看器 · 可下载 HTML / PPT / PDF · 不支持在线编辑"
                      html={newProductPlanHtml}
                      onPreview={() => setReportPreview({ name: "新品企划案.html", html: newProductPlanHtml })}
                    />
                  </ConversationTaskCompletion>
                </AssistantMessage>
                <AssistantMessage>
                  <ConversationTaskCompletion
                    message="任务已完成。"
                    suggestions={["分析企划中采用的面料与工艺细节", "基于这份企划制作客户提案", "整理确认款的后续开发清单"]}
                    onSuggestion={submitCompletionSuggestion}
                  />
                </AssistantMessage>
              </>
            ) : null}
            {additionalMessages.filter((message) => !message.resultGeneration).map((message, index) => (
              <ConversationFollowUpExchange
                request={message.request}
                attachments={message.attachments}
                response={message.response}
                key={message.id || `${message.request}-${index}`}
              />
            ))}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>

        <div className="conversation-bottom-fade" aria-hidden="true" />
        <TaskConversationComposer ariaLabel="继续新品企划对话" value={followUp} onChange={setFollowUp} onSubmit={submitFollowUp} placeholder={placeholder[stage]} hint={["reconnecting", "retrying"].includes(exceptionDemoStage) ? "Agent 正在重新解析，请稍候..." : exceptionDemoStage === "parse-failed" ? "请先重试解析任务" : stage === "scope" ? "请先完成调研范围确认" : stage === "directions" ? "请先从上方表单完成视觉方向选择" : stage === "results" ? "生成企划将扣除 999 积分" : undefined} disabled={stage === "scope" || stage === "directions" || ["reconnecting", "parse-failed", "retrying"].includes(exceptionDemoStage) || Boolean(exceptionNotice)} isRunning={composerRunning} onStop={stopCurrentTask} motionDelay={0.25} focusRequest={composerFocusRequest} exceptionNotice={exceptionNotice} />
      </section>

      <aside className={`task-detail-rail ${detailPanelOpen ? "is-expanded" : "is-collapsed"}`}>
        <TaskDetailPanel
          ariaLabel="新品企划任务概览"
          onCollapse={() => setDetailPanelOpen(false)}
          artifacts={(
            <>
              {researchReferencesReady ? (
                <TaskArtifactRow kind="file" onClick={() => setReportPreview({ name: "调研与视觉方向报告.html", html: researchReportHtml })}>调研与视觉方向报告.html</TaskArtifactRow>
              ) : null}
              {productStructureReady ? (
                <TaskArtifactRow kind="file" onClick={() => setReportPreview({ name: "商品结构规划.html", html: productStructureHtml })}>商品结构规划.html</TaskArtifactRow>
              ) : null}
              {aiResultsReady ? (
                <TaskArtifactRow kind="file" onClick={() => setReportPreview({ name: "AI 改款结果.html", html: aiResultsHtml })}>AI 改款结果.html</TaskArtifactRow>
              ) : null}
              {stage === "complete" ? (
                <TaskArtifactRow kind="file" onClick={() => setReportPreview({ name: "新品企划案.html", html: newProductPlanHtml })}>新品企划案.html</TaskArtifactRow>
              ) : null}
              {stage === "research" && !exceptionNotice ? <TaskArtifactRow kind="file">正在生成调研与视觉方向报告.html…</TaskArtifactRow> : null}
              {stage === "structure-planning" ? <TaskArtifactRow kind="file">正在生成商品结构规划.html…</TaskArtifactRow> : null}
              {stage === "ai-generating" ? <TaskArtifactRow kind="file">正在生成 AI 改款结果.html…</TaskArtifactRow> : null}
              {stage === "plan-generating" ? <TaskArtifactRow kind="file">正在生成新品企划案.html…</TaskArtifactRow> : null}
            </>
          )}
          referenceTitle="参考款式"
          references={(researchReferencesReady ? newProductReferenceItems : []).map((item, index) => ({
            id: item.id,
            label: item.title,
            href: item.sourceUrl ?? "#",
            thumbnail: item.src,
            meta: item.subtitle,
            date: "2026-08-06",
            groupDate: index < 8 ? "2026-08-18 16:33" : "2026-08-18 13:33",
          }))}
          onReferenceSelect={(reference) => {
            if (reference.id) setReferencePreviewId(reference.id);
          }}
          generatedReferences={(["results", "plan-generating", "complete"].includes(stage) ? allGeneratedResultItems : []).map((item) => ({
            id: item.id,
            label: item.subtitle ?? item.title,
            href: "#",
            thumbnail: item.src,
            meta: item.title,
            date: item.groupDate.slice(0, 10),
            groupDate: item.groupDate,
          }))}
          onGeneratedSelect={(reference) => {
            const item = allGeneratedResultItems.find((result) => result.id === reference.id);
            if (!item) return;
            const belongsToCurrentBatch = displayedResultItems.some((result) => result.id === item.id);
            setPreviewReadOnly(stage !== "results" || !belongsToCurrentBatch);
            setPreviewHideSelection(true);
            setPreviewId(item.id);
            setActivePreviewCategory(item.categoryId);
          }}
        />
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
                      onSelect={(format) => downloadReportFile(reportPreview.name, t("AI 生成 · 在线预览"), translateHtmlCopy(reportPreview.html, locale), format)}
                    />
                    <IconControl label={t("关闭在线查看")} variant="bare" size="small" autoFocus onClick={() => setReportPreview(null)}>
                      <FigmaIcon name="close" size={20} />
                    </IconControl>
                  </div>
                </header>
                <iframe className="trend-preview-modal__frame" title={`${reportPreview.name}${t("在线查看")}`} srcDoc={translateHtmlCopy(reportPreview.html, locale)} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer" />
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      {previewId ? (
        <ImageGalleryLightbox
          title={previewHideSelection ? t("生成款式") : t("选择新品企划案的 AI 改款图")}
          categories={lightboxCategories}
          items={allGeneratedResultItems}
          activeCategoryId={activePreviewCategory}
          activeItemId={previewId}
          selectedIds={previewReadOnly ? [] : selectedResults}
          selectionDisabled={previewReadOnly || stage !== "results"}
          hideSelection={previewHideSelection}
          resultActions={{
            onDownload: downloadGalleryItem,
          }}
          presentation={previewHideSelection ? "detail" : "gallery"}
          showCategories={false}
          onCategoryChange={(categoryId) => {
            setActivePreviewCategory(categoryId);
            const first = allGeneratedResultItems.find((item) => item.categoryId === categoryId);
            if (first) setPreviewId(first.id);
          }}
          onNavigate={(itemId) => {
            setPreviewId(itemId);
            setPreviewReadOnly(stage !== "results" || !displayedResultItems.some((item) => item.id === itemId));
          }}
          onToggleSelection={toggleResult}
          onClose={() => { setPreviewId(null); setPreviewReadOnly(false); setPreviewHideSelection(false); }}
        />
      ) : null}
      {referencePreviewId ? (
        <ImageGalleryLightbox
          title={t("参考款式")}
          categories={lightboxCategories}
          items={newProductReferenceItems}
          activeCategoryId={newProductReferenceItems.find((item) => item.id === referencePreviewId)?.categoryId ?? lightboxCategories[0].id}
          activeItemId={referencePreviewId}
          selectedIds={[]}
          selectionDisabled
          referenceActions={{
            onDownload: downloadGalleryItem,
            onOpenSource: (item) => {
              if (item.sourceUrl) window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            },
          }}
          hideSelection
          presentation="reference"
          showCategories={false}
          onCategoryChange={() => undefined}
          onNavigate={setReferencePreviewId}
          onToggleSelection={() => undefined}
          onClose={() => setReferencePreviewId(null)}
        />
      ) : null}
    </motion.main>
  );
}
