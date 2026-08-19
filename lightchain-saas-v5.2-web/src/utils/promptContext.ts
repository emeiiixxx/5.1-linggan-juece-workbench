export type PromptContext = {
  brand?: string;
  season?: string;
  market?: string;
  audience?: string;
  garment?: string;
  garments?: string[];
  price?: string;
};

const normalizedValue = (value: string | undefined) => value?.replace(/\s+/g, " ").trim();

export function extractPromptContext(prompt: string): PromptContext {
  const season = prompt.match(/(?:20\d{2}\s*年?\s*)?(春夏|秋冬|春季|夏季|秋季|冬季|春|夏|秋|冬)(?:系列)?/i)?.[0];
  const brand = prompt.match(/(?:以|基于)\s*([^，,。；;]{2,40}?)\s*(?:的\s*)?(?:20\d{2}|春夏|秋冬|春季|夏季|秋季|冬季|系列)/i)?.[1];
  const market = [
    [/(?:北美|美国|加拿大|\bUS\b|United States)/i, "北美"],
    [/(?:日本|Japan)/i, "日本"],
    [/(?:欧洲|欧盟|Europe)/i, "欧洲"],
    [/(?:中国|国内|China)/i, "中国"],
  ].find(([pattern]) => (pattern as RegExp).test(prompt))?.[1] as string | undefined;
  const audienceGenderRaw = prompt.match(/(女装|男装|童装|女士|男士|女性|男性)/)?.[1];
  const audienceGender = audienceGenderRaw === "女装" || audienceGenderRaw === "女士"
    ? "女性"
    : audienceGenderRaw === "男装" || audienceGenderRaw === "男士"
      ? "男性"
      : audienceGenderRaw === "童装"
        ? "儿童"
        : audienceGenderRaw;
  const ageRange = prompt.match(/\d{1,3}\s*[–—~～-]\s*\d{1,3}\s*岁?/)?.[0];
  const audience = normalizedValue([ageRange, audienceGender].filter(Boolean).join(" "));
  const garmentPattern = /(宠物服饰|针织开衫|飞行员夹克|短款外套|连衣裙|针织衫|夹克|开衫|外套|衬衫|卫衣|短袖|长裤|短裤|针织|上衣|套装|裤装|女装|男装|童装)/g;
  const matchedGarments = Array.from(prompt.matchAll(garmentPattern), (match) => match[1]);
  const garments = [...new Set(matchedGarments)];
  const concreteGarments = garments.filter((item) => !["女装", "男装", "童装"].includes(item));
  const normalizedGarments = concreteGarments.length ? concreteGarments : garments;
  const garment = normalizedGarments[0];
  const price = normalizedValue(prompt.match(/(?:JPY|CNY|USD|RMB|¥|￥|\$)\s*[\d,.]+(?:\s*[–—~～-]\s*(?:JPY|CNY|USD|RMB|¥|￥|\$)?\s*[\d,.]+)?/i)?.[0]);

  return {
    brand: normalizedValue(brand),
    season: normalizedValue(season),
    market,
    audience: normalizedValue(audience),
    garment: normalizedValue(garment),
    garments: normalizedGarments,
    price,
  };
}

export function getPromptExclusions(prompt: string) {
  return Array.from(prompt.matchAll(/(?:不要|排除|避免)\s*([^，,。；;]+)/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
}
