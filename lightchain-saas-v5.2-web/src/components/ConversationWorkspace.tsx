import { useEffect, useRef, useState, type Dispatch, type FormEvent, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { Button } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { CandidateImageLightbox, MasonryImageSelection } from "./ImageSelection";
import { TaskConversationComposer } from "./TaskConversationComposer";
import { AnalysisStepIcon, ConversationFileCard, ConversationFormTitle, ConversationStatusIcon as StatusIcon, ConversationUserMessage, TaskDisclosure } from "./ConversationPrimitives";
import { candidateCategories, candidatePageCount, candidateReferenceImages, formatCandidateSelection, formatTrendDirectionSelection, getCandidateCategoryLabel, getCandidateReference, getReferencePackageData, trendDirections, trendReportDetails, type CandidateCategoryId } from "../data/referenceCatalog";

type AnalysisPhase = "parsing" | "complete";
type ResearchMarket = "中国" | "日本" | "北美" | "欧洲";
type TrendDownloadFormat = "HTML" | "PPT" | "PDF";
type TrendPreviewKind = "research" | "package";

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
  const referenceMarkup = selectedReferences.map((reference, index) => {
    const categoryLabel = getCandidateCategoryLabel(reference.categoryId);
    const imageUrl = new URL(assetUrl(reference.src), window.location.href).href;
    return `<article class="reference-card"><img src="${imageUrl}" alt="${reference.code} ${categoryLabel}"><div class="reference-body"><span class="reference-index">REFERENCE ${String(index + 1).padStart(2, "0")}</span><h2>${reference.code} · ${categoryLabel}</h2><p class="reference-source">${reference.title}</p><p>该素材用于表达「${categoryLabel}」的视觉语气，并作为客户方向沟通、廓形判断与细节取舍的共同参考。</p><div class="reference-tags"><span>日本女装</span><span>${categoryLabel}</span><span>2026年8月</span><span>来源可追溯</span></div></div></article>`;
  }).join("");

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>客户方向参考包</title><style>
  :root{color-scheme:light;--ink:#161917;--muted:#68706b;--line:#d9ded9;--paper:#f4f2ec;--accent:#00bdb2}*{box-sizing:border-box}body{margin:0;background:#e8e8e3;color:var(--ink);font-family:"Noto Sans SC","PingFang SC",sans-serif}.page{width:100%;background:var(--paper)}.cover{min-height:680px;padding:72px;display:grid;grid-template-columns:1.4fr .6fr;grid-template-rows:auto 1fr auto;gap:40px;border-bottom:1px solid var(--line)}.eyebrow{grid-column:1/-1;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase}.cover-copy{grid-column:1/-1;align-self:center}.cover h1{margin:0 0 24px;font-size:68px;font-weight:700;line-height:1.08;letter-spacing:-.045em;white-space:nowrap}.cover p{max-width:680px;margin:0;color:var(--muted);font-size:18px;line-height:1.8}.cover-meta{grid-column:2;justify-self:end;align-self:end;padding-left:18px;border-left:2px solid var(--accent)}.cover-meta strong,.cover-meta span{display:block}.cover-meta strong{font-size:24px;font-weight:700}.cover-meta span{margin-top:8px;color:var(--muted);font-size:11px}.summary{padding:72px;border-bottom:1px solid var(--line)}.section-label{display:flex;justify-content:space-between;margin-bottom:36px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.summary-grid{display:grid;grid-template-columns:.75fr 1.25fr;gap:72px}.summary h2{margin:0;font-size:36px;line-height:1.35}.summary p{margin:0;font-size:18px;line-height:1.9}.metrics{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;border-top:1px solid var(--ink)}.metric{padding:20px 0;border-bottom:1px solid var(--line)}.metric+.metric{padding-left:24px;border-left:1px solid var(--line)}.metric strong,.metric span{display:block}.metric strong{font-size:32px}.metric span{color:var(--muted);font-size:12px}.references{padding:72px}.reference-card{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr);gap:48px;align-items:center;padding:0 0 48px;margin-bottom:48px;border-bottom:1px solid var(--line)}.reference-card>img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;background:#ebece8}.reference-index{color:#008f88;font-size:11px;font-weight:700;letter-spacing:.14em}.reference-body h2{margin:12px 0 8px;font-size:30px;line-height:1.3}.reference-source{margin:0 0 24px!important;color:var(--muted);font-size:13px!important}.reference-body p{margin:0;font-size:16px;line-height:1.8}.reference-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}.reference-tags span{padding:6px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:11px}.footer{display:flex;justify-content:space-between;padding:40px 72px 56px;color:var(--muted);font-size:11px}.footer strong{color:var(--ink);letter-spacing:.12em}@media(max-width:760px){.cover,.summary,.references{padding:36px}.cover{min-height:600px;grid-template-columns:1fr}.cover h1{font-size:44px;white-space:normal}.cover-meta{grid-column:1;justify-self:start}.summary-grid,.reference-card{grid-template-columns:1fr;gap:24px}.metrics{grid-template-columns:1fr}.metric+.metric{padding-left:0;border-left:0}.footer{padding:32px 36px}}
  </style></head><body><main class="page"><header class="cover"><span class="eyebrow">Lightchain / Client Reference Package</span><div class="cover-copy"><h1>客户方向参考包</h1><p>将客户已选择的视觉素材整理为可直接沟通的方向依据，完整保留标题、说明、标签与来源信息。</p></div><aside class="cover-meta"><strong>Japan / Womenswear</strong><span>2026.08 · ${selectedReferences.length} REFERENCES</span></aside></header><section class="summary"><div class="section-label"><span>01 / Direction Summary</span><span>方向摘要</span></div><div class="summary-grid"><h2>从已选择的图像，建立共同视觉语言。</h2><p>本参考包对应视觉方向：${directionLabel}。所有图片均来自用户在当前任务中确认的素材，不扩展、不替换，也不改变原始选择。</p></div><div class="metrics"><div class="metric"><strong>${selectedReferences.length}</strong><span>已选参考图</span></div><div class="metric"><strong>${selectedDirections.length}</strong><span>已确认方向</span></div><div class="metric"><strong>${categoryCount}</strong><span>素材类型</span></div></div></section><section class="references"><div class="section-label"><span>02 / Selected References</span><span>客户已选素材</span></div>${referenceMarkup}</section><footer class="footer"><strong>LIGHTCHAIN</strong><span>CONFIDENTIAL · CLIENT DIRECTION REFERENCES</span></footer></main></body></html>`;
}

function buildTrendReportHtml(kind: TrendPreviewKind, selectedDirectionIds: string[] = [], selectedCandidateIds: string[] = []) {
  if (kind === "package") return buildCustomerDirectionPackageHtml(selectedDirectionIds, selectedCandidateIds);
  const visibleDirections = trendDirections;
  const title = "客户需求调研与视觉方向";
  const deck = "日本女装市场的小样本方向扫描与提案建议。";
  const directionMarkup = visibleDirections.map((direction) => {
    const detail = trendReportDetails[direction.id];
    const imageUrl = new URL(assetUrl(detail.image), window.location.href).href;
    return `<article class="direction"><div class="direction-no">${direction.id}</div><div class="direction-copy"><span>${detail.signal}</span><h2>${direction.title}</h2><p>${direction.description}</p><small>${detail.cue}</small></div><img src="${imageUrl}" alt="${direction.title}参考图"></article>`;
  }).join("");

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  :root{color-scheme:light;--ink:#161917;--muted:#68706b;--line:#d9ded9;--paper:#f4f2ec;--accent:#00bdb2}*{box-sizing:border-box}body{margin:0;background:#e8e8e3;color:var(--ink);font-family:"Noto Sans SC","PingFang SC",sans-serif}.page{width:100%;margin:0;background:var(--paper)}.cover{min-height:720px;padding:72px;display:grid;grid-template-columns:1.4fr .6fr;grid-template-rows:auto 1fr auto;gap:40px;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase}.cover>div:nth-child(2){grid-column:1/-1;align-self:center}.cover h1{max-width:none;margin:80px 0 24px;font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:68px;font-weight:700;line-height:1.08;letter-spacing:-.04em;white-space:nowrap}.cover p{max-width:560px;color:var(--muted);font-size:18px;line-height:1.8}.cover-meta{grid-column:2;justify-self:end;align-self:end;border-left:2px solid var(--accent);padding-left:18px}.cover-meta strong,.cover-meta span{display:block}.cover-meta strong{font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:24px;font-weight:700}.cover-meta span{margin-top:8px;color:var(--muted);font-size:12px}.section{padding:72px;border-bottom:1px solid var(--line)}.section-label{display:flex;justify-content:space-between;margin-bottom:36px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.lead{display:grid;grid-template-columns:.7fr 1.3fr;gap:72px}.lead h2{margin:0;font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:36px;font-weight:700}.lead p{margin:0;font-size:18px;line-height:1.9}.metrics{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;border-top:1px solid var(--ink)}.metric{padding:20px 0;border-bottom:1px solid var(--line)}.metric+ .metric{padding-left:24px;border-left:1px solid var(--line)}.metric strong{display:block;font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:32px;font-weight:700}.metric span{color:var(--muted);font-size:12px}.directions{padding:0 72px 72px}.direction{display:grid;grid-template-columns:72px 1fr 260px;gap:32px;align-items:center;padding:36px 0;border-bottom:1px solid var(--line)}.direction-no{font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:26px;font-weight:700}.direction-copy>span{color:#008f88;font-size:11px;letter-spacing:.12em}.direction h2{margin:8px 0 12px;font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:30px;font-weight:700}.direction p{margin:0 0 16px;line-height:1.7}.direction small{color:var(--muted)}.direction img{width:260px;height:180px;object-fit:cover;filter:saturate(.78)}.evidence{display:grid;grid-template-columns:1fr 1fr;gap:64px}.evidence h2{margin:0 0 20px;font-family:"Noto Sans SC","PingFang SC",sans-serif;font-size:34px;font-weight:700}.evidence p,.evidence li{color:var(--muted);line-height:1.8}.evidence ul{margin:0;padding-left:18px}.footer{padding:40px 72px 56px;display:flex;justify-content:space-between;color:var(--muted);font-size:11px}.footer strong{color:var(--ink);font-weight:500}@media(max-width:760px){.cover,.section{padding:36px}.cover{min-height:600px;grid-template-columns:1fr}.cover h1{margin-top:48px;font-size:44px;white-space:normal}.cover-meta{grid-column:1;justify-self:start}.lead,.evidence{grid-template-columns:1fr;gap:24px}.directions{padding:0 36px 36px}.direction{grid-template-columns:48px 1fr}.direction img{grid-column:2;width:100%;height:220px}.metrics{grid-template-columns:1fr}.metric+.metric{padding-left:0;border-left:0}.footer{padding:32px 36px}}</style></head><body><main class="page"><header class="cover"><div class="eyebrow">Lightchain / Direction Note 01</div><div><h1>${title}</h1><p>${deck}</p></div><aside class="cover-meta"><strong>Japan / Womenswear</strong><span>2026.08 · CLIENT WORKING DOCUMENT</span></aside></header><section class="section"><div class="section-label"><span>01 / Executive View</span><span>决策摘要</span></div><div class="lead"><h2>从“流行”转向<br>可执行的方向。</h2><p>当前证据更支持轻量松弛通勤与复古学院混搭作为核心方向。柔性结构适合小规模验证，都市轻机能保留为观察方向。判断分别核对电商供给、社媒内容、品牌采用与趋势资料，不将单一来源等同于销量。</p></div><div class="metrics"><div class="metric"><strong>${visibleDirections.length}</strong><span>视觉方向</span></div><div class="metric"><strong>4</strong><span>证据来源类型</span></div><div class="metric"><strong>2</strong><span>优先提案方向</span></div></div></section><section class="section"><div class="section-label"><span>02 / Direction Edit</span><span>方向提案</span></div></section><section class="directions">${directionMarkup}</section><section class="section evidence"><div><div class="section-label"><span>03 / Evidence</span></div><h2>证据边界</h2><p>社媒互动不等于销量；不同电商平台数值未合并。所有方向均保留来源、采集时间与授权状态，便于后续复核。</p></div><div><div class="section-label"><span>04 / Next Decision</span></div><h2>下一步</h2><ul><li>确认 1–2 个客户提案方向</li><li>按方向建立定向视觉参考池</li><li>以客户反馈决定保留、调整或排除</li></ul></div></section><footer class="footer"><strong>LIGHTCHAIN</strong><span>CONFIDENTIAL · FOR DIRECTION ALIGNMENT ONLY</span></footer></main></body></html>`;
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
              className={`trend-direction-option ${selected ? "is-selected" : ""}`}
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

function CustomerDirectionPackageDocument({
  selectedDirectionIds,
  selectedCandidateIds,
}: {
  selectedDirectionIds: string[];
  selectedCandidateIds: string[];
}) {
  const { selectedReferences, selectedDirections, directionLabel, categoryCount } = getReferencePackageData(selectedDirectionIds, selectedCandidateIds);

  return (
    <article className="trend-report-document trend-report-document--reference-package">
      <header className="trend-report-cover">
        <span className="trend-report-eyebrow">Lightchain / Client Reference Package</span>
        <div className="trend-report-cover__title">
          <h1>客户方向参考包</h1>
          <p>将客户已选择的视觉素材整理为可直接沟通的方向依据，完整保留标题、说明、标签与来源信息。</p>
        </div>
        <aside className="trend-report-cover__meta">
          <strong>Japan / Womenswear</strong>
          <span>2026.08 · {selectedReferences.length} REFERENCES</span>
        </aside>
      </header>

      <section className="trend-report-section trend-report-reference-summary">
        <div className="trend-report-section__label"><span>01 / Direction Summary</span><span>方向摘要</span></div>
        <div className="trend-report-lead">
          <h2>从已选择的图像，建立共同视觉语言。</h2>
          <p>本参考包对应视觉方向：{directionLabel}。所有图片均来自用户在当前任务中确认的素材，不扩展、不替换，也不改变原始选择。</p>
        </div>
        <div className="trend-report-metrics">
          <div><strong>{selectedReferences.length}</strong><span>已选参考图</span></div>
          <div><strong>{selectedDirections.length}</strong><span>已确认方向</span></div>
          <div><strong>{categoryCount}</strong><span>素材类型</span></div>
        </div>
      </section>

      <section className="trend-report-reference-list">
        <div className="trend-report-section__label"><span>02 / Selected References</span><span>客户已选素材</span></div>
        {selectedReferences.map((reference, index) => {
          const categoryLabel = getCandidateCategoryLabel(reference.categoryId);
          return (
            <article className="trend-report-reference" key={reference.id}>
              <img src={assetUrl(reference.src)} alt={`${reference.code} ${categoryLabel}`} />
              <div className="trend-report-reference__copy">
                <span>REFERENCE {String(index + 1).padStart(2, "0")}</span>
                <h2>{reference.code} · {categoryLabel}</h2>
                <small>{reference.title}</small>
                <p>该素材用于表达「{categoryLabel}」的视觉语气，并作为客户方向沟通、廓形判断与细节取舍的共同参考。</p>
                <div className="trend-report-reference__tags" aria-label={`${reference.code} 素材标签`}>
                  <span>日本女装</span>
                  <span>{categoryLabel}</span>
                  <span>2026年8月</span>
                  <span>来源可追溯</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="trend-report-footer"><strong>LIGHTCHAIN</strong><span>CONFIDENTIAL · CLIENT DIRECTION REFERENCES</span></footer>
    </article>
  );
}

function TrendReportDocument({
  kind,
  selectedDirectionIds,
  selectedCandidateIds,
}: {
  kind: TrendPreviewKind;
  selectedDirectionIds: string[];
  selectedCandidateIds: string[];
}) {
  if (kind === "package") {
    return <CustomerDirectionPackageDocument selectedDirectionIds={selectedDirectionIds} selectedCandidateIds={selectedCandidateIds} />;
  }
  const visibleDirections = trendDirections;
  const title = "客户需求调研与视觉方向";
  const description = "日本女装市场的小样本方向扫描与提案建议。";

  return (
    <article className="trend-report-document">
      <header className="trend-report-cover">
        <span className="trend-report-eyebrow">Lightchain / Direction Note 01</span>
        <div className="trend-report-cover__title">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <aside className="trend-report-cover__meta">
          <strong>Japan / Womenswear</strong>
          <span>2026.08 · CLIENT WORKING DOCUMENT</span>
        </aside>
      </header>

      <section className="trend-report-section trend-report-executive">
        <div className="trend-report-section__label"><span>01 / Executive View</span><span>决策摘要</span></div>
        <div className="trend-report-lead">
          <h2>从“流行”转向<br />可执行的方向。</h2>
          <p>当前证据更支持轻量松弛通勤与复古学院混搭作为核心方向。柔性结构适合小规模验证，都市轻机能保留为观察方向。判断分别核对电商供给、社媒内容、品牌采用与趋势资料，不将单一来源等同于销量。</p>
        </div>
        <div className="trend-report-metrics">
          <div><strong>{visibleDirections.length}</strong><span>视觉方向</span></div>
          <div><strong>4</strong><span>证据来源类型</span></div>
          <div><strong>2</strong><span>优先提案方向</span></div>
        </div>
      </section>

      <section className="trend-report-section trend-report-section--compact">
        <div className="trend-report-section__label"><span>02 / Direction Edit</span><span>方向提案</span></div>
      </section>
      <section className="trend-report-directions">
        {visibleDirections.map((direction) => {
          const detail = trendReportDetails[direction.id];
          return (
            <article className="trend-report-direction" key={direction.id}>
              <span className="trend-report-direction__number">{direction.id}</span>
              <div className="trend-report-direction__copy">
                <span>{detail.signal}</span>
                <h2>{direction.title}</h2>
                <p>{direction.description}</p>
                <small>{detail.cue}</small>
              </div>
              <img src={assetUrl(detail.image)} alt={`${direction.title}参考图`} />
            </article>
          );
        })}
      </section>

      <section className="trend-report-section trend-report-evidence">
        <div>
          <div className="trend-report-section__label"><span>03 / Evidence</span></div>
          <h2>证据边界</h2>
          <p>社媒互动不等于销量；不同电商平台数值未合并。所有方向均保留来源、采集时间与授权状态，便于后续复核。</p>
        </div>
        <div>
          <div className="trend-report-section__label"><span>04 / Next Decision</span></div>
          <h2>下一步</h2>
          <ul>
            <li>确认 1–2 个客户提案方向</li>
            <li>按方向建立定向视觉参考池</li>
            <li>以客户反馈决定保留、调整或排除</li>
          </ul>
        </div>
      </section>

      <footer className="trend-report-footer"><strong>LIGHTCHAIN</strong><span>CONFIDENTIAL · FOR DIRECTION ALIGNMENT ONLY</span></footer>
    </article>
  );
}

export function ConversationWorkspace({ prompt, profileName }: { prompt: string; profileName?: string }) {
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
  const [researchMarket, setResearchMarket] = useState<ResearchMarket>("日本");
  const [selectedCommerce, setSelectedCommerce] = useState<string[]>(["RakutenFashion", "其他"]);
  const [selectedSocial, setSelectedSocial] = useState<string[]>(["Instagram", "TikTok"]);
  const [otherCommerce, setOtherCommerce] = useState("");
  const scopePhaseRef = useRef<HTMLDivElement>(null);
  const confirmedResultsRef = useRef<HTMLDivElement>(null);
  const candidatePoolRef = useRef<HTMLDivElement>(null);
  const hoveredMessageRef = useRef<HTMLElement | null>(null);
  const messageMetaHideTimerRef = useRef<number | null>(null);
  const [messageMetaPosition, setMessageMetaPosition] = useState<{ left: number; top: number; side: "assistant" | "user" } | null>(null);
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
    if (!messageMetaPosition) return;
    const reposition = () => {
      const completedBlock = hoveredMessageRef.current;
      if (!completedBlock) return;
      const isUserMessage = completedBlock.classList.contains("conversation-message--user");
      const anchor = isUserMessage
        ? completedBlock.querySelector<HTMLElement>(".conversation-user-bubble") ?? completedBlock
        : completedBlock;
      const rect = anchor.getBoundingClientRect();
      const assistantMetaLeft = completedBlock.tagName === "P" ? rect.left - 4 : rect.left;
      setMessageMetaPosition({
        left: isUserMessage ? rect.right + 4 : assistantMetaLeft,
        top: rect.bottom + 28 < window.innerHeight ? rect.bottom : rect.top - 28,
        side: isUserMessage ? "user" : "assistant",
      });
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [messageMetaPosition]);

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
    if (messageMetaHideTimerRef.current !== null) window.clearTimeout(messageMetaHideTimerRef.current);
    if (hoveredMessageRef.current === completedBlock && messageMetaPosition) return;
    hoveredMessageRef.current = completedBlock;
    const isUserMessage = completedBlock.classList.contains("conversation-message--user");
    const anchor = isUserMessage
      ? completedBlock.querySelector<HTMLElement>(".conversation-user-bubble") ?? completedBlock
      : completedBlock;
    const rect = anchor.getBoundingClientRect();
    const assistantMetaLeft = completedBlock.tagName === "P" ? rect.left - 4 : rect.left;
    setMessageMetaPosition({
      left: isUserMessage ? rect.right + 4 : assistantMetaLeft,
      top: rect.bottom + 28 < window.innerHeight ? rect.bottom : rect.top - 28,
      side: isUserMessage ? "user" : "assistant",
    });
  };

  const scheduleMessageMetaHide = () => {
    if (messageMetaHideTimerRef.current !== null) window.clearTimeout(messageMetaHideTimerRef.current);
    messageMetaHideTimerRef.current = window.setTimeout(() => {
      hoveredMessageRef.current = null;
      setMessageMetaPosition(null);
    }, 120);
  };

  const keepMessageMetaOpen = () => {
    if (messageMetaHideTimerRef.current !== null) window.clearTimeout(messageMetaHideTimerRef.current);
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

  const confirmedCommerce = selectedCommerce.map((platform) => {
    if (platform === "RakutenFashion") return "Rakuten Fashion";
    if (platform === "其他" && otherCommerce.trim()) return otherCommerce.trim();
    return platform;
  }).join("、");
  const confirmedSocial = selectedSocial.join("、");
  const scopeCanSubmit = selectedCommerce.length > 0 && selectedSocial.length > 0;
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
          <div className="conversation-feed" data-node-id="476:103924" onPointerMove={showMessageMeta} onPointerLeave={scheduleMessageMetaHide}>
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
                          <Button variant="primary" size="small" onClick={() => useSeasonQuickReply("没有补充，继续")}>没有补充，继续</Button>
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
                            <Button variant="primary" size="small" onClick={() => useSeasonQuickReply("继续")}>继续</Button>
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
                  initial={reduceMotion ? false : "hidden"}
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.18, delayChildren: reduceMotion ? 0 : 0.06 } } }}
                  data-node-id="484:106053"
                >
                  <ConversationUserMessage variants={conversationBlockReveal} data-node-id="484:106206">{scopeEntryMessage}</ConversationUserMessage>

                  <motion.article className="conversation-message conversation-message--assistant conversation-scope-copy" variants={conversationBlockReveal} data-node-id="484:106216">
                    <p>需求理解已确认。接下来只确认调研范围：一个主市场，以及该市场下的电商平台和社媒平台。趋势资料库会默认纳入，不需要选择具体报告，也不会单独确认检索词。</p>
                  </motion.article>

                  <motion.article className="conversation-message conversation-message--assistant conversation-scope-message" variants={conversationBlockReveal} data-node-id="484:106226">
                    <p>请选择主要市场、电商平台和社交媒体。</p>
                    <motion.form
                      className={`research-scope-form ${scopeConfirmed ? "is-readonly" : ""}`}
                      aria-label="确认调研范围"
                      onSubmit={confirmResearchScope}
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
                                disabled={scopeConfirmed}
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
                                      disabled={scopeConfirmed}
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
                                      readOnly={scopeConfirmed}
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
                                      disabled={scopeConfirmed}
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

                      {!scopeConfirmed && <div className="research-scope-actions">
                        <button type="submit" disabled={!scopeCanSubmit}>确认并继续</button>
                      </div>}
                    </motion.form>
                  </motion.article>

                  {scopeConfirmed ? (
                    <ConversationUserMessage
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      主市场：{researchMarket}；电商：{confirmedCommerce}；社媒：{confirmedSocial}
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
                                          现在根据已确认方向、日本、女装和参考图特征，生成定向视觉参考检索条件。
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
                                        <div className="conversation-candidate-form__actions">
                                          <span className="conversation-form-selection-count" aria-live="polite">
                                            已选：{selectedCandidateIds.length}张图
                                          </span>
                                          <Button variant="primary" size="small" disabled={!selectedCandidateIds.length} onClick={() => setCandidateSelectionConfirmed(true)}>
                                            生成方向参考包
                                          </Button>
                                        </div>
                                      ) : null}
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
                                        <FigmaIcon name="arrow-down-right" size={20} />
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
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setTrendPreviewOpen(false);
              }}
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
                <div className="trend-preview-modal__scroll">
                  <TrendReportDocument
                    kind={trendPreviewKind}
                    selectedDirectionIds={selectedTrendIds}
                    selectedCandidateIds={selectedCandidateIds}
                  />
                </div>
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
