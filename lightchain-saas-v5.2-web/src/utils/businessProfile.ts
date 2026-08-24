export function getBusinessProfileSummary(profileName: string) {
  if (profileName.includes("卡宾")) return "品类：鞋袋　价格段：CNY 200–1,000　市场：中国、欧美　年龄段：3–18岁";
  if (profileName.includes("日本")) return "品类：女装　价格段：JPY 8,000–18,000　市场：日本、韩国、美国　年龄段：25–34岁、35–44岁";
  if (profileName.includes("灭霸") || profileName.includes("Thanos")) return "品类：女装、男装、童装　价格段：USD 1,000–999,999,999　市场：日本、韩国、美国　年龄段：多年龄段";
  return "已应用该档案中保存的品类、价格、市场与年龄范围";
}
