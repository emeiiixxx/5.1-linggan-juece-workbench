export type PromptContext = {
  brand?: string;
  season?: string;
  market?: string;
  audience?: string;
  garment?: string;
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
  const audience = prompt.match(/(女装|男装|童装|女士|男士|女性|男性)/)?.[1];
  const garment = prompt.match(/(宠物服饰|针织开衫|开衫|飞行员夹克|夹克|短款外套|外套|连衣裙|衬衫|卫衣|短袖|长裤|短裤|针织衫|针织|上衣|套装|裤装|女装|男装|童装)/)?.[1];

  return {
    brand: normalizedValue(brand),
    season: normalizedValue(season),
    market,
    audience: normalizedValue(audience),
    garment: normalizedValue(garment),
  };
}

export function getPromptExclusions(prompt: string) {
  return Array.from(prompt.matchAll(/(?:不要|排除|避免)\s*([^，,。；;]+)/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
}
