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
  "轻盈花园图案系列": { workflow: "pattern", status: "completed", updatedAt: "2026-08-19" },
  "Loro Piana 2027春夏男装企划": { workflow: "plan", status: "completed", updatedAt: "2026-08-16" },
  "北美成熟女装新品范围确认": { workflow: "new-product", status: "pending", updatedAt: "2026-08-15" },
  "新品企划异常状态演示": { workflow: "new-product", status: "pending", updatedAt: "2026-08-19" },
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
  prompt: "围绕 2027 年北美女装颜色与柔性通勤趋势，结合公开行业资料，整理视觉方向、参考素材和 AI 改款结果，并生成一份完整客户提案。",
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
  {
    id: -2027014,
    title: "轻盈花园图案系列",
    projectId: null,
    prompt: "为 2027 春夏女装开发一组轻盈花园主题图案，以手绘花卉、度假植物和复古线条为主，用于连衣裙、半裙与衬衫，输出连续花型和定位印花示意。",
    workflow: "pattern" as const,
    status: "completed" as const,
    updatedAt: "2026-08-19T10:30:00+08:00",
    initialState: "complete" as const,
  },
  {
    id: -2027015,
    title: "新品企划异常状态演示",
    projectId: null,
    prompt: "为 2027 秋季北美成熟女装规划一组柔性通勤新品，包含印花衬衫、轻结构外套和过渡季连衣裙；确认需求后继续调研，并保留异常恢复过程中的文字与附件。",
    profileName: "北美成熟女装偏好档案",
    workflow: "new-product" as const,
    status: "pending" as const,
    updatedAt: "2026-08-19T15:20:00+08:00",
    initialState: "exception" as const,
  },
];

export const taskItems = standaloneDemoTaskExamples.map((task) => task.title);

export const allDemoTaskExamples = [
  ...completedProjectTaskExamples,
  ...standaloneDemoTaskExamples,
];

export type QuickStartTemplate = {
  text: string;
  workflow: TaskWorkflow;
};

export const quickStartCardsByTab: readonly (readonly QuickStartTemplate[])[] = [
  [
    { text: "以ZIMMERMANN的RESORT2026系列做为设计灵感，需要包含短款外套、衬衫连衣裙、印花连衣裙、半裙、生成一份女装主题设计企划。", workflow: "new-product" },
    { text: "以PDF的2025秋冬系列做为设计灵感，需要包含印花外套、棒球外套、卫衣、毛衣、长裤生成一份男童主题设计企划。", workflow: "plan" },
    { text: "以DIOR 2026早春女装为设计灵感，规划轻礼服、薄纱叠搭、柔性剪裁与过渡季外套，生成一份女装主题设计企划。", workflow: "plan" },
  ],
  [
    { text: "为北美轻户外品牌制作2027春夏客户提案，结合市场趋势、竞品表现、目标客群和视觉方向，输出完整系列建议。", workflow: "default" },
    { text: "根据日本通勤女装客户brief，围绕轻薄针织、柔和配色与易搭配场景，生成一份春季系列客户提案。", workflow: "default" },
    { text: "为欧洲度假女装客户整理花卉印花、轻盈廓形和旅行场景灵感，输出视觉方向、重点款式与提案报告。", workflow: "default" },
  ],
  [
    { text: "以经典飞行员夹克为基础，设计8款兼顾传承、门襟革新与解构实验的系列款式，并保留商业实穿性。", workflow: "apparel" },
    { text: "设计一组2027春季米白轻薄针织开衫，强调细腻组织、简洁门襟和城市通勤比例，避免夸张装饰。", workflow: "apparel" },
    { text: "设计一组轻奢度假连衣裙，结合柔和花卉、轻盈垂感与克制装饰，输出从基础款到形象款的系列方案。", workflow: "apparel" },
  ],
  [
    { text: "为2027春夏女装设计轻盈植物花园图案，使用手绘花叶、疏密层次与四方连续，应用于连衣裙和半裙。", workflow: "pattern" },
    { text: "设计一组精致几何花窗图案，通过对称骨架、小比例单元和秩序排列形成连续纹样，应用于衬衫与配饰。", workflow: "pattern" },
    { text: "设计一组复古野趣花卉图案，融合不规则手绘轮廓、颗粒肌理与自然色彩，输出连续花型和定位印花方案。", workflow: "pattern" },
  ],
];

export const recentItems = [
  ["27年宠物流行服饰趋势", "任务·最近编辑"],
  ["北美女性瑜伽服企划", "任务·最近编辑"],
  ["日本通勤针织开衫测款", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
  ["欧洲轻户外客户提案", "项目·最近编辑"],
];
