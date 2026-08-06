# 灵感档案头图 Motion React 动效交付表

版本：1.0  
状态：开发参考实现已接入  
适用页面：新建任务页头部  
实现技术：React 19 + Motion for React 12

## 1. 文件清单

| 文件 | 用途 |
| --- | --- |
| `README.md` | 动效参数、播放规则和验收标准 |
| `GlassMotion.tsx` | 可移植的 Motion React 参考组件 |
| `glass-motion.css` | 组件所需的完整布局与渲染样式 |

该动效由两个独立透明图片图层组成。图片只负责视觉，位移和旋转全部由页面运行时控制，不使用 SVG 内嵌动画，也不使用 Canvas 或 Three.js。

## 2. 容器与图层

| 对象 | 定位/尺寸 | 静态状态 | 动画属性 | Transform origin |
| --- | --- | --- | --- | --- |
| 总容器 | 右下对齐；240 × 172 px；裁切溢出 | 不接收鼠标事件 | 无 | — |
| 后卡动画层 | top 20 px；right 7.94 px；184.128 × 205.341 px | 内层固定旋转 15° | rotate、x、y | 50% 50% |
| 后卡视觉层 | 144 × 174 px；圆角 20 px | `translateZ(0) scale(1.002)` | 无 | — |
| 前卡动画层 | top 40 px；left 0；185.43 × 205.973 px | 内层固定旋转 15° | rotate、x、y | 50% 50% |
| 前卡视觉层 | 145.263 × 174.316 px；按档案卡路径裁切 | `translateZ(0) scale(1.002)` | 无 | — |

固定的 15° 基础旋转放在静态内层；运行时动画放在外层。两种 transform 不可合并在同一个 DOM 节点，否则 Motion 的行内 transform 会覆盖基础旋转。

## 3. 时间轴

单程时长为 5 秒，随后镜像返回；完整往返周期为 10 秒，无限循环。

| 图层/属性 | 关键帧值 | 时间点 | 分段缓动 |
| --- | --- | --- | --- |
| 后卡 rotate | `[0, 0, 5, 5]` deg | `[0, 20%, 48.26%, 100%]` | linear / Figma spring / linear |
| 后卡 x | `[0, 0, 1.397, 1.397]` px | `[0, 25.27%, 48.26%, 100%]` | linear / Figma spring / linear |
| 后卡 y | `[0, 0, -15.964, -15.964]` px | `[0, 25.27%, 48.26%, 100%]` | linear / Figma spring / linear |
| 前卡 rotate | `[0, 0, -20, -20]` deg | `[0, 20%, 48.26%, 100%]` | linear / Figma spring / linear |
| 前卡 x | `[0, 0, -2.854, -2.854]` px | `[0, 25.42%, 48.26%, 100%]` | linear / Figma spring / linear |
| 前卡 y | `[0, 0, -7.844, -7.844]` px | `[0, 25.42%, 48.26%, 100%]` | linear / Figma spring / linear |

Figma spring 函数已经包含在 `GlassMotion.tsx` 中，以代码为准。

## 4. 播放规则

| 场景 | 行为 |
| --- | --- |
| 组件进入页面 | 自动播放 |
| 正常状态 | 5 秒单程，`repeat: Infinity`，`repeatType: "mirror"` |
| `paused=true` | 停在当前画面，不继续更新 |
| 系统开启“减少动态效果” | 停止动画并回到初始静态状态 |
| 主题切换 | 保持同一时间轴，不依赖重新加载图片来重启动画 |
| 页面交互 | 插画 `aria-hidden=true`、`pointer-events:none`，不阻挡 Tab 或鼠标操作 |

## 5. 素材清单

| 图层 | 当前项目源文件 | 规格 | 用法 |
| --- | --- | --- | --- |
| 后卡 | `public/assets/figma-icons/glass-motion-56659-back-v2@2x.png` | 288 × 348，RGBA PNG | 显示为 144 × 174 px |
| 前卡 | `public/assets/figma-icons/glass-motion-56659-front-base@2x.png` | 291 × 349，RGBA PNG | 显示为 145.263 × 174.316 px |

素材要求：保留透明通道和 2× 清晰度；不要把动画写进 SVG/GIF；不要在素材内烘焙运行时位移或旋转。

## 6. 前端接入

安装依赖：

```bash
npm install motion
```

引入组件和 CSS，并把正式项目中的素材 URL 传入：

```tsx
import { ArchiveHeaderMotion } from "./GlassMotion";
import "./glass-motion.css";

<ArchiveHeaderMotion
  theme="dark"
  backImageSrc="/assets/archive-back@2x.png"
  frontImageSrc="/assets/archive-front@2x.png"
/>
```

如果正式项目没有 Motion for React，可用 CSS keyframes 还原同一组关键帧；不可把实现替换回依赖外链 SVG 内部自动播放的方案。

## 7. 验收清单

- [ ] Chrome、Safari、Firefox 中均能自动播放并持续往返。
- [ ] 前后卡运动方向、幅度和停留时间与交付表一致。
- [ ] 动画过程中卡片边缘无闪烁、锯齿或裁切跳动。
- [ ] 深色和浅色主题切换时动画不中断、不重新闪现。
- [ ] 开启 macOS/iOS“减少动态效果”后显示稳定静态画面。
- [ ] 动画仅更新 transform，不触发页面布局重排。
- [ ] 插画不遮挡标题、Tab、输入框或其他交互热区。
- [ ] 窄屏、缩放和高分屏下素材比例保持一致。

## 8. 最终交付包建议

1. Figma 源组件节点链接。
2. 本文件夹中的三个文件。
3. 两张透明 2× 图片素材。
4. 一段完整 10 秒往返录屏，仅作为视觉比对，不作为参数来源。

