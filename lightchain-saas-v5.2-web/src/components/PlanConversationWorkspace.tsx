import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";
import { BusinessButton, Button } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { ImageActionBar, ImageLightbox, ImageSelection } from "./ImageSelection";
import { Toast } from "./Toast";
import { Radio } from "./Radio";
import {
  AnalysisStepIcon,
  ConversationFeed,
  ConversationFormTitle,
  ConversationSingleChoiceList,
  ConversationTaskCompletion,
  TaskProgressSummary,
  ConversationUserMessage,
  TaskArtifactRow,
  TaskDisclosure,
} from "./ConversationPrimitives";
import { useGsapEntrance } from "../motion/gsap";

type PlanStage =
  | "theme"
  | "references"
  | "more-loading"
  | "more-references"
  | "analysis-loading"
  | "directions"
  | "export"
  | "exporting"
  | "complete";

const themeGroups = [
  [
    ["mindful", "慢活节奏", "Mindful Rhythm"],
    ["urban", "都会探寻者", "Urban Explorer"],
    ["nostalgic", "怀旧新语", "Nostalgic Nouveau"],
    ["softness", "柔韧姿态", "Resilient Softness"],
  ],
  [
    ["natural-ease", "自然通勤", "Natural Ease"],
    ["coastal-nomad", "海岸漫游", "Coastal Nomad"],
    ["light-structure", "轻量构筑", "Light Structure"],
    ["retro-motion", "复古动势", "Retro Motion"],
  ],
  [
    ["quiet-utility", "静谧机能", "Quiet Utility"],
    ["sunlit-layers", "日光层叠", "Sunlit Layers"],
    ["urban-sojourn", "都市旅居", "Urban Sojourn"],
    ["neo-collegiate", "新经典运动", "Neo Collegiate"],
  ],
] as const;

const referenceImages = Array.from({ length: 12 }, (_, index) => `assets/plan-flow/reference-${String(index + 1).padStart(2, "0")}.jpg`);
const jacketImages = Array.from({ length: 4 }, () => "assets/apparel-design/candidate-jacket.png");
const planFileIcons = {
  PPT: assetUrl("assets/figma-icons/file-ppt.svg"),
  HTML: assetUrl("assets/figma-icons/file-html.svg"),
};
const generationSteps = [
  { title: "我正在为企划的封面部分生成图像。", images: ["assets/figma-confirmed/trend-direction-thumbnail.png"] },
  { title: "我正在为企划的关键造型部分生成图像", images: [referenceImages[1], referenceImages[2], referenceImages[3], referenceImages[4]] },
  { title: "我正在为企划的主推细节及图案部分生成图像。", images: [referenceImages[5], referenceImages[6], referenceImages[7], referenceImages[8]] },
  { title: "生成的内容", images: [referenceImages[0], referenceImages[3], referenceImages[5], referenceImages[7]] },
  { title: "生成的内容", images: [referenceImages[2], referenceImages[4], referenceImages[8], referenceImages[10]] },
] as const;
const stageOrder: PlanStage[] = ["theme", "references", "more-loading", "more-references", "analysis-loading", "directions", "export", "exporting", "complete"];

function AssistantMessage({ children, className = "", actions = true }: { children: ReactNode; className?: string; actions?: boolean }) {
  const messageRef = useGsapEntrance<HTMLElement>();
  return <article ref={messageRef} className={`conversation-message conversation-message--assistant plan-assistant-message ${className}`} data-message-actions={actions ? "true" : undefined}>{children}</article>;
}

function ToolProgress({ id, complete, lines }: { id: string; complete: boolean; lines: string[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <TaskDisclosure title="工具调用" expanded={expanded} complete={complete} controlsId={id} onToggle={() => setExpanded((open) => !open)}>
      {lines.map((line, index) => <div key={`${line}-${index}`}><AnalysisStepIcon complete={complete} delay={index * 0.06} /><span>{line}</span></div>)}
    </TaskDisclosure>
  );
}

function GeneratedImageStep({ id, title, images, complete, favorites, onPreview, onFavorite }: {
  id: string;
  title: string;
  images: readonly string[];
  complete: boolean;
  favorites: ReadonlySet<string>;
  onPreview: (src: string) => void;
  onFavorite: (src: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <TaskDisclosure title={title} expanded={expanded} complete={complete} controlsId={id} onToggle={() => setExpanded((open) => !open)}>
      {complete ? (
        <div className={`plan-generation-image-grid ${images.length === 1 ? "is-single" : ""}`}>
          {images.map((src, index) => (
            <div className="plan-generation-image" key={`${src}-${index}`}>
              <button type="button" aria-label={`查看生成图片 ${index + 1}`} onClick={() => onPreview(src)}>
                <img src={assetUrl(src)} alt={`企划生成内容 ${index + 1}`} />
              </button>
              <ImageActionBar
                favorited={favorites.has(src)}
                onFavorite={() => onFavorite(src)}
                onDownload={() => {
                  const link = document.createElement("a");
                  link.href = assetUrl(src);
                  link.download = `plan-generated-${index + 1}.jpg`;
                  link.click();
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </TaskDisclosure>
  );
}

function ReferenceAnalysisStep({ complete }: { complete: boolean }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <TaskDisclosure
      title="我正在对您选择的参考图片进行分析"
      expanded={expanded}
      complete={complete}
      controlsId="plan-reference-analysis"
      onToggle={() => setExpanded((open) => !open)}
    >
      {complete ? (
        <div className="plan-reference-analysis-copy">
          <section>
            <h3>颜色特征</h3>
            <ul>
              <li>主题色：经典蓝 (Classic Blue) 19-4052 TCX
                <ul><li>流行色分析阐述：经典蓝以其深邃而富有内涵的色泽，在本系列中作为核心主调贯穿始终。它不仅是沉稳与可靠的象征，更传递出一种平和、宁静的视觉感受。在当下快节奏的生活中，经典蓝能够唤起人们对稳定与信任的渴望，代表着一种返璞归真的生活态度。其通用性极强，既能单独呈现出低调的奢华感，又能作为百搭色与各种明亮或中性色完美融合。经典蓝的应用体现了对永恒风格的追求，它超越了短暂的流行趋势，成为衣橱中不可或缺的经典色彩，带来舒适且自信的穿着体验。</li></ul>
              </li>
              <li>副色1：晴空蓝 (Misty Blue) 14-4123 TCX
                <ul><li>作为主题色的延伸，晴空蓝是一种更清新、明亮的蓝色调，多用于丹宁面料，为整体造型注入轻松与活力，与经典蓝形成深浅对比，丰富色彩层次。</li></ul>
              </li>
              <li>副色2：活泼珊瑚橘 (Living Coral) 16-1546 TCX
                <ul><li>作为点缀色，活泼珊瑚橘以其温暖而富有生机的特质，在整体偏向中性与冷调的色彩体系中脱颖而出，为服装增添一抹跳跃的亮色，展现积极乐观的时尚态度。</li></ul>
              </li>
              <li>基础色1：亮白 (Bright White) 11-0601 TCX
                <ul><li>纯净的白色是经典的内搭或单品选择，提供清爽明亮的视觉平衡，提升整体造型的简洁度与干净感。</li></ul>
              </li>
              <li>基础色2：原色米白 (Pristine) 11-0606 TCX
                <ul><li>柔和的米白色带来自然舒适的氛围，常用于裤装或外套，与深色系搭配时能缓和视觉冲击，营造出休闲而优雅的格调。</li></ul>
              </li>
              <li>基础色3：深地衣绿 (Deep Lichen Green) 19-0622 TCX
                <ul><li>深沉的军绿色调，赋予服装一丝户外与工装的实用感，与丹宁、米白等颜色搭配时，展现出沉稳且富有层次的自然风格。</li></ul>
              </li>
            </ul>
          </section>
          <section>
            <h3>面料特征</h3>
            <ul>
              <li>水洗丹宁 (Washed Denim)：该面料呈现中度至浅度的蓝色调，经过特殊水洗工艺处理，触感柔软，具有自然的磨损和洗白效果，赋予服装休闲、复古的风格。其经典的斜纹组织结构坚韧耐穿，适应多种日常穿着场景，是休闲时尚的标志性面料，常见于牛仔裤、短裤及牛仔外套。</li>
              <li>纯棉针织 (Cotton Jersey/Knit)：广泛应用于T恤和卫衣，以其柔软、透气、吸湿的特性提供极佳的穿着舒适度。面料表面平整或略带肌理感，具有良好的弹性和垂坠性，适合制作休闲、宽松的廓形，易于日常打理，是打造舒适日常装束的理想选择。</li>
              <li>棉麻混纺粗纺织物 (Cotton-Linen Blend Textured Weave)：尤其体现在珊瑚橘色短袖衬衫上，该面料通常具有明显的粗犷肌理和轻微的绒毛感，融合了棉的柔软与麻的挺括，透气性好，带有自然、未经雕琢的质朴感，风格独特，适合营造轻松随性的度假或休闲氛围。</li>
              <li>斜纹棉布 (Cotton Twill)：广泛用于长裤和短裤，其独特的斜向纹理使其比平纹棉布更耐磨、不易变形。面料通常具有一定的厚度和挺括度，手感舒适，穿着有型，适合打造工装风格或日常休闲裤装，同时保持了良好的透气性。</li>
            </ul>
          </section>
          <section>
            <h3>服装设计特征</h3>
            <ul>
              <li>设计特点1：宽松舒适的廓形 (Relaxed &amp; Comfortable Silhouettes) 多款服装都采用宽松剪裁，如阔腿裤、宽松短裤、落肩衬衫和卫衣。这种设计强调穿着的舒适性和无拘束感，提供了更大的活动空间，同时也营造出一种随性、自在的时尚态度。宽松的剪裁弱化了身体曲线，展现出一种不刻意、不拘谨的休闲风格，符合现代人对休闲生活方式的追求。</li>
              <li>设计特点2：多层次叠穿与解构细节 (Layering &amp; Deconstructed Details) 多张图片展示了衬衫内搭T恤的叠穿方式，以及衬衫和卫衣下摆露出内搭的设计，这种穿法增加了服装的层次感和搭配的趣味性。此外，部分服装（如珊瑚橘色衬衫）的口袋边缘呈现毛边或不规则的解构细节，或格子衬衫的色块拼接，增添了服装的视觉层次感和未经修饰的质朴手工感，强化了休闲与个性化的表达。</li>
              <li>主题图案1：经典格纹 (Classic Plaid) 多次出现于衬衫设计中，包括较小的千鸟格纹和更大的窗格纹。格纹图案以其有序的重复性带来视觉上的稳定感，同时通过不同的配色组合展现出复古或休闲的风格，是经久不衰的时尚元素。它易于与纯色单品搭配，提升整体造型的丰富度，为休闲衬衫增添了经典英伦或美式复古的韵味。</li>
              <li>主题图案2：简约条纹 (Minimalist Stripes) 在衬衫中以竖向细条纹的形式呈现，通常搭配对比色或同色系深浅变化。条纹设计简洁明快，具有视觉拉伸效果，为整体造型增添一抹清爽和学院气息。无论是作为休闲单品，还是与基础色系搭配，都能营造出干净利落的时尚感，是打造低调精致休闲风格的常用元素。</li>
            </ul>
          </section>
        </div>
      ) : null}
    </TaskDisclosure>
  );
}

function LegacyThemeAnalysis() {
  return (
    <div className="plan-legacy-analysis">
      <p>根据对 Gap SPRING-SUMMER 2026 系列的相关主题内容、灵感和评论的收集与分析，以下是其核心概括及四个类似的设计主题扩写：</p>

      <section>
        <h3>Gap SPRING-SUMMER 2026 系列核心主题、灵感与评论：</h3>
        <p>Gap 2026 春夏系列以“Move forward in GAP.”（走出这一刻）为核心主张，旨在鼓励人们在快节奏的当下，敢于停下，聆听内心，重新蓄力，然后更加坚定地向前迈进。这一主题通过品牌代言人成毅的广告大片进行诠释，片中成毅置身于“安全屋”中，展现了在停顿中重整自我的理念。</p>
        <h4>主要灵感和特点：</h4>
        <ul>
          <li><strong>「GAP Boyfriend」：</strong>灵感来源于成毅干净克制的少年感，主打“松弛有度，简约有魂”，包含衬衫、卫衣和牛仔裤，以宽松利落的廓形保留身体的自由。</li>
          <li><strong>90 年代复古风潮：</strong>系列融入了 90 年代的流行元素，如修身直筒牛仔裤、低腰宽松牛仔裤、渔夫帽、阔腿裤、系带背心等，并结合了巴黎粉等流行色彩。</li>
          <li><strong>面料与细节：</strong>注重优质面料的使用，如亚麻混纺、100% 纯棉，强调舒适性与质感。例如亚麻系列手感扎实、垂坠感出色；丹宁布料增加微弹力以提升穿着舒适度。</li>
        </ul>
        <p><strong>评论：</strong>消费者普遍认为 Gap 提供可靠、舒适的日常基础款，尤其在牛仔、T 恤和童装方面表现出色。其服装品质优良，穿着舒适，设计经典，尺码稳定。然而，也有评论指出 Gap 的尺码偏大，部分款式可能显得较为普通，有时存在品控不一的现象（如针织衫起球、领口变形），以及品牌 Logo 使用过于频繁的问题。尽管如此，随着新的设计方向和 Zac Posen 的加入，Gap 的系列开始显得更具新鲜感和时尚关联性。</p>
      </section>

      <section>
        <h3>扩写 4 个类似的设计主题：</h3>
        <p>基于 Gap SPRING-SUMMER 2026 的核心理念，以下扩写四个类似的设计主题，以提供更多元化的灵感和方向：</p>
        <ol className="plan-theme-analysis-list">
          <li>
            <h4>“慢活节奏（Mindful Rhythm）”</h4>
            <p><strong>主题内容：</strong>关注在快节奏生活中有意识地放慢脚步，通过简洁、舒适且经得起时间考验的设计，帮助穿着者重新感受身体、情绪与自然环境之间的连接。</p>
            <ul>
              <li><strong>色彩：</strong>以舒缓的自然色系为主，如砂岩白、橄榄灰、雾蓝色、燕麦色、浅卡其，辅以少量低饱和度的苔绿色或大地棕作为点缀。</li>
              <li><strong>材质：</strong>采用天然、环保、亲肤且具有良好垂坠感的材质，如有机棉、再生亚麻、天丝、桑蚕丝混纺、轻薄美利奴羊毛，强调面料的肌理感和透气性。</li>
              <li><strong>廓形：</strong>宽松、流动、解构化的剪裁，如 oversized 衬衫、和服式外套、阔腿裤、A 字或直筒连衣裙，强调身体的自由度与服装的随性美。</li>
            </ul>
          </li>
          <li>
            <h4>“都会探寻者（Urban Explorer）”</h4>
            <p><strong>主题内容：</strong>为穿梭于城市不同场景的现代人打造灵活衣橱，在通勤、社交与短途出行之间自由切换，以功能细节和克制设计回应都会生活。</p>
            <ul>
              <li><strong>色彩：</strong>基础的黑、白、灰、海军蓝，搭配跳跃的亮色（如电光蓝、橘红、柠檬黄）或大胆的撞色设计。</li>
              <li><strong>材质：</strong>兼具功能性的面料，如防泼水科技棉、抗皱混纺、轻量尼龙、具有弹力的丹宁布，强调耐用性和易打理性。</li>
              <li><strong>廓形：</strong>结构感与松弛感并存，如箱型短夹克、直筒或微锥形裤、宽松衬衫、A 字半裙，强调利落的剪裁和灵活的搭配性。</li>
            </ul>
          </li>
          <li>
            <h4>“怀旧新语（Nostalgic Nouveau）”</h4>
            <p><strong>主题内容：</strong>延续 Gap 对 90 年代复古潮流的致敬，但将其视野扩展至更广阔的复古年代（如 70、80 年代），并结合现代审美进行创新，创造出既有历史韵味又不失前卫的风格。</p>
            <ul>
              <li><strong>色彩：</strong>复古大地色系（焦糖色、深棕色）、暖色调（芥末黄、锈红色）、饱和度较高的宝石色（祖母绿、宝蓝），以及经典的水洗丹宁蓝。</li>
              <li><strong>材质：</strong>做旧丹宁、灯芯绒、麂皮绒、带有微闪的针织、印花雪纺、柔软棉布。</li>
              <li><strong>廓形：</strong>喇叭裤、阔腿裤、高腰 A 字裙、泡泡袖衬衫、宽松牛仔外套、垫肩西装外套，并结合现代剪裁，避免过于僵硬。</li>
            </ul>
          </li>
          <li>
            <h4>“柔韧姿态（Resilient Softness）”</h4>
            <p><strong>主题内容：</strong>以柔软但不脆弱的设计语言表达当代人的内在力量，让服装在贴合身体、提供保护与保持轻盈之间取得平衡。</p>
            <ul>
              <li><strong>色彩：</strong>治愈系的柔和色彩，如乳白色、淡粉色、香芋紫、浅灰蓝、米色，以及少量带有光泽感的金属色或珍珠光泽。</li>
              <li><strong>材质：</strong>亲肤且具有良好弹性和悬垂感的面料，如莫代尔、莱赛尔纤维、高弹力针织、缎面、柔软的羊绒混纺。</li>
              <li><strong>廓形：</strong>贴合身形但不紧绷的流线型剪裁，如垂坠感长裙、修身针织上衣、微喇裤、围裹式设计、不对称下摆，强调线条的流畅性和身体的舒适感。</li>
            </ul>
          </li>
        </ol>
      </section>
    </div>
  );
}

export function PlanConversationWorkspace({ prompt }: { prompt: string }) {
  const [stage, setStage] = useState<PlanStage>("theme");
  const [theme, setTheme] = useState("");
  const [themeGroupIndex, setThemeGroupIndex] = useState(0);
  const [initialTrendReady, setInitialTrendReady] = useState(false);
  const [initialImageReady, setInitialImageReady] = useState(false);
  const [referenceToolsReady, setReferenceToolsReady] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [favoriteImages, setFavoriteImages] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState("");
  const [firstSelection, setFirstSelection] = useState<number[]>([]);
  const [moreSelection, setMoreSelection] = useState<number[]>([]);
  const [requestedMore, setRequestedMore] = useState(false);
  const [exportFormat, setExportFormat] = useState<"PPT" | "HTML" | "PPT与HTML">("PPT");
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const stageIndex = stageOrder.indexOf(stage);
  const availableThemes = themeGroups[themeGroupIndex % themeGroups.length];
  const themeLabel = useMemo(() => {
    const selected = availableThemes.find(([id]) => id === theme) ?? availableThemes[0];
    return `${selected[1]} (${selected[2]})`;
  }, [availableThemes, theme]);

  const refreshThemes = () => {
    setTheme("");
    setThemeGroupIndex((current) => (current + 1) % themeGroups.length);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setInitialTrendReady(true), 2300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialTrendReady || initialImageReady) return;
    const timer = window.setTimeout(() => setInitialImageReady(true), 2400);
    return () => window.clearTimeout(timer);
  }, [initialImageReady, initialTrendReady]);

  useEffect(() => {
    if (stage !== "references" || referenceToolsReady) return;
    const timer = window.setTimeout(() => setReferenceToolsReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [referenceToolsReady, stage]);

  useEffect(() => {
    if (stage !== "directions") return;
    if (generationStep >= generationSteps.length) {
      setStage("export");
      return;
    }
    const timer = window.setTimeout(() => setGenerationStep((current) => current + 1), 2500);
    return () => window.clearTimeout(timer);
  }, [generationStep, stage]);

  useEffect(() => {
    if (stage !== "more-loading" && stage !== "analysis-loading" && stage !== "exporting") return;
    const next: Record<"more-loading" | "analysis-loading" | "exporting", PlanStage> = {
      "more-loading": "more-references",
      "analysis-loading": "directions",
      exporting: "complete",
    };
    const delay = stage === "analysis-loading" ? 2600 : stage === "more-loading" ? 2400 : 2300;
    const timer = window.setTimeout(() => setStage(next[stage]), delay);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => feedEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" }));
    return () => window.cancelAnimationFrame(frame);
  }, [generationStep, initialImageReady, initialTrendReady, reduceMotion, referenceToolsReady, stage]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const toggleSelection = (index: number, values: number[], update: (next: number[]) => void) => {
    update(values.includes(index) ? values.filter((value) => value !== index) : [...values, index]);
  };

  const toggleFavorite = (src: string) => {
    const removing = favoriteImages.has(src);
    setFavoriteImages((current) => {
      const next = new Set(current);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
    setToast(removing ? "已取消收藏" : "收藏成功");
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 2000);
  };

  const downloadReferenceImage = (src: string, index: number) => {
    const link = document.createElement("a");
    link.href = assetUrl(src);
    link.download = `plan-reference-${index + 1}.jpg`;
    link.click();
  };

  const createHtmlPlanUrl = () => {
    const html = `<!doctype html><meta charset="utf-8"><title>巴洛克航海梦设计企划案</title><h1>巴洛克航海梦设计企划案</h1><p>主题：${themeLabel}</p><p>Gap Spring-Summer 2026 男装系列视觉企划。</p>`;
    return URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  };

  const previewPlan = () => {
    const url = createHtmlPlanUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadHtmlPlan = () => {
    const url = createHtmlPlanUrl();
    const link = document.createElement("a");
    link.href = url;
    link.download = "巴洛克航海梦设计企划案.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPptPlan = () => {
    const presentation = `巴洛克航海梦设计企划案\n\n主题：${themeLabel}\nGap Spring-Summer 2026 男装系列视觉企划。`;
    const url = URL.createObjectURL(new Blob([presentation], { type: "application/vnd.ms-powerpoint;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "巴洛克航海梦设计企划案.ppt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const taskStates = [
    stageIndex > 0 ? "complete" : "loading",
    stageIndex > 3 ? "complete" : stageIndex > 0 ? "loading" : "pending",
    stageIndex > 5 ? "complete" : stageIndex >= 4 ? "loading" : "pending",
    stageIndex > 6 ? "complete" : stageIndex === 6 ? "loading" : "pending",
    stage === "complete" ? "complete" : stage === "exporting" ? "loading" : "pending",
  ] as const;

  return (
    <motion.main className={`workspace-region workspace-region--conversation plan-workspace ${detailPanelOpen ? "has-detail-panel" : ""}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="conversation-stage" aria-label="企划案任务对话">
        <div className="conversation-scroll">
          <ConversationFeed className="plan-conversation-feed">
            <ConversationUserMessage entrance>{prompt}</ConversationUserMessage>
            <AssistantMessage actions={false}>
              <p>我正在从网络上搜索 Gap SPRING-SUMMER 2026 的最新流行趋势信息，以便为您拓展设计主题。</p>
              <ToolProgress id="plan-initial-trend-tools" complete={initialTrendReady} lines={["工具调用详情", "工具调用详情", "工具调用详情", "工具调用详情"]} />
            </AssistantMessage>
            {initialTrendReady ? <AssistantMessage className="plan-brief-copy">
              <LegacyThemeAnalysis />
            </AssistantMessage> : null}
            {initialTrendReady ? <AssistantMessage actions={false}>
              <p>我正在搜集一些 Gap SPRING-SUMMER 2026 男装系列的图片。</p>
              <ToolProgress id="plan-initial-image-tools" complete={initialImageReady} lines={["工具调用详情", "工具调用详情", "工具调用详情"]} />
            </AssistantMessage> : null}
            {initialImageReady ? <AssistantMessage>
              <p>请选择一个您喜欢的设计主题，或选择“都不喜欢”以便我重新推荐：</p>
              <section className={`plan-choice-form ${stage !== "theme" ? "is-readonly" : ""}`} data-message-meta="disabled" data-copy-exclude="true">
                <ConversationFormTitle title="设计需求" status={stage === "theme" ? "pending" : "confirmed"} statusLabel={stage === "theme" ? "待确认" : "已确认"} />
                <ConversationSingleChoiceList
                  options={availableThemes.map(([id, zh, en]) => ({ value: id, label: `${zh} (${en})` }))}
                  value={theme}
                  disabled={stage !== "theme"}
                  ariaLabel="选择设计主题"
                  onChange={setTheme}
                />
                {stage === "theme" ? <div className="plan-form-actions"><Button variant="outline" size="small" onClick={refreshThemes}>都不喜欢，重新推荐</Button><Button variant="primary" disabled={!theme} onClick={() => setStage("references")}>提交需求</Button></div> : null}
              </section>
            </AssistantMessage> : null}

            {stageIndex >= 1 ? <ConversationUserMessage>{themeLabel}</ConversationUserMessage> : null}
            {stageIndex >= 1 ? (
              <AssistantMessage actions={false}>
                <p>我正在搜集更多 Gap SPRING-SUMMER 2026 男装系列的图片。</p>
                <ToolProgress id="plan-initial-reference-tools" complete={referenceToolsReady} lines={["搜索品牌秀场与造型资料", "整理面料、廓形与配色参考"]} />
              </AssistantMessage>
            ) : null}
            {stageIndex >= 1 && referenceToolsReady ? (
              <AssistantMessage actions={false}>
                <p>请从以下图片中选择您喜欢的参考图片，或选择“需要更多参考图片”来获取更多选项，选择“生成企划”以继续下一步。</p>
                <section className="plan-choice-form" data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="设计需求" status={stage === "references" ? "pending" : "confirmed"} statusLabel={stage === "references" ? "待确认" : "已确认"} />
                  <div className="image-selection-grid" role="group" aria-label="企划案参考图片，支持多选">
                    {jacketImages.map((src, index) => <ImageSelection
                      src={assetUrl(src)}
                      alt={`Gap 2026 春夏男装参考 ${index + 1}`}
                      selected={firstSelection.includes(index)}
                      favorited={favoriteImages.has(src)}
                      disabled={stage !== "references"}
                      onSelect={() => toggleSelection(index, firstSelection, setFirstSelection)}
                      onPreview={() => setPreview(src)}
                      onFavorite={() => toggleFavorite(src)}
                      onDownload={() => downloadReferenceImage(src, index)}
                      key={`${src}-${index}`}
                    />)}
                  </div>
                  {stage === "references" ? <div className="plan-form-actions"><Button variant="outline" size="small" onClick={() => { setRequestedMore(true); setStage("more-loading"); }}>需要更多参考图片</Button><BusinessButton points={300} disabled={!firstSelection.length} onClick={() => setStage("analysis-loading")}>生成企划</BusinessButton></div> : null}
                </section>
              </AssistantMessage>
            ) : null}

            {requestedMore && stageIndex >= 2 && stage !== "references" ? <ConversationUserMessage>{stageIndex >= 4 ? "图片名字图片名字图片名字。需要更多参考图" : "需要更多参考图片"}</ConversationUserMessage> : null}
            {requestedMore && stageIndex >= 2 ? (
              <AssistantMessage actions={false}>
                <p>我正在搜集更多 Gap SPRING-SUMMER 2026 男装系列的图片。</p>
                <ToolProgress id="plan-expanded-reference-tools" complete={stage !== "more-loading"} lines={["扩大品牌、街拍与零售造型检索", "过滤重复图片并整理新候选"]} />
              </AssistantMessage>
            ) : null}
            {requestedMore && stageIndex >= 3 ? (
              <AssistantMessage actions={false}>
                <p>请从以下图片中选择您喜欢的参考图片，或选择“需要更多参考图片”来获取更多选项，选择“生成企划”以继续下一步。</p>
                <section className="plan-choice-form" data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="设计需求" status={stage === "more-references" ? "pending" : "confirmed"} statusLabel={stage === "more-references" ? "待确认" : "已确认"} />
                  <div className="image-selection-grid" role="group" aria-label="企划案参考图片，支持多选">
                    {referenceImages.map((src, index) => <ImageSelection
                      src={assetUrl(src)}
                      alt={`Gap 2026 春夏男装参考 ${index + 1}`}
                      selected={moreSelection.includes(index)}
                      favorited={favoriteImages.has(src)}
                      disabled={stage !== "more-references"}
                      onSelect={() => toggleSelection(index, moreSelection, setMoreSelection)}
                      onPreview={() => setPreview(src)}
                      onFavorite={() => toggleFavorite(src)}
                      onDownload={() => downloadReferenceImage(src, index)}
                      key={`${src}-${index}`}
                    />)}
                  </div>
                  {stage === "more-references" ? <div className="plan-form-actions"><Button variant="outline" size="small" onClick={() => setMoreSelection((current) => current.length ? current : [0])}>需要更多参考图片</Button><BusinessButton points={300} disabled={!moreSelection.length} onClick={() => setStage("analysis-loading")}>生成企划</BusinessButton></div> : null}
                </section>
              </AssistantMessage>
            ) : null}

            {stageIndex >= 4 ? <ConversationUserMessage>{moreSelection.map((index) => `参考图 ${index + 1}`).join("、") || "生成企划"}</ConversationUserMessage> : null}
            {stageIndex >= 4 ? (
              <AssistantMessage className="plan-analysis-copy" actions={false}>
                <ReferenceAnalysisStep complete={stageIndex >= 5} />
                {stageIndex >= 5 ? <div className="plan-generation-steps">
                  {generationSteps.map((step, index) => index <= generationStep ? (
                    <GeneratedImageStep
                      id={`plan-generation-step-${index}`}
                      title={step.title}
                      images={step.images}
                      complete={index < generationStep || stage !== "directions"}
                      favorites={favoriteImages}
                      onPreview={setPreview}
                      onFavorite={toggleFavorite}
                      key={`${step.title}-${index}`}
                    />
                  ) : null)}
                </div> : null}
              </AssistantMessage>
            ) : null}

            {stageIndex >= 6 ? (
              <AssistantMessage>
                <p>请选择您希望的最终文件呈现格式：PPT、网页、PPT和网页。</p>
                <section className="plan-choice-form plan-export-form" data-message-meta="disabled" data-copy-exclude="true">
                  <ConversationFormTitle title="设计需求" status={stage === "export" ? "pending" : "confirmed"} statusLabel={stage === "export" ? "待确认" : "已确认"} />
                  <div className="plan-export-options" role="radiogroup" aria-label="选择企划案导出格式">
                    {(["PPT", "HTML", "PPT与HTML"] as const).map((format) => {
                      const selected = exportFormat === format;
                      return <button type="button" role="radio" className={selected ? "is-selected" : ""} aria-checked={selected} disabled={stage !== "export"} onClick={() => setExportFormat(format)} key={format}><span className="plan-file-icons">{format.includes("PPT") ? <span className="plan-file-icon"><img src={planFileIcons.PPT} alt="" /></span> : null}{format.includes("HTML") ? <span className="plan-file-icon"><img src={planFileIcons.HTML} alt="" /></span> : null}</span><strong>{format}</strong><Radio checked={selected} /></button>;
                    })}
                  </div>
                  {stage === "export" ? <div className="plan-form-actions"><Button variant="primary" onClick={() => setStage("exporting")}>确认格式</Button></div> : null}
                </section>
              </AssistantMessage>
            ) : null}
            {stageIndex >= 7 ? <ConversationUserMessage>{exportFormat}</ConversationUserMessage> : null}
            {stageIndex >= 7 ? <AssistantMessage actions={false}><p>我正在帮你导出最后的文件</p></AssistantMessage> : null}
            {stage === "complete" ? (
              <AssistantMessage>
                <div className="plan-delivery-list" data-message-meta="disabled" data-copy-exclude="true">
                  {exportFormat.includes("PPT") ? <div className="plan-delivery-card"><span className="plan-file-icons"><span className="plan-file-icon"><img src={planFileIcons.PPT} alt="" /></span></span><strong>巴洛克航海梦设计企划案.ppt</strong><div><button type="button" onClick={downloadPptPlan}>下载</button></div></div> : null}
                  {exportFormat.includes("HTML") ? <div className="plan-delivery-card"><span className="plan-file-icons"><span className="plan-file-icon"><img src={planFileIcons.HTML} alt="" /></span></span><strong>巴洛克航海梦设计企划案.html</strong><div><button type="button" onClick={previewPlan}>在线查看</button><button type="button" onClick={downloadHtmlPlan}>下载</button></div></div> : null}
                </div>
                <ConversationTaskCompletion message="该任务已完成。" suggestions={[]} />
              </AssistantMessage>
            ) : null}
            <div ref={feedEndRef} />
          </ConversationFeed>
        </div>
      </section>

      <aside className={`task-detail-rail ${detailPanelOpen ? "is-expanded" : "is-collapsed"}`}>
        <div className="task-detail-panel" aria-label="企划案任务概览">
          <header><strong>概览</strong><button type="button" onClick={() => setDetailPanelOpen(false)} aria-label="收起概览"><FigmaIcon name="expand-window" size={20} /></button></header>
          <section><h2 className="task-progress-heading">任务进展</h2><TaskProgressSummary labels={["确认设计主题", "搜集系列资料", "分析趋势与搭配方向", "确认导出格式", "生成最终企划案"]} states={taskStates} completeLabel="最终企划案已生成" /></section>
          <section><h2>任务产物</h2>{stage === "complete" ? <>{exportFormat.includes("PPT") ? <TaskArtifactRow kind="file">巴洛克航海梦设计企划案.ppt</TaskArtifactRow> : null}{exportFormat.includes("HTML") ? <TaskArtifactRow kind="file">巴洛克航海梦设计企划案.html</TaskArtifactRow> : null}</> : <TaskArtifactRow kind="file">等待生成最终企划案…</TaskArtifactRow>}</section>
          <section><h2>参考信息</h2><div className="task-detail-row"><FigmaIcon name="global" size={16} /><span>Gap SPRING-SUMMER 2026 男装系列</span></div><div className="task-detail-row"><FigmaIcon name="global" size={16} /><span>品牌秀场、街拍与零售造型资料</span></div></section>
        </div>
        <button type="button" className="task-detail-restore" onClick={() => setDetailPanelOpen(true)} aria-label="展开概览"><FigmaIcon name="expand-window" size={20} /></button>
      </aside>
      {preview ? <ImageLightbox src={assetUrl(preview)} alt="企划案参考图片" onClose={() => setPreview(null)} /> : null}
      <Toast message={toast} />
    </motion.main>
  );
}
