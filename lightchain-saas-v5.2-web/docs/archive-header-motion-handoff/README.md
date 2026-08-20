# 首页业务场景 Tab 右侧动效交付表

版本：2.0

状态：与当前首页实现对齐

适用区域：首页业务场景 Tab 右侧
代码基线：当前 `src/components/ArchiveHeaderMotion.tsx`

> 1.x 版本的“双玻璃卡片 5 秒开合”方案已经废弃，不得再作为开发实现依据。

## 1. 真源与交付文件

视觉外观以当前 Figma 节点为准；状态、参数和降级行为以代码为准。

| 文件 | 用途 |
| --- | --- |
| `src/components/ArchiveHeaderMotion.tsx` | 当前生产参考实现，也是动效行为真源 |
| `src/index.css` 中 `.archive-header-motion*` | 布局、标签样式和响应式规则 |
| `public/assets/figma-confirmed/archive-header-*.png` | 4 个业务场景 × 深浅主题，共 8 张主视觉 |
| 本目录 `ArchiveHeaderMotion.tsx` | 方便独立阅读和迁移的参考组件 |
| 本目录 `archive-header-motion.css` | 迁移所需的最小样式集合 |

录屏只用于肉眼比对，不作为参数来源。

## 2. 状态映射

| activeTab | Tab | 主视觉文件名 | 上标签 | 下标签 |
| --- | --- | --- | --- | --- |
| 0 | 商品企划 | `product-planning` | 精准选品 | 市场洞察 |
| 1 | 客户提案 | `client-proposal` | 高效沟通 | 创意提案 |
| 2 | 服装设计 | `fashion-design` | 个性定制 | 潮流设计 |
| 3 | 图案设计 | `pattern-design` | 视觉吸引 | 原创图案 |

每个主视觉包含 dark / light 两张 PNG。原图为 480 × 344，按 240 × 172 CSS px 显示。

## 3. 动效参数

| 对象 | 规则 |
| --- | --- |
| 总容器 | 240 × 172 px，首页头部右下对齐 |
| 上标签自动漂浮 | `y: 0 → -6px`；3.9s；`sine.inOut`；yoyo；无限循环 |
| 下标签自动漂浮 | `y: 0 → 6px`；4.4s；延迟 0.7s；`sine.inOut`；yoyo；无限循环 |
| 鼠标避让范围 | 标签中心 96px 半径内生效 |
| 最大避让距离 | 18px |
| 上标签回位 | 0.46s；`power3.out` |
| 下标签回位 | 0.5s；`power3.out` |
| 标签表面 | 圆角胶囊；30px backdrop blur；深浅主题使用对应 Token/颜色 |

主视觉中的复杂玻璃质感已经由 PNG 保证。不要重新用 CSS、SVG 内嵌动画、GIF、Canvas 或 Three.js 猜测液态玻璃效果。

## 4. 播放与降级规则

- 进入首页后自动播放标签漂浮。
- 只响应鼠标；触屏和手写笔不触发避让。
- 鼠标离开感应区后标签回到自动漂浮轨迹。
- 首次挂载时预加载深浅主题全部 8 张图片。
- Safari 为避免透明图片交叉淡入闪烁，当前方案直接切换预加载后的活动图片，不做多图 opacity crossfade。
- 系统开启“减少动态效果”后，自动漂浮和鼠标避让均停止，显示稳定静态画面。
- 插画为装饰内容，`aria-hidden=true`，不进入 Tab 顺序。
- 900px 及以下隐藏整组右侧动效；这是当前产品规则，不是浏览器异常。

## 5. 开发接入

当前参考实现使用：

- GSAP：自动漂浮、鼠标避让和回位。
- Motion for React：只读取 `prefers-reduced-motion`。
- React props：`theme: "dark" | "light"`、`activeTab: number`。

正式项目已有 GSAP 时应直接迁移参数。若没有 GSAP，可用 Web Animations API 或 CSS keyframes 实现自动漂浮，但鼠标避让仍需运行时插值；替换技术不能改变上述行为和降级规则。

## 6. 验收清单

- [ ] 4 个 Tab 的图片和两条标签文案映射正确。
- [ ] 深浅主题均使用对应素材，首次主题切换不出现空白或闪图。
- [ ] 上下标签的方向、幅度、时长和错峰符合参数表。
- [ ] 鼠标接近时标签远离指针，离开后自然回位，没有跳变。
- [ ] 触屏设备不产生意外位移。
- [ ] reduced-motion 下完全静止。
- [ ] Chrome、Safari、Firefox 连续切换 Tab 时无闪烁、锯齿和布局抖动。
- [ ] 动效不遮挡标题、Tab、输入框或其他交互区域。
- [ ] 900px 及以下隐藏，宽屏保持 240 × 172 比例。
- [ ] 装饰内容不进入无障碍树或键盘焦点顺序。

## 7. 开发交付话术

> 首页业务场景 Tab 右侧动效以本 v2.0 交付表和当前 `src/components/ArchiveHeaderMotion.tsx` 为准。Figma负责确认视觉，代码负责确认状态、参数与降级规则。请勿使用旧版双玻璃卡片方案。完成后按 Tab 映射、深浅主题、鼠标避让、reduced-motion、Safari 和 900px 响应式逐项验收。
