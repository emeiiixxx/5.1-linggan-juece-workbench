export type FashionProposalDirection = {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  signal: string;
  cue: string;
  imageUrl: string;
};

export type FashionProposalReference = {
  code: string;
  title: string;
  category: string;
  imageUrl: string;
};

export type FashionProposalHtmlOptions = {
  kind: "research" | "package" | "plan";
  directions: FashionProposalDirection[];
  references: FashionProposalReference[];
  categoryCount: number;
  directionLabel: string;
  title?: string;
  deck?: string;
  kicker?: string;
  topbarMeta?: string;
  sources?: FashionProposalSource[];
  plan?: FashionProposalPlan;
  evidenceMetrics?: { value: string; label: string }[];
};

export type FashionProposalPlan = {
  summary: { value: string; label: string; detail: string }[];
  assortment: { category: string; role: string; styles: string; price: string; channel: string; rationale: string }[];
  designGuidelines: { label: string; title: string; detail: string; tags: string[] }[];
  channels: { name: string; strategy: string; focus: string[] }[];
  assumptions: string[];
};

export type FashionProposalSource = {
  name: string;
  detail: string;
  url: string;
};

const sourceCatalog: FashionProposalSource[] = [
  { name: "TikTok Shop US", detail: "公开商品与价格样本", url: "https://shop.tiktok.com/us" },
  { name: "BELK", detail: "品牌及零售公开商品样本", url: "https://www.belk.com/" },
  { name: "ZOZOTOWN", detail: "日本女装零售供给观察", url: "https://zozo.jp/" },
  { name: "Rakuten Fashion", detail: "日本电商供给与品牌分布", url: "https://brandavenue.rakuten.co.jp/" },
];

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const sourceFor = (title: string, sources: FashionProposalSource[]) => {
  const normalizedTitle = title.toLowerCase();
  return sources.find((source) => normalizedTitle.includes(source.name.toLowerCase())) ?? sources[0] ?? sourceCatalog[0]!;
};

const tagMarkup = (tags: string[]) => `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;

export function buildFashionProposalHtml({ kind, directions, references, categoryCount, directionLabel, title: titleOverride, deck: deckOverride, kicker = "CLIENT DIRECTION PROPOSAL", topbarMeta = "Japan / Womenswear / 2026.08", sources = sourceCatalog, plan, evidenceMetrics }: FashionProposalHtmlOptions) {
  const isPackage = kind === "package";
  const isPlan = kind === "plan";
  const title = titleOverride ?? (isPlan ? "新品企划案" : isPackage ? "客户方向参考包" : "客户需求调研与视觉方向");
  const deck = deckOverride ?? (isPlan
    ? "把已确认的趋势方向、商品结构与 AI 改款图整合为可执行的新品开发方案。"
    : isPackage
    ? "把客户已确认的图像整理为可讨论、可追溯的视觉语言。"
    : "日本女装市场的小样本扫描，聚焦可执行的视觉方向与证据边界。");
  const reportSources = sources.length ? sources : sourceCatalog;
  const heroImage = references[0]?.imageUrl ?? directions[0]?.imageUrl ?? "";
  const sampleCount = isPackage || isPlan ? references.length : directions.length;
  const reportMetrics = evidenceMetrics ?? [
    { value: String(sampleCount), label: isPlan ? "确认 AI 款式图" : isPackage ? "客户已选参考图" : "候选视觉方向" },
    { value: String(directions.length), label: isPlan ? "确认视觉方向" : "已确认及待评估方向" },
    { value: String(isPackage || isPlan ? categoryCount : reportSources.length), label: isPlan ? "规划品类" : isPackage ? "素材类型" : "公开来源类型" },
  ];

  const planMarkup = isPlan && plan ? `
    <section class="section plan-overview">
      <div class="section-header" data-reveal><span class="signal">MERCHANDISING FRAME</span><h2>从视觉方向，落到商品结构。</h2><p>款数、价格与渠道角色均为本轮可执行建议；缺少历史销售、OTB 与供应商报价的部分继续标记为待确认假设。</p></div>
      <div class="plan-metrics">${plan.summary.map((item) => `<article class="plan-metric" data-reveal><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.detail)}</p></article>`).join("")}</div>
    </section>
    <section class="section assortment">
      <div class="section-header" data-reveal><span class="signal">ASSORTMENT ARCHITECTURE</span><h2>商品结构规划。</h2><p>以稳定款承接基础需求，以主力款表达方向，以测试款验证内容与比例。</p></div>
      <div class="assortment-table" data-reveal>
        <div class="assortment-row assortment-row--head"><span>品类</span><span>款式角色</span><span>款数</span><span>价格建议</span><span>渠道</span><span>规划依据</span></div>
        ${plan.assortment.map((row) => `<div class="assortment-row"><strong>${escapeHtml(row.category)}</strong><span>${escapeHtml(row.role)}</span><span>${escapeHtml(row.styles)}</span><span>${escapeHtml(row.price)}</span><span>${escapeHtml(row.channel)}</span><p>${escapeHtml(row.rationale)}</p></div>`).join("")}
      </div>
    </section>
    <section class="section design-plan">
      <div class="section-header" data-reveal><span class="signal">PRODUCT LANGUAGE</span><h2>统一波段与产品语言。</h2><p>把色彩、面料与廓形约束写入商品结构，减少后续 AI 改款和开款阶段的方向漂移。</p></div>
      <div class="design-grid">${plan.designGuidelines.map((item) => `<article class="design-card" data-reveal><span class="signal">${escapeHtml(item.label)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p>${tagMarkup(item.tags)}</article>`).join("")}</div>
    </section>
    <section class="section channel-plan">
      <div class="section-header" data-reveal><span class="signal">CHANNEL STRATEGY</span><h2>同一系列，不同渠道表达。</h2></div>
      <div class="channel-grid">${plan.channels.map((channel) => `<article class="channel-card" data-reveal><h3>${escapeHtml(channel.name)}</h3><p>${escapeHtml(channel.strategy)}</p>${tagMarkup(channel.focus)}</article>`).join("")}</div>
      <aside class="assumption-card" data-reveal><strong>待确认假设</strong><ul>${plan.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></aside>
    </section>` : "";

  const directionMarkup = directions.map((direction, index) => `
    <article class="direction direction--${index + 1}" data-reveal>
      <figure class="visual-frame direction__media" data-visual><img loading="lazy" decoding="async" src="${escapeHtml(direction.imageUrl)}" alt="${escapeHtml(direction.title)}参考图"></figure>
      <div class="direction__copy">
        <div class="direction__index">${String(index + 1).padStart(2, "0")}</div>
        <div>
          <span class="signal">${escapeHtml(direction.signal)}</span>
          <h3>${escapeHtml(direction.title)}</h3>
          <p>${escapeHtml(direction.description)}</p>
          ${tagMarkup([direction.cue, direction.recommendation])}
        </div>
      </div>
    </article>`).join("");

  const referenceMarkup = references.map((reference) => {
    const source = sourceFor(reference.title, reportSources);
    return `
      <article class="reference" data-reveal>
        <figure class="visual-frame reference__media" data-visual><img loading="lazy" decoding="async" src="${escapeHtml(reference.imageUrl)}" alt="${escapeHtml(reference.code)} ${escapeHtml(reference.category)}"></figure>
        <div class="reference__copy">
          <div class="reference__heading"><h3>${escapeHtml(reference.code)}</h3><span>${escapeHtml(reference.category)}</span></div>
          <p>${escapeHtml(reference.title)}</p>
          ${tagMarkup([isPlan ? "美国女装" : "日本女装", reference.category, "来源可追溯"])}
          <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.name}<span aria-hidden="true">↗</span></a>
        </div>
      </article>`;
  }).join("");

  const sourceMarkup = reportSources.map((source) => `
    <a class="source-row" href="${source.url}" target="_blank" rel="noreferrer">
      <strong>${source.name}</strong><span>${source.detail}</span><b aria-hidden="true">↗</b>
    </a>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--ink:#151918;--muted:#68716f;--line:#dfe3e1;--paper:#f7f8f7;--surface:#eef1ef;--accent:#087a72;--radius:2px;color-scheme:light}
    *{box-sizing:border-box}
    html{scroll-behavior:auto}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:"Helvetica Neue","Noto Sans SC","PingFang SC",Arial,sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}
    a{color:inherit}.report{min-width:0;overflow:hidden}
    .topbar{position:fixed;z-index:20;inset:0 0 auto;display:flex;height:58px;align-items:center;justify-content:flex-end;padding:0 clamp(20px,3.5vw,56px);border-bottom:1px solid var(--line);background:rgb(247 248 247/.92);backdrop-filter:blur(16px)}
    .topbar__meta{color:var(--muted);font-size:14px}
    .hero{min-height:100dvh;padding:90px clamp(20px,3.5vw,56px) 48px}.hero__heading{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:end;margin-bottom:36px}.hero__copy{min-width:0}.kicker{display:block;margin-bottom:18px;color:var(--accent);font-size:14px;font-weight:700;letter-spacing:.16em}.hero h1{max-width:100%;margin:0;font-size:clamp(48px,7vw,108px);font-weight:750;line-height:.92;letter-spacing:-.065em;white-space:nowrap}.hero__deck{max-width:none;margin:0;color:var(--muted);font-size:16px;line-height:1.75}.hero__media{height:min(62dvh,720px);margin:0;background:var(--surface)}
    .visual-frame{overflow:hidden;background:var(--surface)}.visual-frame img{display:block;width:100%;height:100%;object-fit:cover}
    .hero__foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.42fr);gap:32px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:14px;line-height:1.7}.hero__foot strong{color:var(--ink);font-weight:600}
    .section{padding:clamp(72px,9vw,140px) clamp(20px,3.5vw,56px);border-top:1px solid var(--line)}.section-header{max-width:none;margin-bottom:clamp(44px,6vw,80px)}.section-header h2{margin:0;font-size:clamp(38px,5vw,74px);font-weight:740;line-height:1.02;letter-spacing:-.05em}.section-header p{max-width:none;margin:22px 0 0;color:var(--muted);font-size:16px;line-height:1.75}
    .evidence{padding-top:68px;padding-bottom:68px}.evidence__intro{display:grid;grid-template-columns:minmax(0,.85fr) minmax(320px,1.15fr);gap:48px;align-items:end}.evidence h2{max-width:none;margin:0;font-size:clamp(36px,4.4vw,64px);line-height:1.04;letter-spacing:-.045em}.evidence p{max-width:none;margin:0;color:var(--muted);font-size:16px;line-height:1.75}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:56px;border-top:1px solid var(--line)}.metric{padding:24px 0 0}.metric+.metric{padding-left:24px;border-left:1px solid var(--line)}.metric strong{display:block;font-size:clamp(42px,6vw,82px);font-weight:720;line-height:1;letter-spacing:-.05em}.metric span{display:block;margin-top:10px;color:var(--muted);font-size:14px}
    .direction-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(48px,6vw,88px) clamp(18px,2.4vw,36px)}.direction{min-width:0}.direction__media{height:clamp(420px,48vw,720px);margin:0}.direction__copy{display:grid;grid-template-columns:36px minmax(0,1fr);gap:14px;padding-top:18px}.direction__index{padding-top:3px;color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}.signal{color:var(--accent);font-size:14px;font-weight:650}.direction h3{margin:8px 0 12px;font-size:clamp(28px,3vw,46px);font-weight:720;line-height:1.06;letter-spacing:-.04em}.direction p{max-width:560px;margin:0;color:var(--muted);font-size:14px;line-height:1.7}
    .tag-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}.tag-list span{padding:6px 8px;border:1px solid var(--line);border-radius:var(--radius);color:var(--muted);font-size:14px;line-height:1.35}
    .plan-overview{background:#fbfcfb}.plan-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}.plan-metric{min-height:220px;padding:28px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.plan-metric strong{display:block;font-size:clamp(38px,5vw,68px);line-height:1;letter-spacing:-.05em}.plan-metric span{display:block;margin-top:18px;font-size:14px;font-weight:700}.plan-metric p{margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.65}
    .assortment-table{border-top:1px solid var(--line)}.assortment-row{display:grid;grid-template-columns:.8fr .8fr .42fr .8fr .9fr 1.5fr;gap:18px;align-items:start;padding:22px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.6}.assortment-row--head{padding:12px 0;color:var(--muted);font-size:14px;font-weight:700;letter-spacing:.08em}.assortment-row strong{font-size:14px}.assortment-row p{margin:0;color:var(--muted)}
    .design-plan{background:#fbfcfb}.design-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}.design-card{min-height:240px;padding:32px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.design-card h3{margin:12px 0 0;font-size:clamp(26px,3vw,42px);line-height:1.08;letter-spacing:-.04em}.design-card p{max-width:560px;margin:18px 0 0;color:var(--muted);font-size:14px;line-height:1.72}
    .channel-plan{background:#eef1ef}.channel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}.channel-card{min-height:260px;padding:32px;background:var(--paper)}.channel-card h3{margin:0;font-size:clamp(28px,3vw,44px);letter-spacing:-.04em}.channel-card p{max-width:540px;margin:18px 0 0;color:var(--muted);font-size:14px;line-height:1.75}.assumption-card{display:grid;grid-template-columns:minmax(160px,.35fr) minmax(0,1fr);gap:28px;margin-top:48px;padding-top:24px;border-top:1px solid var(--line)}.assumption-card strong{font-size:14px}.assumption-card ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 28px;margin:0;padding-left:18px;color:var(--muted);font-size:14px;line-height:1.65}
    .references{background:#fbfcfb}.reference-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(48px,5vw,76px) clamp(16px,2vw,28px);align-items:start}.reference{min-width:0}.reference__media{aspect-ratio:4/5;margin:0}.reference__copy{padding-top:14px}.reference__heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.reference h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.025em}.reference__heading span,.reference__copy p{color:var(--muted);font-size:14px}.reference__heading span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reference__copy p{min-height:34px;margin:8px 0 0;line-height:1.55}.source-link{display:inline-flex;gap:7px;margin-top:14px;color:var(--ink);font-size:14px;font-weight:650;text-decoration:none}.source-link:hover{color:var(--accent)}
    .method{display:grid;grid-template-columns:minmax(0,.72fr) minmax(420px,1.28fr);gap:clamp(48px,8vw,120px);align-items:start}.method__copy h2{margin:0;font-size:clamp(38px,5vw,70px);font-weight:740;line-height:1.04;letter-spacing:-.05em}.method__copy p{max-width:none;margin:24px 0 0;color:var(--muted);font-size:16px;line-height:1.78}.source-list{border-top:1px solid var(--line)}.source-row{display:grid;grid-template-columns:minmax(130px,.75fr) 1.25fr auto;gap:20px;padding:22px 0;border-bottom:1px solid var(--line);text-decoration:none}.source-row strong{font-size:14px}.source-row span{color:var(--muted);font-size:14px}.source-row b{font-weight:400}.source-row:hover strong,.source-row:hover b{color:var(--accent)}
    .footer{display:flex;align-items:flex-end;justify-content:flex-end;gap:32px;padding:42px clamp(20px,3.5vw,56px) 56px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
    [data-reveal],[data-visual] img{will-change:transform,opacity}
    @media(max-width:1024px){.reference-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:1024px){.plan-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.assortment-row{grid-template-columns:repeat(5,minmax(0,1fr))}.assortment-row>p{grid-column:1/-1}.assortment-row--head span:last-child{display:none}}
    @media(max-width:820px){.topbar__meta{display:none}.hero{padding-top:88px}.hero__heading,.hero__foot,.evidence__intro,.method{grid-template-columns:1fr}.hero h1{font-size:clamp(42px,12vw,66px);white-space:normal}.hero__media{height:58dvh}.hero__foot{gap:10px}.metrics{grid-template-columns:1fr}.metric+.metric{padding-left:0;border-left:0}.direction-list,.reference-grid,.channel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.direction__media{height:56dvh}.source-row{grid-template-columns:1fr auto}.source-row span{grid-column:1/2}.assumption-card{grid-template-columns:1fr}.footer{align-items:flex-start;flex-direction:column}}
    @media(max-width:560px){.direction-list,.reference-grid,.design-grid{grid-template-columns:1fr}.reference__copy p{min-height:0}}
    @media(prefers-reduced-motion:reduce){[data-reveal],[data-visual] img{will-change:auto!important;transform:none!important;opacity:1!important;visibility:visible!important}}
  </style>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
</head>
<body>
  <main class="report">
    <nav class="topbar"><span class="topbar__meta">${escapeHtml(topbarMeta)}</span></nav>
    <header class="hero">
      <div class="hero__heading"><div class="hero__copy"><span class="kicker">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1></div><p class="hero__deck">${escapeHtml(deck)}</p></div>
      <figure class="visual-frame hero__media"><img src="${escapeHtml(heroImage)}" alt="${title}封面视觉"></figure>
      <div class="hero__foot"><span><strong>方向依据</strong> ${escapeHtml(directionLabel)}</span><span>公开渠道样本与客户已选素材均保留来源边界。</span></div>
    </header>
    <section class="section evidence">
      <div class="evidence__intro" data-reveal><h2>先说明为什么，再呈现选什么。</h2><p>数字只描述本次工作样本，不将社媒互动、电商陈列或品牌采用直接等同于销量。</p></div>
      <div class="metrics" data-reveal>${reportMetrics.map((metric) => `<div class="metric"><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.label)}</span></div>`).join("")}</div>
    </section>
    ${directionMarkup ? `<section class="section"><div class="section-header" data-reveal><h2>${isPlan ? "已确认视觉方向。" : "方向需要能被执行。"}</h2><p>${isPlan ? "方向已经完成确认，并作为商品结构与 AI 改款的共同设计约束。" : "每个方向同时保留市场信号、造型语言与下一步验证建议。"}</p></div><div class="direction-list">${directionMarkup}</div></section>` : ""}
    ${planMarkup}
    ${referenceMarkup ? `<section class="section references"><div class="section-header" data-reveal><h2>${isPlan ? "确认 AI 款式图。" : "客户已选素材。"}</h2><p>${isPlan ? "以下款式图已由用户确认并写入本次企划，作为后续开款与客户沟通的视觉依据。" : "图像、标题、设计标签和原始来源一起保留，避免在提案传递中失真。"}</p></div><div class="reference-grid">${referenceMarkup}</div></section>` : ""}
    <section class="section method"><div class="method__copy" data-reveal><h2>证据可追溯，结论才可讨论。</h2><p>以下链接是本原型用于说明证据结构的公开渠道入口。正式项目应继续记录具体商品页、采集时间、授权状态与样本口径。</p></div><div class="source-list" data-reveal>${sourceMarkup}</div></section>
    <footer class="footer"><span>CLIENT WORKING DOCUMENT / SOURCE BOUNDARIES RETAINED</span></footer>
  </main>
  <script>
    window.addEventListener("load",function(){
      if(!window.gsap||!window.ScrollTrigger||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
      gsap.registerPlugin(ScrollTrigger);
      gsap.from(".topbar",{autoAlpha:0,y:-8,duration:.45,ease:"power3.out",clearProps:"opacity,visibility,transform"});
      gsap.from(".hero__heading > *",{autoAlpha:0,y:16,duration:.62,stagger:.07,ease:"power3.out",delay:.08,clearProps:"opacity,visibility,transform"});
      gsap.from(".hero__media",{autoAlpha:0,scale:.992,duration:.78,ease:"power3.out",delay:.16,clearProps:"opacity,visibility,transform"});
      gsap.from(".hero__media img",{scale:1.025,duration:1.05,ease:"power2.out",delay:.16,clearProps:"transform"});
      gsap.set("[data-reveal]",{autoAlpha:0,y:18});
      ScrollTrigger.batch("[data-reveal]",{start:"top 88%",once:true,interval:.08,batchMax:4,onEnter:function(items){gsap.to(items,{autoAlpha:1,y:0,duration:.58,stagger:.06,ease:"power3.out",overwrite:true,clearProps:"opacity,visibility,transform,willChange"})}});
      ScrollTrigger.batch("[data-visual]",{start:"top 90%",once:true,interval:.08,batchMax:4,onEnter:function(frames){frames.forEach(function(frame){var image=frame.querySelector("img");if(image)gsap.fromTo(image,{autoAlpha:.86,scale:1.025},{autoAlpha:1,scale:1,duration:.72,ease:"power3.out",overwrite:true,clearProps:"opacity,visibility,transform,willChange"})})}});
      requestAnimationFrame(function(){ScrollTrigger.refresh()});
    });
  </script>
</body>
</html>`;
}
