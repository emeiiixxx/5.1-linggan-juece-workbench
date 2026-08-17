import type {
  FashionProposalDirection,
  FashionProposalPlan,
  FashionProposalReference,
  FashionProposalSource,
} from "./fashionProposalHtml";

export type NewProductPlanHtmlOptions = {
  title: string;
  market: string;
  category: string;
  season: string;
  audience: string;
  channels: string;
  directionLabel: string;
  directions: FashionProposalDirection[];
  references: FashionProposalReference[];
  plan: FashionProposalPlan;
  sources: FashionProposalSource[];
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;")
  .replaceAll("—", "-")
  .replaceAll("–", "-");

const tags = (items: string[]) => `<div class="tags">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;

const reportSections = [
  ["01", "封面"],
  ["02", "企划范围与客群"],
  ["03", "趋势证据与方向"],
  ["04", "灵感来源图集"],
  ["05", "主题情绪板"],
  ["06", "渠道×波段方向"],
  ["07", "色彩系统"],
  ["08", "关键廓形造型"],
  ["09", "面料与细节"],
  ["10", "商品结构与价格"],
  ["11", "上新策略与附录"],
] as const;

export function buildNewProductPlanHtml({
  title,
  market,
  category,
  season,
  audience,
  channels,
  directionLabel,
  directions,
  references,
  plan,
  sources,
}: NewProductPlanHtmlOptions) {
  const safeDirections = directions.length ? directions : [{
    id: "pending",
    title: "方向待确认",
    description: "当前尚未确认视觉方向，以下内容保留为企划结构示意。",
    recommendation: "完成方向确认后再进入商品开发。",
    signal: "PENDING",
    cue: "待确认",
    imageUrl: references[0]?.imageUrl ?? "",
  }];
  const visuals = references.length
    ? references
    : safeDirections.map((direction, index) => ({
        code: `REF ${String(index + 1).padStart(2, "0")}`,
        title: direction.title,
        category: direction.cue,
        imageUrl: direction.imageUrl,
      }));
  const heroImage = visuals[0]?.imageUrl ?? safeDirections[0]?.imageUrl ?? "";
  const secondaryImage = visuals[1]?.imageUrl ?? safeDirections[1]?.imageUrl ?? heroImage;
  const directionCards = safeDirections.map((direction, index) => `
    <article class="direction-card reveal">
      <figure><img src="${escapeHtml(direction.imageUrl)}" alt="${escapeHtml(direction.title)}" loading="lazy"></figure>
      <div class="direction-card__copy">
        <span class="eyebrow">${escapeHtml(direction.signal || `DIRECTION ${index + 1}`)}</span>
        <h3>${escapeHtml(direction.title)}</h3>
        <p>${escapeHtml(direction.description)}</p>
        ${tags([direction.cue, direction.recommendation])}
      </div>
    </article>`).join("");
  const gallery = visuals.map((visual) => `
    <figure class="gallery-card reveal">
      <img src="${escapeHtml(visual.imageUrl)}" alt="${escapeHtml(visual.title)}" loading="lazy">
      <figcaption><strong>${escapeHtml(visual.code)}</strong><span>${escapeHtml(visual.category)}</span></figcaption>
    </figure>`).join("");
  const silhouetteCards = visuals.slice(0, 4).map((visual, index) => `
    <article class="silhouette-card reveal">
      <figure><img src="${escapeHtml(visual.imageUrl)}" alt="${escapeHtml(visual.category)}造型" loading="lazy"></figure>
      <div><span>LOOK ${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(visual.category)}</h3><p>${escapeHtml(visual.title)}</p></div>
    </article>`).join("");
  const assortmentRows = plan.assortment.map((row) => `
    <div class="table-row">
      <strong>${escapeHtml(row.category)}</strong><span>${escapeHtml(row.role)}</span><span>${escapeHtml(row.styles)}</span><span>${escapeHtml(row.price)}</span><span>${escapeHtml(row.channel)}</span><p>${escapeHtml(row.rationale)}</p>
    </div>`).join("");
  const sourceRows = sources.map((source, index) => `
    <a class="source-row" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(source.name)}</strong><p>${escapeHtml(source.detail)}</p><b>↗</b></a>`).join("");
  const nav = reportSections.map(([number, label]) => `
    <a class="toc__item" href="#chapter-${number}">
      <span>${number}</span><strong>${label}</strong>
    </a>`).join("");
  const summaryMetrics = plan.summary.slice(0, 4).map((item) => `
    <article class="metric"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></article>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--ink:#111513;--muted:#626966;--paper:#f1f2ef;--white:#f8f8f5;--smoke:#e4e6e3;--line:#cfd3cf;--accent:#187c76;--clay:#a95f4d;--sage:#71877e;--cream:#e8e2d4;--brown:#302b28;--aqua:#6bc8c1;color-scheme:light}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Helvetica Neue","Noto Sans SC","PingFang SC",Arial,sans-serif;-webkit-font-smoothing:antialiased}img{display:block;width:100%;height:100%;object-fit:cover}a{color:inherit}
    .report{min-width:0}.chapter{position:relative;min-height:100vh;padding:clamp(64px,7vw,108px) clamp(34px,6vw,92px);border-bottom:1px solid var(--line);overflow:hidden;background:var(--paper)}.chapter--white{background:var(--white)}.chapter--dark{background:var(--smoke);color:var(--ink)}.chapter-label{display:flex;gap:12px;align-items:center;margin-bottom:28px;color:#68716d;font-size:14px;font-weight:650;letter-spacing:.1em}.chapter-label::after{content:"";width:48px;height:1px;background:currentColor}.chapter--dark .chapter-label{color:#68716d}.section-head{margin-bottom:56px}.section-head h2{max-width:none;margin:0;font-size:clamp(42px,5.8vw,88px);font-weight:620;line-height:.98;letter-spacing:-.055em;white-space:nowrap}.section-head p{max-width:700px;margin:24px 0 0;color:var(--muted);font-size:16px;line-height:1.75}.chapter--dark .section-head p{color:var(--muted)}.eyebrow{display:block;color:var(--accent);font-size:14px;font-weight:750;letter-spacing:.1em}.tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.tags span{padding:7px 9px;border:1px solid currentColor;border-radius:999px;color:#64716d;font-size:14px;line-height:1.2}
    .cover{display:grid;grid-template-columns:minmax(0,1fr) minmax(520px,.95fr);gap:clamp(44px,6vw,104px);align-items:center;padding-top:0;padding-right:0;padding-bottom:0;background:var(--white)}.cover::before{content:"LIGHTCHAIN";position:absolute;z-index:2;top:30px;left:clamp(34px,6vw,92px);color:#6f7774;font-size:14px;font-weight:700;letter-spacing:.18em}.cover__copy{position:relative;z-index:2;max-width:720px}.cover__copy .kicker{display:block;margin-bottom:26px;color:var(--accent);font-size:14px;font-weight:700;letter-spacing:.14em}.cover h1{margin:0;font-size:clamp(64px,7.2vw,118px);font-weight:560;line-height:.88;letter-spacing:-.075em;white-space:nowrap}.cover__deck{max-width:520px;margin:34px 0 0;color:var(--muted);font-size:16px;line-height:1.72}.cover__meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));max-width:680px;margin-top:56px;padding-top:16px;border-top:1px solid var(--line)}.cover__meta div{padding-right:14px}.cover__meta span{display:block;margin-bottom:7px;color:#858c89;font-size:14px;letter-spacing:.08em}.cover__meta strong{font-size:14px;font-weight:600}.cover__visual{position:relative;height:100vh;min-height:720px}.cover__visual .hero-image{position:absolute;inset:0;margin:0}.cover__visual .hero-image img{filter:saturate(.76) contrast(.96)}
    .contents{min-height:100vh;padding:clamp(70px,8vw,124px) clamp(34px,7vw,112px);background:var(--white);color:var(--ink)}.contents__head{display:flex;align-items:flex-end;gap:28px;margin-bottom:clamp(64px,8vw,116px);padding-bottom:28px;border-bottom:1px solid var(--line)}.contents__head h2{margin:0;font-size:clamp(76px,11vw,172px);font-weight:500;line-height:.78;letter-spacing:-.075em}.contents__head p{margin:0 0 4px;color:var(--muted);font-size:18px;letter-spacing:.18em}.toc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px clamp(54px,8vw,132px)}.toc__item{display:grid;grid-template-columns:82px 1fr;gap:18px;align-items:baseline;min-height:64px;padding:10px 0;text-decoration:none}.toc__item span{color:#b7bcb8;font-size:clamp(38px,4.6vw,70px);font-weight:300;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.05em;transition:color .24s ease}.toc__item strong{font-size:clamp(18px,1.7vw,26px);font-weight:520;line-height:1.3;transition:transform .24s ease}.toc__item:hover span{color:var(--ink)}.toc__item:hover strong{transform:translateX(8px)}
    .cover h1 br,.section-head h2 br{display:none}#chapter-04{background:var(--white)}
    .scope-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}.scope-card{min-height:200px;padding:26px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.scope-card span{color:#6f7b77;font-size:14px;letter-spacing:.1em}.scope-card strong{display:block;margin-top:48px;font-size:clamp(23px,2.6vw,38px);line-height:1.08;letter-spacing:-.035em}.scope-card p{margin:12px 0 0;color:var(--muted);font-size:14px;line-height:1.6}.strategy-line{display:grid;grid-template-columns:150px 1fr;gap:36px;margin-top:56px;padding-top:24px;border-top:1px solid var(--line)}.strategy-line strong{font-size:14px}.strategy-line p{max-width:820px;margin:0;font-size:20px;line-height:1.55}
    .direction-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:58px 24px}.direction-card figure{aspect-ratio:4/4.8;margin:0;overflow:hidden;background:#dce1dd}.direction-card__copy{padding-top:18px}.direction-card h3{margin:8px 0 12px;font-size:clamp(28px,3vw,44px);line-height:1.05;letter-spacing:-.04em}.direction-card p{max-width:620px;margin:0;color:var(--muted);font-size:14px;line-height:1.72}
    .gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 18px}.gallery-card{min-width:0;margin:0}.gallery-card img{aspect-ratio:4/5;background:#d8dbd8}.gallery-card figcaption{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;padding-top:12px}.gallery-card strong{font-size:14px}.gallery-card span{min-width:0;justify-self:end;overflow:hidden;color:#747d79;font-size:14px;text-overflow:ellipsis;white-space:nowrap}
    .moodboard{display:grid;grid-template-columns:1.1fr .7fr .7fr;grid-template-rows:33vh 33vh;gap:12px}.moodboard figure{margin:0;overflow:hidden;background:#d5dad5}.moodboard figure:first-child{grid-row:1/3}.moodboard figure:nth-child(2){grid-column:2/4}.moodboard__statement{display:flex;flex-direction:column;justify-content:space-between;padding:24px;background:var(--aqua);color:#0f2927}.moodboard__statement span{font-size:14px;font-weight:800;letter-spacing:.12em}.moodboard__statement strong{font-size:clamp(24px,3vw,42px);line-height:1.05;letter-spacing:-.04em}.moodboard__note{padding:24px;background:#ded7c8}.moodboard__note p{margin:0;font-size:16px;line-height:1.65}
    .channel-grid{display:grid;grid-template-columns:180px repeat(2,minmax(0,1fr));border:1px solid #bdc2be}.channel-cell{min-height:190px;padding:24px;border-right:1px solid #bdc2be;border-bottom:1px solid #bdc2be}.channel-cell:nth-child(3n){border-right:0}.channel-cell--label{display:flex;align-items:flex-end;color:#747d79;font-size:14px;font-weight:700;letter-spacing:.1em}.channel-cell h3{margin:0;font-size:28px}.channel-cell p{margin:18px 0 0;color:var(--muted);font-size:14px;line-height:1.68}.channel-cell .tags span{color:#626b67}.wave-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:28px}.wave{padding:22px;background:#d7dad7}.wave span{color:#747d79;font-size:14px}.wave strong{display:block;margin-top:12px;font-size:18px}.wave p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.55}
    .color-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.swatch{min-height:360px;padding:20px;display:flex;flex-direction:column;justify-content:flex-end}.swatch span{font-size:14px;letter-spacing:.08em}.swatch strong{margin-top:5px;font-size:19px}.swatch--clay{background:var(--clay);color:#fff}.swatch--sage{background:var(--sage);color:#fff}.swatch--cream{background:var(--cream)}.swatch--brown{background:var(--brown);color:#fff}.swatch--aqua{background:var(--aqua)}.color-rule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:42px}.color-rule article{padding-top:18px;border-top:1px solid var(--line)}.color-rule strong{font-size:14px}.color-rule p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.65}
    .silhouette-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.silhouette-card{display:grid;grid-template-columns:1.1fr .9fr;min-height:440px;background:#fff}.silhouette-card figure{margin:0;min-height:440px;overflow:hidden}.silhouette-card div{display:flex;flex-direction:column;justify-content:flex-end;padding:26px}.silhouette-card span{color:#74807c;font-size:14px}.silhouette-card h3{margin:10px 0;font-size:28px;line-height:1.05}.silhouette-card p{margin:0;color:var(--muted);font-size:14px;line-height:1.55}
    .material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}.material-card{min-height:270px;padding:30px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.material-card small{color:#28817b;font-weight:800;letter-spacing:.12em}.material-card h3{margin:46px 0 12px;font-size:32px;line-height:1.05}.material-card p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}
    .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:48px;border-top:1px solid var(--line);border-left:1px solid var(--line)}.metric{min-height:190px;padding:24px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.metric strong{display:block;font-size:clamp(32px,4vw,58px);line-height:1;letter-spacing:-.05em}.metric span{display:block;margin-top:16px;font-size:14px;font-weight:700}.metric p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.55}.assortment-table{border-top:1px solid var(--line)}.table-row{display:grid;grid-template-columns:.8fr .75fr .42fr .75fr .85fr 1.5fr;gap:16px;align-items:start;padding:20px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.55}.table-row p{margin:0;color:var(--muted)}
    .launch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.launch-card{min-height:250px;padding:28px;background:#fff}.launch-card span{color:#27857f;font-size:14px;font-weight:800;letter-spacing:.12em}.launch-card h3{margin:48px 0 12px;font-size:27px}.launch-card p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.appendix{display:grid;grid-template-columns:minmax(0,.8fr) minmax(360px,1.2fr);gap:64px;margin-top:74px;padding-top:42px;border-top:1px solid var(--line)}.appendix h3{margin:0;font-size:34px}.appendix ul{margin:22px 0 0;padding-left:18px;color:var(--muted);line-height:1.75}.source-list{border-top:1px solid var(--line)}.source-row{display:grid;grid-template-columns:32px 130px 1fr auto;gap:14px;padding:16px 0;border-bottom:1px solid var(--line);text-decoration:none}.source-row span,.source-row p{color:var(--muted);font-size:14px}.source-row p{margin:0}.source-row b{font-weight:400}.source-row:hover strong,.source-row:hover b{color:#27857f}.footer{display:flex;justify-content:space-between;margin-top:68px;padding-top:20px;border-top:1px solid var(--line);color:#7d8884;font-size:14px;letter-spacing:.08em}
    .reveal{opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s ease}.reveal.is-visible{opacity:1;transform:none}
    @media(max-width:1180px){.scope-grid,.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.color-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.swatch{min-height:250px}.silhouette-card{grid-template-columns:1fr}}
    @media(max-width:820px){.chapter,.contents{min-height:auto;padding:64px 22px}.cover{grid-template-columns:1fr;padding:88px 22px 0}.cover::before{left:22px}.cover h1,.section-head h2{font-size:clamp(34px,10vw,52px);white-space:nowrap}.cover__meta{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.cover__visual{height:68vh;min-height:520px;margin:18px -22px 0}.contents__head{align-items:baseline;margin-bottom:54px}.section-head,.appendix{grid-template-columns:1fr}.toc{grid-template-columns:1fr}.toc__item{grid-template-columns:64px 1fr}.scope-grid,.direction-grid,.gallery-grid,.silhouette-grid,.material-grid,.launch-grid{grid-template-columns:1fr}.moodboard{grid-template-columns:1fr 1fr;grid-template-rows:44vh 30vh}.moodboard figure:first-child{grid-row:auto}.moodboard figure:nth-child(2){grid-column:auto}.channel-grid{grid-template-columns:1fr 1fr}.channel-cell:nth-child(3n){border-right:1px solid #bdc2be}.channel-cell--label{grid-column:1/-1;min-height:80px}.wave-strip,.color-rule{grid-template-columns:1fr}.table-row{grid-template-columns:1fr 1fr}.table-row p{grid-column:1/-1}.appendix{gap:36px}}
    @media(max-width:520px){.cover__meta,.scope-grid,.metrics,.color-grid{grid-template-columns:1fr}.moodboard{display:flex;flex-direction:column}.moodboard figure{height:54vh}.channel-grid{grid-template-columns:1fr}.channel-cell--label{grid-column:auto}.swatch{min-height:180px}.silhouette-card figure{min-height:55vh}.table-row{grid-template-columns:1fr}.table-row p{grid-column:auto}.source-row{grid-template-columns:28px 1fr auto}.source-row p{grid-column:2/3}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.reveal{opacity:1;transform:none;transition:none}}
    @media print{.chapter,.contents{min-height:100vh;break-after:page}.reveal{opacity:1;transform:none}.cover__visual{min-height:64vh}}
  </style>
</head>
<body>
  <main class="report">
    <section class="chapter cover" id="chapter-01" data-chapter>
      <div class="cover__copy reveal"><span class="kicker">${escapeHtml(season)} / ${escapeHtml(category)}</span><h1>新品企划案</h1><p class="cover__deck">基于已确认的趋势证据、视觉方向与 AI 款式结果，形成可执行的新品开发框架。</p><div class="cover__meta"><div><span>MARKET</span><strong>${escapeHtml(market)}</strong></div><div><span>CATEGORY</span><strong>${escapeHtml(category)}</strong></div><div><span>SEASON</span><strong>${escapeHtml(season)}</strong></div><div><span>CHANNEL</span><strong>${escapeHtml(channels)}</strong></div></div></div>
      <div class="cover__visual reveal"><figure class="hero-image"><img src="${escapeHtml(heroImage)}" alt="企划案封面"></figure></div>
    </section>
    <section class="contents" id="contents">
      <header class="contents__head reveal"><h2>Contents</h2><p>目录</p></header>
      <nav class="toc reveal" aria-label="企划案目录">${nav}</nav>
    </section>
    <section class="chapter chapter--white" id="chapter-02" data-chapter><div class="chapter-label">02 / PROJECT SCOPE</div><header class="section-head reveal"><h2>企划范围与核心客群</h2><p>先锁定市场、客群、季节与渠道角色，再讨论视觉。所有未由任务输入或经营数据支持的内容，均作为待验证假设处理。</p></header><div class="scope-grid reveal"><article class="scope-card"><span>01 · MARKET</span><strong>${escapeHtml(market)}</strong><p>当前企划的销售与沟通市场。</p></article><article class="scope-card"><span>02 · AUDIENCE</span><strong>${escapeHtml(audience)}</strong><p>以实穿、易搭配和适度女性化为核心诉求。</p></article><article class="scope-card"><span>03 · SEASON</span><strong>${escapeHtml(season)}</strong><p>覆盖首发与补充验证波段。</p></article><article class="scope-card"><span>04 · CHANNEL</span><strong>${escapeHtml(channels)}</strong><p>搜索型成交与内容型验证并行。</p></article></div><div class="strategy-line reveal"><strong>企划命题</strong><p>将成熟花卉、克制女性化与过渡季层次转换为 ${escapeHtml(category)} 商品语言，在保证日常穿着门槛的同时，建立短视频首帧可识别的视觉钩子。</p></div></section>
    <section class="chapter" id="chapter-03" data-chapter><div class="chapter-label">03 / TREND EVIDENCE</div><header class="section-head reveal"><h2>趋势证据与设计方向</h2><p>当前结论来自公开平台样本与任务中确认的视觉选择，不能直接替代销售、退货、毛利或消费者调研数据。</p></header><div class="direction-grid">${directionCards}</div></section>
    <section class="chapter chapter--white" id="chapter-04" data-chapter><div class="chapter-label">04 / REFERENCES</div><header class="section-head reveal"><h2>灵感来源图集</h2><p>保留最终确认图、方向标签与来源语境，确保后续设计、选款和对客沟通使用同一套视觉依据。</p></header><div class="gallery-grid">${gallery}</div></section>
    <section class="chapter chapter--white" id="chapter-05" data-chapter><div class="chapter-label">05 / MOODBOARD</div><header class="section-head reveal"><h2>主题情绪板</h2><p>主题不追求单一风格复刻，而是围绕“柔和、成熟、轻结构、可日常穿着”建立统一气质。</p></header><div class="moodboard reveal"><figure><img src="${escapeHtml(heroImage)}" alt="主题情绪主视觉"></figure><figure><img src="${escapeHtml(secondaryImage)}" alt="主题情绪辅助视觉"></figure><div class="moodboard__statement"><span>THEME STATEMENT</span><strong>Soft Heritage<br>柔性传承</strong></div><div class="moodboard__note"><p>用低对比花卉延续熟悉感，以轻结构和克制细节更新成熟客群的日常衣橱。</p></div></div></section>
    <section class="chapter chapter--dark" id="chapter-06" data-chapter><div class="chapter-label">06 / CHANNEL × DROP</div><header class="section-head reveal"><h2>渠道 × 波段方向</h2><p>同一商品语言在两个渠道采用不同表达逻辑；波段安排用于形成测试闭环，而不是把互动指标直接视为销量。</p></header><div class="channel-grid reveal"><div class="channel-cell channel-cell--label">CHANNEL ROLE</div>${plan.channels.map((channel) => `<article class="channel-cell"><h3>${escapeHtml(channel.name)}</h3><p>${escapeHtml(channel.strategy)}</p>${tags(channel.focus)}</article>`).join("")}<div class="channel-cell channel-cell--label">SUCCESS SIGNAL</div><article class="channel-cell"><h3>搜索成交</h3><p>关注关键词覆盖、详情页转化、尺码反馈与退货原因。</p></article><article class="channel-cell"><h3>内容验证</h3><p>关注首帧停留、商品点击、评论意图与实际成交的差异。</p></article></div><div class="wave-strip reveal"><article class="wave"><span>DROP 01</span><strong>2026.08 · 首发</strong><p>稳定款与主力款先行，覆盖夏末至初秋。</p></article><article class="wave"><span>LEARN</span><strong>4-6 周 · 复盘</strong><p>验证点击、转化、尺码与退货反馈。</p></article><article class="wave"><span>DROP 02</span><strong>2027.02 · 补充</strong><p>保留有效语言，调整比例、颜色与内容款。</p></article></div></section>
    <section class="chapter" id="chapter-07" data-chapter><div class="chapter-label">07 / COLOR SYSTEM</div><header class="section-head reveal"><h2>色彩系统</h2><p>以低对比、易搭配的成熟色盘建立系列一致性；强调色只承担内容识别，不扩大到全系列。</p></header><div class="color-grid reveal"><article class="swatch swatch--clay"><span>TCX / HERO</span><strong>陶土橙</strong></article><article class="swatch swatch--sage"><span>TCX / CORE</span><strong>雾蓝绿</strong></article><article class="swatch swatch--cream"><span>TCX / BASE</span><strong>暖米白</strong></article><article class="swatch swatch--brown"><span>TCX / ANCHOR</span><strong>深棕</strong></article><article class="swatch swatch--aqua"><span>DIGITAL / SIGNAL</span><strong>清透薄荷</strong></article></div><div class="color-rule reveal"><article><strong>60% 基础色</strong><p>暖米白与雾蓝绿支撑稳定款和大面积底色。</p></article><article><strong>30% 主题色</strong><p>陶土橙与低对比花卉建立系列识别。</p></article><article><strong>10% 强调色</strong><p>深棕收束轮廓；薄荷色仅用于数字传播提示。</p></article></div></section>
    <section class="chapter chapter--white" id="chapter-08" data-chapter><div class="chapter-label">08 / KEY SILHOUETTES</div><header class="section-head reveal"><h2>关键廓形造型</h2><p>宽松直身、柔性腰线与中长比例构成系列骨架；装饰集中在领口、袖口和局部抽褶，避免堆叠。</p></header><div class="silhouette-grid">${silhouetteCards}</div></section>
    <section class="chapter" id="chapter-09" data-chapter><div class="chapter-label">09 / MATERIAL & DETAIL</div><header class="section-head reveal"><h2>面料与细节</h2><p>本章是开发方向，不是最终物料规格。成分、克重、色牢度、MOQ、报价与交期仍需供应链验证。</p></header><div class="material-grid reveal"><article class="material-card"><small>MATERIAL 01</small><h3>轻质梭织</h3><p>用于上衣与过渡季连衣裙，优先验证垂坠感、透气性与抗皱护理。</p></article><article class="material-card"><small>MATERIAL 02</small><h3>人棉 / 粘纤混纺</h3><p>承接柔和花卉和自然垂感；需复核缩水率、耐磨与洗后尺寸稳定性。</p></article><article class="material-card"><small>DETAIL 01</small><h3>克制荷叶边</h3><p>集中在领口或袖口单一位置，控制宽度和层数，避免甜美感过度。</p></article><article class="material-card"><small>DETAIL 02</small><h3>柔性腰线与抽褶</h3><p>通过松紧、系带或局部抽褶建立包容度，同时保留正面线条的简洁。</p></article></div></section>
    <section class="chapter chapter--white" id="chapter-10" data-chapter><div class="chapter-label">10 / ASSORTMENT & PRICE</div><header class="section-head reveal"><h2>商品结构与价格</h2><p>款数和价格基于当前任务输入形成建议梯度；缺少 OTB、毛利、历史销售与供应商报价，因此不应视为最终采购计划。</p></header><div class="metrics reveal">${summaryMetrics}</div><div class="assortment-table reveal">${assortmentRows}</div></section>
    <section class="chapter" id="chapter-11" data-chapter><div class="chapter-label">11 / LAUNCH & APPENDIX</div><header class="section-head reveal"><h2>上新策略与附录</h2><p>以“小批量首发、跨渠道验证、数据复盘、补充波段”完成闭环，同时明确当前证据边界。</p></header><div class="launch-grid reveal"><article class="launch-card"><span>01 · PREPARE</span><h3>开发准备</h3><p>完成版型、工艺、报价、尺码与知识产权复核，锁定可测试 SKU。</p></article><article class="launch-card"><span>02 · LAUNCH</span><h3>双渠道首发</h3><p>Amazon 强化搜索与信息完整度；TikTok Shop 强化造型变化与首帧识别。</p></article><article class="launch-card"><span>03 · LEARN</span><h3>复盘与补充</h3><p>区分互动、点击、成交与退货信号，决定补单、改色、改版或停止。</p></article></div><div class="appendix reveal"><div><h3>待确认假设</h3><ul>${plan.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h3>公开来源入口</h3><div class="source-list">${sourceRows}</div></div></div><footer class="footer"><span>${escapeHtml(directionLabel)}</span><span>WORKING DOCUMENT · 2026.08</span></footer></section>
  </main>
  <script>
    (function(){
      var reveals=Array.prototype.slice.call(document.querySelectorAll(".reveal"));
      if("IntersectionObserver" in window){
        var revealObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;entry.target.classList.add("is-visible");revealObserver.unobserve(entry.target)})},{rootMargin:"0px 0px -8% 0px",threshold:.05});reveals.forEach(function(item){revealObserver.observe(item)});
      }else{reveals.forEach(function(item){item.classList.add("is-visible")})}
    })();
  </script>
</body>
</html>`;
}
