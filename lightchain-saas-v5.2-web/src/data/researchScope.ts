import type { Locale } from "../i18n";
import { extractPromptContext } from "../utils/promptContext";

export type ResearchMarket = "中国" | "日本" | "北美" | "欧洲";

export const researchMarkets: ResearchMarket[] = ["中国", "日本", "北美", "欧洲"];

export const researchPlatforms: Record<ResearchMarket, { commerce: string[]; social: string[] }> = {
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
    commerce: ["Zalando", "Amazon", "品牌官网", "其他"],
    social: ["Instagram", "Pinterest", "TikTok"],
  },
};

export type ResearchScopeDefaults = {
  markets: ResearchMarket[];
  commerce: string[];
  social: string[];
};

export function getLocaleDefaultMarket(locale: Locale): ResearchMarket {
  if (locale === "ja-JP") return "日本";
  if (locale === "en-US") return "北美";
  return "中国";
}

export function getResearchScopeDefaults(profileName: string | undefined, locale: Locale, prompt = ""): ResearchScopeDefaults {
  if (!profileName) {
    const promptMarket = extractPromptContext(prompt).market as ResearchMarket | undefined;
    const markets = promptMarket && researchMarkets.includes(promptMarket)
      ? [promptMarket]
      : [getLocaleDefaultMarket(locale)];
    const available = getResearchPlatformOptions(markets);
    const commerce = available.commerce.filter((platform) => prompt.toLocaleLowerCase().includes(platform.toLocaleLowerCase()));
    const social = available.social.filter((platform) => {
      if (platform === "TikTok" && /TikTok\s*Shop/i.test(prompt)) return false;
      if (platform === "抖音" && /抖音(?:商城|电商|店铺)/.test(prompt)) return false;
      return prompt.toLocaleLowerCase().includes(platform.toLocaleLowerCase());
    });
    if (promptMarket === "北美" && /TikTok\s*Shop/i.test(prompt) && !social.includes("TikTok")) social.push("TikTok");
    return { markets, commerce, social };
  }
  if (profileName.includes("卡宾")) return { markets: ["中国", "北美", "欧洲"], commerce: ["淘宝"], social: ["小红书"] };
  if (profileName.includes("灭霸") || profileName.includes("Thanos")) {
    return { markets: ["日本", "北美"], commerce: ["ZOZOTOWN"], social: ["Instagram", "TikTok"] };
  }
  if (profileName.includes("日本")) return { markets: ["日本"], commerce: ["RakutenFashion"], social: ["Instagram", "TikTok"] };
  return { markets: [getLocaleDefaultMarket(locale)], commerce: [], social: [] };
}

export function getResearchPlatformOptions(markets: ResearchMarket[]) {
  return {
    commerce: [...new Set(markets.flatMap((market) => researchPlatforms[market].commerce))].filter((platform) => platform !== "其他"),
    social: [...new Set(markets.flatMap((market) => researchPlatforms[market].social))],
  };
}
