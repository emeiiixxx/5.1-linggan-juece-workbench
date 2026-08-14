import { assetUrl } from "../utils/assets";

export const projectGroups = [
  {
    title: "GG酱的灵感",
    items: ["27年宠物流行服饰趋势", "27年颜色流行趋势"],
  },
  { title: "冬季大促营销策划", items: [] },
  { title: "Untitled", items: [] },
  { title: "Untitled", items: [] },
  { title: "Untitled", items: [] },
  { title: "Untitled", items: [] },
];

export const taskItems = [
  "不在项目里面的任务",
  "待处理的反馈",
  "团队建设活动",
  "市场调研计划",
];

export const completedProjectTaskExample = {
  id: -2027001,
  title: "27年宠物流行服饰趋势",
  projectId: 0,
  prompt: "围绕 2027 年宠物服饰流行趋势，面向 Amazon US 与 TikTok Shop US，生成一份包含市场、人群、品类、价格、波段、视觉方向和 AI 改款结果的新品企划。",
  workflow: "new-product" as const,
  status: "completed" as const,
  initialState: "complete" as const,
};

export const completedCustomerProposalExample = {
  id: -2027002,
  title: "27年颜色流行趋势",
  projectId: 0,
  prompt: "围绕 2027 年颜色流行趋势，结合目标市场、客户需求与公开行业资料，整理视觉方向、参考素材和 AI 改款结果，并生成一份完整客户提案。",
  profileName: "灭霸毁灭世界回忆录",
  workflow: "default" as const,
  status: "completed" as const,
  initialState: "complete" as const,
};

export const completedProjectTaskExamples = [
  completedProjectTaskExample,
  completedCustomerProposalExample,
];

export const quickStartCards = [
  {
    title: "面料套版",
    description: "面料·指定版式快速设计",
    images: [
      assetUrl("assets/quick-start/fabric-template-2.jpg"),
      assetUrl("assets/quick-start/fabric-template-3.jpg"),
      assetUrl("assets/quick-start/fabric-template-1.jpg"),
    ],
  },
  {
    title: "转线稿图",
    description: "批量转换，秒速生成线稿",
    images: [
      assetUrl("assets/quick-start/single-style-2.jpg"),
      assetUrl("assets/quick-start/single-style-3.jpg"),
      assetUrl("assets/quick-start/single-style-1.jpg"),
    ],
  },
  {
    title: "款式融合",
    description: "融合特征，焕新呈现",
    images: [
      assetUrl("assets/quick-start/multi-style-2.jpg"),
      assetUrl("assets/quick-start/multi-style-3.jpg"),
      assetUrl("assets/quick-start/multi-style-1.jpg"),
    ],
  },
  {
    title: "印花设计",
    description: "基于参考图或内容生成印花图案",
    images: [
      assetUrl("assets/quick-start/print-design-2.jpg"),
      assetUrl("assets/quick-start/print-design-3.jpg"),
      assetUrl("assets/quick-start/print-design-1.jpg"),
    ],
  },
];

export const recentItems = [
  ["27年宠物流行服饰趋势", "任务·最近编辑"],
  ["北美女性瑜伽服企划", "任务·最近编辑"],
  ["日本通勤针织开衫测款", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
];
