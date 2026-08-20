import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { type TaskWorkflow } from "../data/workspace";
import { assetUrl } from "../utils/assets";
import { useI18n } from "../i18n";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { ProgressiveImage } from "./ProgressiveImage";

export type FeaturedCase = {
  id: string;
  title: string;
  image: string;
  prompt: string;
  workflow: TaskWorkflow;
};

export const featuredCasesByTab: readonly (readonly FeaturedCase[])[] = [
  [
    { id: "planning-kids-pdf", title: "类PDF 2025，Kids主题企划", image: "assets/featured-cases/planning-kids.png", prompt: "以 PDF 2025 秋冬系列为设计灵感，为男童规划印花外套、棒球外套、卫衣、毛衣与长裤，生成完整主题设计企划。", workflow: "plan" },
    { id: "planning-women-jacquemus", title: "类JACQUEMUS 2026，Women主题企划", image: "assets/featured-cases/planning-women-jacquemus.png", prompt: "以 JACQUEMUS 2026 度假系列为设计灵感，为成熟女装规划轻结构外套、衬衫连衣裙、印花连衣裙与半裙，生成完整主题设计企划。", workflow: "plan" },
    { id: "planning-women-dior", title: "类DIOR 2026，Women主题企划", image: "assets/featured-cases/planning-women-dior.png", prompt: "以 DIOR 2026 女装系列为设计灵感，围绕轻礼服、薄纱叠搭、柔性剪裁与过渡季外套，生成完整主题设计企划。", workflow: "plan" },
    { id: "planning-women-resort", title: "轻奢度假 2027，Women主题企划", image: "assets/featured-cases/planning-women-editorial.png", prompt: "面向 2027 春夏轻奢度假女装市场，规划连衣裙、轻薄外套、半裙与精致针织，生成完整主题设计企划。", workflow: "plan" },
  ],
  [
    { id: "proposal-outdoor", title: "北美轻户外品牌客户提案", image: "assets/figma-confirmed/candidate-gallery-look-01.png", prompt: "为北美轻户外品牌制作一份客户提案，包含趋势判断、竞品参考、视觉方向、候选款式与正式提案结果。", workflow: "default" },
    { id: "proposal-urban", title: "都市通勤女装客户提案", image: "assets/figma-confirmed/candidate-gallery-look-02.png", prompt: "为都市通勤女装客户制作一份提案，聚焦轻结构廓形、柔和色彩与高频通勤场景，输出完整视觉与款式方案。", workflow: "default" },
    { id: "proposal-resort", title: "度假女装系列客户提案", image: "assets/figma-confirmed/candidate-reference-02.png", prompt: "为度假女装客户制作一份系列提案，包含灵感参考、方向筛选、AI 改款与最终只读提案。", workflow: "default" },
    { id: "proposal-soft-tailoring", title: "柔性剪裁系列客户提案", image: "assets/figma-confirmed/trend-reference-primary.jpg", prompt: "围绕柔性剪裁与轻量通勤场景，为女装客户整理趋势、参考图、AI 改款与正式提案。", workflow: "default" },
  ],
  [
    { id: "apparel-bomber", title: "经典解构飞行员夹克设计", image: "assets/apparel-design/reference-jacket.png", prompt: "以经典飞行员皮夹克为基础，设计兼顾传承、门襟革新与解构实验的系列款式。", workflow: "apparel" },
    { id: "apparel-cardigan", title: "米白轻盈针织开衫设计", image: "assets/apparel-design/reference-knit.png", prompt: "设计一组米白色轻盈通勤针织开衫，强调细腻组织、柔软纱线与克制细节。", workflow: "apparel" },
    { id: "apparel-soft-jacket", title: "柔性通勤短外套设计", image: "assets/new-product/regenerated-look-02.jpg", prompt: "设计一组适合过渡季通勤的柔性短外套，强调轻结构廓形、低饱和配色与实穿细节。", workflow: "apparel" },
    { id: "apparel-resort-dress", title: "轻奢度假连衣裙设计", image: "assets/new-product/regenerated-look-04.jpg", prompt: "设计一组轻奢度假连衣裙，结合柔和花卉、轻盈垂感与克制装饰。", workflow: "apparel" },
  ],
  [
    { id: "pattern-botanical", title: "轻盈植物花园图案系列", image: "assets/quick-start/print-design-1.jpg", prompt: "设计一组轻盈植物花园图案，使用手绘花叶、疏密层次与四方连续，应用于连衣裙和半裙。", workflow: "pattern" },
    { id: "pattern-window", title: "精致几何花窗图案系列", image: "assets/quick-start/print-design-2.jpg", prompt: "设计一组精致几何花窗图案，通过秩序排列、对称骨架与小比例单元形成连续纹样。", workflow: "pattern" },
    { id: "pattern-retro", title: "复古野趣花卉图案系列", image: "assets/quick-start/print-design-3.jpg", prompt: "设计一组复古野趣花卉图案，融合不规则手绘轮廓、颗粒肌理与自然色彩。", workflow: "pattern" },
    { id: "pattern-resort", title: "热带度假植物图案系列", image: "assets/figma-confirmed/archive-header-pattern-design.png", prompt: "设计一组热带度假植物图案，以大比例叶片、明快撞色与连续构图用于度假服装。", workflow: "pattern" },
  ],
] as const;

export function FeaturedCases({ activeTab, onSelect }: { activeTab: number; onSelect: (featuredCase: FeaturedCase) => void }) {
  const { t } = useI18n();
  const cases = featuredCasesByTab[activeTab] ?? featuredCasesByTab[0];
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [scrollability, setScrollability] = useState({ left: false, right: false });

  const updateScrollability = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
    const next = {
      left: list.scrollLeft > 1,
      right: maxScrollLeft - list.scrollLeft > 1,
    };
    setScrollability((current) => current.left === next.left && current.right === next.right ? current : next);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollLeft = 0;
    updateScrollability();
    const resizeObserver = new ResizeObserver(updateScrollability);
    resizeObserver.observe(list);
    return () => resizeObserver.disconnect();
  }, [activeTab, updateScrollability]);

  const scrollCases = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * Math.max(list.clientWidth * 0.72, 248),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section className="featured-cases" aria-labelledby="featured-cases-title" data-node-id="801:33106">
      <header className="featured-cases__header">
        <span className="featured-cases__title" id="featured-cases-title">
          <FigmaIcon name="image-generation" size={20} />
          <strong>{t("优质案例")}</strong>
        </span>
      </header>
      <div className="featured-cases__rail">
        {scrollability.left ? (
          <IconControl className="featured-cases__scroll featured-cases__scroll--previous" label={t("向左查看更多案例")} variant="tonal" size="small" onClick={() => scrollCases(-1)}>
            <FigmaIcon name="chevron-left" size={16} />
          </IconControl>
        ) : null}
        <div ref={listRef} className="featured-cases__list" aria-label={t("优质案例列表")} onScroll={updateScrollability} key={activeTab}>
          {cases.map((featuredCase) => (
            <button
              type="button"
              className="featured-case-card"
              aria-label={`${t("查看只读案例")}：${t(featuredCase.title)}`}
              onClick={() => onSelect(featuredCase)}
              key={featuredCase.id}
            >
              <ProgressiveImage src={assetUrl(featuredCase.image)} alt="" />
              <span className="featured-case-card__overlay">
                <span>{t(featuredCase.title)}</span>
              </span>
            </button>
          ))}
        </div>
        {scrollability.right ? (
          <IconControl className="featured-cases__scroll featured-cases__scroll--next" label={t("向右查看更多案例")} variant="tonal" size="small" onClick={() => scrollCases(1)}>
            <FigmaIcon name="chevron-right" size={16} />
          </IconControl>
        ) : null}
      </div>
    </section>
  );
}
