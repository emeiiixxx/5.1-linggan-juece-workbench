export const projectGroups = [
  {
    title: "GG酱的灵感",
    items: ["27年宠物流行服饰趋势", "27年颜色流行趋势"],
  },
  {
    title: "冬季大促营销策划",
    items: [
      "大促市场与销售目标确认",
      "核心客群与促销场景梳理",
      "主推品类与价格带规划",
      "竞品促销机制调研",
      "冬季主题视觉方向",
      "重点款式与商品结构",
      "AI 改款与营销素材",
      "上线节奏与复盘指标",
    ],
  },
];

export type TaskWorkflow = "new-product" | "default" | "apparel" | "pattern" | "plan";
export type TaskStatus = "running" | "pending" | "completed";
export type TaskSourceLabel = "新品企划" | "客户提案" | "服装设计" | "图案设计" | "企划案";
export type TaskSidebarMeta = {
  workflow: TaskWorkflow;
  sourceLabel?: TaskSourceLabel;
  status: TaskStatus;
  updatedAt?: string;
};

export const taskWorkflowLabels: Record<TaskWorkflow, TaskSourceLabel> = {
  "new-product": "新品企划",
  default: "客户提案",
  apparel: "服装设计",
  pattern: "图案设计",
  plan: "企划案",
};

export const initialTaskSidebarMeta: Record<string, TaskSidebarMeta> = {
  "27年宠物流行服饰趋势": { workflow: "new-product", status: "completed", updatedAt: "2026-08-18" },
  "27年颜色流行趋势": { workflow: "default", status: "completed", updatedAt: "2026-08-18" },
  "大促市场与销售目标确认": { workflow: "plan", status: "completed", updatedAt: "2026-08-18" },
  "核心客群与促销场景梳理": { workflow: "default", status: "completed", updatedAt: "2026-08-18" },
  "主推品类与价格带规划": { workflow: "new-product", status: "completed", updatedAt: "2026-08-18" },
  "竞品促销机制调研": { workflow: "default", status: "completed", updatedAt: "2026-08-18" },
  "冬季主题视觉方向": { workflow: "apparel", status: "pending", updatedAt: "2026-08-18" },
  "重点款式与商品结构": { workflow: "new-product", status: "pending", updatedAt: "2026-08-18" },
  "AI 改款与营销素材": { workflow: "apparel", status: "pending", updatedAt: "2026-08-18" },
  "上线节奏与复盘指标": { workflow: "plan", status: "pending", updatedAt: "2026-08-18" },
  "2027春夏北美宠物雨衣趋势调研": { workflow: "new-product", status: "running" },
  "米白针织开衫设计方向确认": { workflow: "apparel", status: "pending", updatedAt: "2026-08-17" },
  "Loro Piana 2027春夏男装企划": { workflow: "plan", status: "completed", updatedAt: "2026-08-16" },
  "北美成熟女装新品范围确认": { workflow: "new-product", status: "pending", updatedAt: "2026-08-15" },
};

export const completedProjectTaskExample = {
  id: -2027001,
  title: "27年宠物流行服饰趋势",
  projectId: 0,
  prompt: "围绕 2027 年宠物服饰流行趋势，面向 Amazon US 与 TikTok Shop US，生成一份包含市场、人群、品类、价格、波段、视觉方向和 AI 改款结果的新品企划。",
  workflow: "new-product" as const,
  status: "completed" as const,
  updatedAt: "2026-08-18",
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
  updatedAt: "2026-08-18",
  initialState: "complete" as const,
};

export const completedProjectTaskExamples = [
  completedProjectTaskExample,
  completedCustomerProposalExample,
];

export const standaloneDemoTaskExamples = [
  {
    id: -2027010,
    title: "2027春夏北美宠物雨衣趋势调研",
    projectId: null,
    prompt: "面向 Amazon US 和 TikTok Shop US，围绕 2027 春夏小型犬轻量防水雨衣，调研目标人群、价格带、材质功能、颜色趋势和首发商品结构，优先考虑城市通勤与雨季场景。",
    workflow: "new-product" as const,
    status: "running" as const,
    updatedAt: "2026-08-17T14:32:00+08:00",
    initialState: "default" as const,
  },
  {
    id: -2027011,
    title: "米白针织开衫设计方向确认",
    projectId: null,
    prompt: "为日本通勤女装开发 2027 春季米白色轻薄针织开衫系列，面向 28–40 岁城市女性，保留细腻针织质感和简洁门襟，避免夸张装饰，先确认出款数量、风格方向和改款幅度。",
    workflow: "apparel" as const,
    status: "pending" as const,
    updatedAt: "2026-08-17T11:08:00+08:00",
    initialState: "confirmation" as const,
  },
  {
    id: -2027012,
    title: "Loro Piana 2027春夏男装企划",
    projectId: null,
    prompt: "以 Loro Piana 的 2027春夏系列作为设计灵感，规划短款外套、衬衫、卫衣、短袖、长裤和短裤，生成一份面向高净值城市男性的完整主题设计企划。",
    workflow: "plan" as const,
    status: "completed" as const,
    updatedAt: "2026-08-16T18:46:00+08:00",
    initialState: "complete" as const,
  },
  {
    id: -2027013,
    title: "北美成熟女装新品范围确认",
    projectId: null,
    prompt: "为 Amazon US 规划 2027 秋季 35–50 岁女性的柔性通勤新品，重点包含印花衬衫、轻结构外套与过渡季连衣裙，需要先确认市场平台、研究范围和商品结构边界。",
    workflow: "new-product" as const,
    status: "pending" as const,
    updatedAt: "2026-08-15T16:20:00+08:00",
    initialState: "confirmation" as const,
  },
];

export const taskItems = standaloneDemoTaskExamples.map((task) => task.title);

export const allDemoTaskExamples = [
  ...completedProjectTaskExamples,
  ...standaloneDemoTaskExamples,
];

export const quickStartCards = [
  "以ZIMMERMANN的RESORT2026系列做为设计灵感，需要包含短款外套、衬衫连衣裙、印花连衣裙、半裙、生成一份女装主题设计企划。",
  "以PDF的2025秋冬系列做为设计灵感，需要包含印花外套、棒球外套、卫衣、毛衣、长裤生成一份男童主题设计企划。",
  "以PDF的2025秋冬系列做为设计灵感，需要包含印花外套、棒球外套、卫衣、毛衣、长裤生成一份男童主题设计企划。",
];

export const recentItems = [
  ["27年宠物流行服饰趋势", "任务·最近编辑"],
  ["北美女性瑜伽服企划", "任务·最近编辑"],
  ["日本通勤针织开衫测款", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
];
