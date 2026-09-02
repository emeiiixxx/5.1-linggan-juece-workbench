export const trendDirections = [
  { id: "01", title: "轻量松弛通勤", description: "以宽松但有结构的日常轻商务为共同底层方向", recommendation: "建议作为核心方向，匹配通勤人群与跨场景需求" },
  { id: "02", title: "柔性结构层次", description: "以柔软垂感和轻量层次建立通勤造型的松弛感", recommendation: "建议小规模验证，关注柔性面料与套装搭配表现" },
  { id: "03", title: "复古学院混搭", description: "以复古比例和学院细节形成可延展的日常组合", recommendation: "建议作为核心方向，匹配社媒内容与年轻客群偏好" },
  { id: "04", title: "都市轻机能", description: "以轻量功能细节回应都市通勤与跨场景需求", recommendation: "建议小规模验证，关注功能细节的商业接受度" },
] as const;

export const trendReportDetails: Record<string, { signal: string; cue: string; image: string }> = {
  "01": { signal: "优先提案", cue: "轻结构西装、柔软层叠与留白配色", image: "assets/figma-confirmed/candidate-gallery-look-01.png" },
  "02": { signal: "小样验证", cue: "垂坠面料、低对比层次与可拆搭组合", image: "assets/figma-confirmed/trend-reference-primary.jpg" },
  "03": { signal: "优先提案", cue: "学院领型、复古比例与克制装饰", image: "assets/figma-confirmed/candidate-gallery-look-02.png" },
  "04": { signal: "观察方向", cue: "轻量机能细节、城市通勤与跨场景", image: "assets/figma-confirmed/candidate-reference-02.png" },
};

export const candidateCategories = [
  { id: "restrained-ruffle", label: "克制荷叶边实穿化" },
  { id: "heritage-botanical", label: "传承植物印花更新" },
  { id: "soft-tailoring", label: "柔性套装与轻结构" },
  { id: "transitional-dress", label: "过渡季连衣裙层次" },
] as const;

export type CandidateCategoryId = typeof candidateCategories[number]["id"];
const candidatePageCount = 3;
export const candidateReferenceImages = candidateCategories.flatMap((category, categoryIndex) =>
  Array.from({ length: candidatePageCount }, (_, pageIndex) =>
    Array.from({ length: 8 }, (_, imageIndex) => {
      const sequence = pageIndex * 8 + imageIndex + 1;
      const sourceIndex = (imageIndex + pageIndex + categoryIndex) % 4;
      const isCommerceResult = imageIndex < 2 && pageIndex === 0;
      return {
        id: `${category.id}-${pageIndex + 1}-${sequence}`,
        categoryId: category.id,
        page: pageIndex + 1,
        code: `${String.fromCharCode(65 + categoryIndex)}${String(sequence).padStart(2, "0")}`,
        src: sourceIndex < 2 ? "assets/figma-confirmed/candidate-gallery-look-01.png" : "assets/figma-confirmed/candidate-gallery-look-02.png",
        title: isCommerceResult
          ? imageIndex === 0 ? "TikTok Shop US · USD 20.00" : "BELK/品牌公开站平台"
          : `${category.label}参考素材 ${String(sequence).padStart(2, "0")}`,
      };
    }),
  ),
).flat();

const directionById = new Map<string, (typeof trendDirections)[number]>(trendDirections.map((direction) => [direction.id, direction]));

export const selectTrendDirections = (directionIds: string[]) => directionIds.flatMap((directionId) => {
  const direction = directionById.get(directionId);
  return direction ? [direction] : [];
});
export const getCandidateCategoryLabel = (categoryId: CandidateCategoryId) => candidateCategories.find((category) => category.id === categoryId)?.label ?? "客户参考素材";
export const formatTrendDirectionSelection = (directionIds: string[]) => selectTrendDirections(directionIds).map((direction) => `${direction.id}·${direction.title}`).join("、");
