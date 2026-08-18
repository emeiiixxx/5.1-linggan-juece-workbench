import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { generatedSiteCopy } from "./generated/siteCopy";

export type Locale = "zh-CN" | "ja-JP" | "en-US";

type Translation = { ja: string; en: string };

export const languageOptions: { value: Locale; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
];

const copy: Record<string, Translation> = {
  "简体中文": { ja: "日本語", en: "English" },
  "选择语言": { ja: "言語を選択", en: "Select language" },
  "切换到浅色模式": { ja: "ライトモードに切替", en: "Switch to light mode" },
  "切换到暗黑模式": { ja: "ダークモードに切替", en: "Switch to dark mode" },
  "帮助中心": { ja: "ヘルプ", en: "Help Center" },
  "联系客服": { ja: "サポート", en: "Contact Support" },
  "购买积分": { ja: "クレジット購入", en: "Buy Credits" },
  "打开个人中心": { ja: "アカウントを開く", en: "Open account" },
  "灵感决策工作台": { ja: "インサイトワークスペース", en: "Inspiration Workspace" },
  "返回首页": { ja: "ホームに戻る", en: "Back to Home" },
  "搜索": { ja: "検索", en: "Search" },
  "收起侧栏": { ja: "サイドバーを閉じる", en: "Collapse sidebar" },
  "展开菜单": { ja: "メニューを開く", en: "Expand menu" },
  "工作台入口": { ja: "ワークスペースメニュー", en: "Workspace navigation" },
  "新建任务": { ja: "新規タスク", en: "New Task" },
  "业务偏好档案": { ja: "ビジネスプロファイル", en: "Business Profile" },
  "企业偏好档案": { ja: "ビジネスプロファイル", en: "Business Profile" },
  "项目": { ja: "プロジェクト", en: "Projects" },
  "任务": { ja: "タスク", en: "Tasks" },
  "最近": { ja: "最近", en: "Recent" },
  "展开更多": { ja: "さらに表示", en: "Show more" },
  "展示更多该项目任务": { ja: "このプロジェクトのタスクをさらに表示", en: "Show more tasks in this project" },
  "新建项目": { ja: "新規プロジェクト", en: "New Project" },
  "更多": { ja: "その他", en: "More" },
  "在{name}中新建对话": { ja: "{name}で新しいチャットを作成", en: "Start a new chat in {name}" },
  "{name}的操作": { ja: "{name}の操作", en: "Actions for {name}" },
  "搜索历史任务或项目": { ja: "タスクやプロジェクトを検索", en: "Search tasks or projects" },
  "关闭搜索": { ja: "検索を閉じる", en: "Close search" },
  "最近编辑": { ja: "最近の編集", en: "Recently edited" },
  "搜索结果": { ja: "検索結果", en: "Search results" },
  "暂无匹配结果": { ja: "一致する結果がありません", en: "No matching results" },
  "尝试换个关键词输入重新试试": { ja: "別のキーワードで再度お試しください", en: "Try again with another keyword" },
  "重命名": { ja: "名前を変更", en: "Rename" },
  "复制档案": { ja: "プロファイルを複製", en: "Duplicate Profile" },
  "删除": { ja: "削除", en: "Delete" },
  "关闭": { ja: "閉じる", en: "Close" },
  "取消": { ja: "キャンセル", en: "Cancel" },
  "确认": { ja: "確定", en: "Confirm" },
  "创建项目": { ja: "プロジェクトを作成", en: "Create Project" },
  "创建": { ja: "作成", en: "Create" },
  "项目用于整理历史任务，名称最多 40 个字符": { ja: "過去のタスクをまとめるプロジェクトです。名前は40文字以内です。", en: "Projects organize past tasks. Names can be up to 40 characters." },
  "输入项目名称": { ja: "プロジェクト名を入力", en: "Enter project name" },
  "项目名称": { ja: "プロジェクト名", en: "Project name" },
  "输入任务名称": { ja: "タスク名を入力", en: "Enter task name" },
  "任务名称": { ja: "タスク名", en: "Task name" },
  "输入对话名称": { ja: "チャット名を入力", en: "Enter chat name" },
  "对话名称": { ja: "チャット名", en: "Chat name" },
  "删除后不可恢复，您确定删除吗？": { ja: "削除すると元に戻せません。削除しますか？", en: "This can’t be undone. Delete it?" },
  "项目中的任务将移至任务列表，项目删除后不可恢复。": { ja: "プロジェクト内のタスクはタスク一覧へ移動されます。プロジェクトの削除は元に戻せません。", en: "Tasks in this project will move to the task list. Deleting the project can’t be undone." },
  "删除此项目？": { ja: "このプロジェクトを削除しますか？", en: "Delete this project?" },
  "删除此任务？": { ja: "このタスクを削除しますか？", en: "Delete this task?" },
  "删除此对话？": { ja: "このチャットを削除しますか？", en: "Delete this chat?" },
  "今天想从哪里开始？": { ja: "今日は何から始めますか？", en: "What will you create?" },
  "选择一个业务场景，描述你的目标，Agent 会带你完成后续步骤。": { ja: "用途を選んで目標を入力すると、AIエージェントが次のステップをご案内します。", en: "Choose a workflow and enter your goal." },
  "业务场景": { ja: "ワークフロー", en: "Workflow" },
  "商品企划": { ja: "商品企画", en: "Product Planning" },
  "选择商品企划类型": { ja: "商品企画タイプを選択", en: "Select product planning type" },
  "选品测款": { ja: "商品リサーチ", en: "Product Research" },
  "新品方向探索": { ja: "新商品企画", en: "New Product Direction" },
  "客户提案生成": { ja: "顧客提案", en: "Client Proposal" },
  "新品企划": { ja: "新商品企画", en: "New Product Plan" },
  "选择本次企划采用的视觉方向": { ja: "今回の企画で採用するビジュアル方向を選択", en: "Select visual directions for this plan" },
  "支持多选，方向确认后才进入商品结构和 AI 改款。": { ja: "複数選択できます。方向を確定すると、商品構成とAIデザインへ進みます。", en: "Select one or more. Confirm the directions before moving to the assortment and AI redesign." },
  "选择新品企划案的 AI 改款图": { ja: "新商品企画に使用するAIデザインを選択", en: "Select AI redesigns for the product plan" },
  "选择图片后，名称会回显到输入框。你可以发送确认，也可以直接生成企划；需要修改时请在输入框回复。": { ja: "画像を選ぶと名前が入力欄に表示されます。そのまま送信するか企画を生成できます。修正は入力欄から指示してください。", en: "Selected image names appear in the input. Send to confirm, generate the plan, or type changes there." },
  "请从改款结果中选择要用于新品企划的图片。如果不满意或希望调整，直接在输入框说明修改要求，我会追加生成一组新方案；已生成图片不会被覆盖。": { ja: "新商品企画に使う画像を選択してください。修正が必要な場合は入力欄に指示すると、新しい案を追加生成します。既存画像は保持されます。", en: "Select images for the product plan. Type any changes in the input to generate another set; existing images stay saved." },
  "选择你满意的图片。你可以基于所选图片重新生成更多方案，或直接将其用于生成新品企划。": { ja: "気に入った画像を選択してください。選択画像から別案を再生成するか、そのまま新商品企画に使用できます。", en: "Select the images you prefer. Regenerate more options from your selection, or use them directly in the product plan." },
  "请从改款结果中，选择你喜欢的图片": { ja: "デザイン結果から気に入った画像を選択してください", en: "Choose the images you like from the redesign results" },
  "待确认": { ja: "確認待ち", en: "Pending" },
  "已确认": { ja: "確認済み", en: "Confirmed" },
  "已生成": { ja: "生成済み", en: "Generated" },
  "进行中": { ja: "進行中", en: "In progress" },
  "待完成": { ja: "未完了", en: "To finish" },
  "待处理": { ja: "保留中", en: "Pending" },
  "已选择": { ja: "選択済み", en: "Selected" },
  "全选": { ja: "すべて選択", en: "Select all" },
  "张图片": { ja: "枚", en: "images" },
  "重新生成": { ja: "再生成", en: "Regenerate" },
  "重新生成中": { ja: "再生成中", en: "Regenerating" },
  "生成中...": { ja: "生成中...", en: "Generating..." },
  "下载": { ja: "ダウンロード", en: "Download" },
  "下载全部参考图": { ja: "参考画像を一括ダウンロード", en: "Download all references" },
  "查看全部": { ja: "すべて表示", en: "View all" },
  "查看全部 {count} 条": { ja: "すべて表示 {count}件", en: "View all {count} items" },
  "关闭参考款式列表": { ja: "参考画像一覧を閉じる", en: "Close reference list" },
  "共 {count} 条 · 按最近获取时间排序": { ja: "全{count}件・取得日時順", en: "{count} items · newest first" },
  "参考图下载失败，请稍后重试。": { ja: "参考画像をダウンロードできませんでした。後でもう一度お試しください。", en: "Reference download failed. Please try again later." },
  "选择下载格式": { ja: "ダウンロード形式を選択", en: "Select download format" },
  "在线查看": { ja: "オンライン表示", en: "View online" },
  "AI 生成 · 在线预览": { ja: "AI生成・オンラインプレビュー", en: "AI-generated · Online preview" },
  "关闭在线查看": { ja: "オンライン表示を閉じる", en: "Close online preview" },
  "查看大图": { ja: "拡大表示", en: "View full image" },
  "关闭大图": { ja: "拡大表示を閉じる", en: "Close full image" },
  "取消收藏": { ja: "お気に入りを解除", en: "Remove from favorites" },
  "收藏到资源库": { ja: "ライブラリに保存", en: "Save to library" },
  "下载图片": { ja: "画像をダウンロード", en: "Download image" },
  "取消选择": { ja: "選択を解除", en: "Deselect" },
  "选择": { ja: "選択", en: "Select" },
  "放大查看": { ja: "拡大表示", en: "View full image" },
  "参考图类型": { ja: "参考画像タイプ", en: "Reference image type" },
  "支持按键盘 ← → 键切换图片，按 Esc 退出查看大图": { ja: "← → キーで画像を切り替え、Escで閉じます", en: "Use ← → to switch images and Esc to close" },
  "查看大图：{code} {title}": { ja: "拡大表示：{code} {title}", en: "View full image: {code} {title}" },
  "素材标签": { ja: "素材タグ", en: "Asset tags" },
  "查看来源": { ja: "ソースを見る", en: "View source" },
  "取消喜欢": { ja: "いいねを解除", en: "Unlike" },
  "喜欢": { ja: "いいね", en: "Like" },
  "上一张": { ja: "前の画像", en: "Previous image" },
  "下一张": { ja: "次の画像", en: "Next image" },
  "向左查看更多缩略图": { ja: "左のサムネイルを表示", en: "Show more thumbnails to the left" },
  "向右查看更多缩略图": { ja: "右のサムネイルを表示", en: "Show more thumbnails to the right" },
  "同类型参考图": { ja: "同タイプの参考画像", en: "References of the same type" },
  "全部改款结果": { ja: "すべてのデザイン結果", en: "All redesign results" },
  "帮助改进": { ja: "改善にご協力ください", en: "Help us improve" },
  "选择需要改进的原因，支持多选": { ja: "改善理由を選択（複数可）", en: "Select reasons for improvement (multiple allowed)" },
  "不正确 / 不完整": { ja: "不正確 / 不完全", en: "Incorrect / incomplete" },
  "没有遵循我的指示": { ja: "指示に従っていない", en: "Did not follow my instructions" },
  "速度慢": { ja: "遅い", en: "Too slow" },
  "偏题 / 超出范围": { ja: "トピック外 / 範囲外", en: "Off-topic / out of scope" },
  "其他": { ja: "その他", en: "Other" },
  "填写详情（选填）": { ja: "詳細を入力（任意）", en: "Add details (optional)" },
  "提交": { ja: "送信", en: "Submit" },
  "复制消息": { ja: "メッセージをコピー", en: "Copy message" },
  "赞同消息": { ja: "メッセージに高評価", en: "Like message" },
  "不赞同消息": { ja: "メッセージに低評価", en: "Dislike message" },
  "生成企划": { ja: "企画を生成", en: "Generate plan" },
  "客户提案": { ja: "顧客提案", en: "Client Proposal" },
  "灵感设计": { ja: "アパレルデザイン", en: "Apparel Design" },
  "企划案": { ja: "企画書", en: "Plan" },
  "概览": { ja: "概要", en: "Overview" },
  "任务产物": { ja: "成果物", en: "Deliverables" },
  "参考款式": { ja: "参考スタイル", en: "Reference Styles" },
  "调研": { ja: "リサーチ", en: "Research" },
  "视觉方向": { ja: "ビジュアル方向", en: "Visual Direction" },
  "商品结构": { ja: "商品構成", en: "Assortment" },
  "AI 改款": { ja: "AIデザイン", en: "AI Redesign" },
  "AI 改款图": { ja: "AIデザイン画像", en: "AI Redesigns" },
  "改款": { ja: "デザイン変更", en: "Redesign" },
  "服装设计": { ja: "アパレルデザイン", en: "Apparel Design" },
  "图案设计": { ja: "グラフィックデザイン", en: "Pattern Design" },
  "精准选品": { ja: "商品選定", en: "Precise Picks" },
  "市场洞察": { ja: "市場分析", en: "Market Pulse" },
  "高效沟通": { ja: "円滑対話", en: "Clear Talk" },
  "创意提案": { ja: "企画提案", en: "Fresh Ideas" },
  "个性定制": { ja: "個別設計", en: "Custom Fit" },
  "潮流设计": { ja: "流行設計", en: "Trend Edit" },
  "视觉吸引": { ja: "視覚訴求", en: "Visual Pop" },
  "原创图案": { ja: "独自柄", en: "Fresh Prints" },
  "选择设计类型": { ja: "デザインタイプを選択", en: "Select design type" },
  "描述你想调研的市场、品类或款式方向...": { ja: "調べたい市場・カテゴリ・デザインを入力...", en: "Describe the market, category, or style you want to research..." },
  "描述下一季的市场,人群,品类和经营目标...": { ja: "次シーズンの市場、顧客層、カテゴリ、事業目標を入力...", en: "Describe next season’s market, audience, category, and business goals..." },
  "输入客户需求,或上传brief、邮件和会议纪要...": { ja: "顧客要件を入力するか、ブリーフ・メール・議事録をアップロード...", en: "Enter client needs, or upload a brief, email, or meeting notes..." },
  "描述想要设计的款式，或上传参考图片...": { ja: "デザインしたいアイテムを説明するか、参考画像をアップロード...", en: "Describe the garment you want to design, or upload references..." },
  "描述想要生成的图案风格、元素和应用场景...": { ja: "生成したい柄のスタイル、要素、用途を入力...", en: "Describe the pattern style, elements, and use case..." },
  "输入@服装 / 图案可调用不同类型工具。例如：@服装 设计一些外套...": { ja: "@アパレル / パターンでツールを切り替えられます。例：@アパレル アウターをデザイン...", en: "Use @Apparel / Pattern to call different tools. Example: @Apparel design some outerwear..." },
  "描述企划案的主题、目标和交付要求...": { ja: "企画書のテーマ、目標、納品要件を入力...", en: "Describe the plan theme, goals, and deliverables..." },
  "添加附件": { ja: "ファイルを追加", en: "Add attachment" },
  "文件": { ja: "ファイル", en: "File" },
  "图片": { ja: "画像", en: "Image" },
  "发送": { ja: "送信", en: "Send" },
  "Enter 发送 · Shift + Enter 换行": { ja: "Enterで送信・Shift + Enterで改行", en: "Enter to send · Shift + Enter for a new line" },
  "移除附件": { ja: "添付を削除", en: "Remove attachment" },
  "选择业务偏好档案": { ja: "ビジネスプロファイルを選択", en: "Select business profile" },
  "选择项目": { ja: "プロジェクトを選択", en: "Select project" },
  "快速开始": { ja: "クイックスタート", en: "Quick Start" },
  "点击试试": { ja: "試してみる", en: "Try it" },
  "不知道从何开始？试试这些模板": { ja: "迷ったら、テンプレートから始めましょう", en: "Not sure where to start? Try a template" },
  "以ZIMMERMANN的RESORT2026系列做为设计灵感，需要包含短款外套、衬衫连衣裙、印花连衣裙、半裙、生成一份女装主题设计企划。": {
    ja: "ZIMMERMANNのRESORT 2026を着想源に、ショートジャケット、シャツワンピース、プリントワンピース、スカートを含む婦人服企画を作成。",
    en: "Create a womenswear plan inspired by ZIMMERMANN Resort 2026, featuring cropped jackets, shirt dresses, printed dresses, and skirts.",
  },
  "以PDF的2025秋冬系列做为设计灵感，需要包含印花外套、棒球外套、卫衣、毛衣、长裤生成一份男童主题设计企划。": {
    ja: "PDFの2025年秋冬を着想源に、プリントジャケット、スタジャン、スウェット、ニット、パンツを含む男児服企画を作成。",
    en: "Create a boyswear plan inspired by the PDF Fall/Winter 2025 collection, featuring printed jackets, varsity jackets, sweatshirts, sweaters, and trousers.",
  },
  "面料套版": { ja: "生地差し替え", en: "Fabric Layout" },
  "面料·指定版式快速设计": { ja: "生地・レイアウトをすぐ変更", en: "Swap fabric & layout" },
  "单款裂变": { ja: "単品バリエーション", en: "Style Variations" },
  "单款延展，快速生成系列设计": { ja: "1型からシリーズ展開", en: "Extend one style" },
  "多款融合": { ja: "デザイン融合", en: "Style Fusion" },
  "融合多款特征，焕新呈现": { ja: "複数デザインを融合", en: "Blend multiple styles" },
  "转线稿图": { ja: "線画に変換", en: "Convert to Line Art" },
  "批量转换，秒速生成线稿": { ja: "一括変換ですぐに線画を生成", en: "Batch convert images into line art" },
  "款式融合": { ja: "スタイル融合", en: "Style Fusion" },
  "融合特征，焕新呈现": { ja: "特徴を融合して新しいデザインへ", en: "Blend features into a refreshed design" },
  "印花设计": { ja: "プリントデザイン", en: "Print Design" },
  "基于参考图或内容生成印花图案": { ja: "画像から柄を生成", en: "Create prints from images" },
  "业务偏好档案标题": { ja: "ビジネスプロファイル", en: "Business Profiles" },
  "保存长期稳定的市场、品类、风格和经营边界，供任务自动应用。": { ja: "事業条件を保存し、タスクに反映。", en: "Save business rules for every task." },
  "新建档案": { ja: "新規プロファイル", en: "New Profile" },
  "输入档案名称搜索": { ja: "プロファイル名で検索", en: "Search profile names" },
  "清空搜索": { ja: "検索をクリア", en: "Clear search" },
  "没有匹配的档案": { ja: "一致するプロファイルがありません", en: "No matching profiles" },
  "还没有业务偏好档案": { ja: "ビジネスプロファイルはまだありません", en: "No business profiles yet" },
  "试试其他名称，或创建一个新的档案": { ja: "別の名前で検索するか、新しく作成してください。", en: "Try another name or create a new profile." },
  "保存品类、价格段、国家和目标年龄，后续任务无需重复输入": { ja: "カテゴリ・価格帯・国・年齢層を保存して、次回から入力を省けます。", en: "Save category, price, market, and age range so you don’t enter them again." },
  "创建第一个档案": { ja: "最初のプロファイルを作成", en: "Create First Profile" },
  "没有更多内容了": { ja: "以上です", en: "You’re all caught up" },
  "返回": { ja: "戻る", en: "Back" },
  "编辑业务偏好档案": { ja: "ビジネスプロファイルを編集", en: "Edit Business Profile" },
  "创建业务偏好档案": { ja: "ビジネスプロファイルを作成", en: "Create Business Profile" },
  "保存不同任务中重复使用的业务范围，系统将在任务开始时自动应用": { ja: "よく使う事業条件を保存し、タスク開始時に自動適用します。", en: "Save reusable business rules and apply them automatically when a task starts." },
  "智能预填": { ja: "AI自動入力", en: "AI Autofill" },
  "系统只预填资料中明确提到的信息，未提及的字段将保持为空": { ja: "資料に明記された内容だけを自動入力し、不明な項目は空欄にします。", en: "Only details clearly stated in the files are filled in; missing fields stay blank." },
  "上传资料包，自动预填档案": { ja: "資料をアップロードして自動入力", en: "Upload files to autofill the profile" },
  "支持商品企划、品牌资料、销售复盘、客户提案等": { ja: "商品企画・ブランド資料・販売レビュー・顧客提案などに対応", en: "Supports product plans, brand decks, sales reviews, client proposals, and more" },
  "支持 PDF、PPT、Word、Excel、CSV、JPG、PNG 格式": { ja: "PDF、PPT、Word、Excel、CSV、JPG、PNGに対応", en: "Supports PDF, PPT, Word, Excel, CSV, JPG, and PNG" },
  "移除文件": { ja: "ファイルを削除", en: "Remove file" },
  "选择资料": { ja: "ファイルを選択", en: "Choose Files" },
  "档案名称": { ja: "プロファイル名", en: "Profile name" },
  "示例：通勤女装档案": { ja: "例：通勤向けレディース", en: "Example: Women’s Workwear" },
  "业务范围": { ja: "事業範囲", en: "Business Scope" },
  "品类": { ja: "カテゴリ", en: "Category" },
  "价格段": { ja: "価格帯", en: "Price Range" },
  "国家": { ja: "市場", en: "Market" },
  "年龄段": { ja: "年齢層", en: "Age Range" },
  "渠道": { ja: "販売チャネル", en: "Channels" },
  "参考品牌": { ja: "参考ブランド", en: "Reference Brands" },
  "男装": { ja: "メンズ", en: "Menswear" },
  "女装": { ja: "レディース", en: "Womenswear" },
  "童装": { ja: "キッズ", en: "Kidswear" },
  "鞋袋": { ja: "シューズ・バッグ", en: "Shoes & Bags" },
  "中国": { ja: "中国", en: "China" },
  "日本": { ja: "日本", en: "Japan" },
  "韩国": { ja: "韓国", en: "South Korea" },
  "美国": { ja: "米国", en: "United States" },
  "欧洲": { ja: "欧州", en: "Europe" },
  "非洲": { ja: "アフリカ", en: "Africa" },
  "欧美市场": { ja: "欧米市場", en: "Europe & US" },
  "线下门店": { ja: "実店舗", en: "Retail Stores" },
  "跨境电商": { ja: "越境EC", en: "Cross-border E-commerce" },
  "天猫": { ja: "Tmall", en: "Tmall" },
  "京东": { ja: "JD.com", en: "JD.com" },
  "抖音": { ja: "Douyin", en: "Douyin" },
  "优衣库": { ja: "ユニクロ", en: "UNIQLO" },
  "0–18岁": { ja: "0〜18歳", en: "Ages 0–18" },
  "19–24岁": { ja: "19〜24歳", en: "Ages 19–24" },
  "25–34岁": { ja: "25〜34歳", en: "Ages 25–34" },
  "35–44岁": { ja: "35〜44歳", en: "Ages 35–44" },
  "45–65岁": { ja: "45〜65歳", en: "Ages 45–65" },
  "66–100岁": { ja: "66〜100歳", en: "Ages 66–100" },
  "最低价": { ja: "最低価格", en: "Min price" },
  "最高价": { ja: "最高価格", en: "Max price" },
  "选择国家": { ja: "市場を選択", en: "Select market" },
  "选择国家（支持多选）": { ja: "市場を選択（複数可）", en: "Select markets (multiple allowed)" },
  "选择年龄段": { ja: "年齢層を選択", en: "Select age range" },
  "选择平台": { ja: "チャネルを選択", en: "Select channel" },
  "输入品牌名称": { ja: "ブランド名を入力", en: "Enter brand name" },
  "重置": { ja: "リセット", en: "Reset" },
  "保存修改": { ja: "変更を保存", en: "Save Changes" },
  "保存档案": { ja: "保存", en: "Save Profile" },
  "上传资料": { ja: "資料をアップロード", en: "Upload Files" },
  "开始解析": { ja: "解析を開始", en: "Start Analysis" },
  "释放文件即可上传": { ja: "ここにドロップしてアップロード", en: "Drop to upload" },
  "拖放文件到此处，或点击选择": { ja: "ここにドラッグ＆ドロップ、またはクリックして選択", en: "Drop files here, or click to browse" },
  "资料解析完成": { ja: "解析が完了しました", en: "Analysis Complete" },
  "正在解析资料包": { ja: "資料を解析中", en: "Analyzing Files" },
  "已识别可预填信息，正在准备确认结果": { ja: "自動入力できる情報を検出しました。確認画面を準備しています。", en: "Autofill details found. Preparing the results." },
  "系统正在读取并识别资料内容": { ja: "資料を読み取り、内容を確認しています。", en: "Reading and identifying file content." },
  "读取日本通勤女装资料包.pdf": { ja: "日本通勤レディース資料.pdfを読み込み", en: "Reading Japan Workwear Pack.pdf" },
  "提取商品企划与价格信息": { ja: "商品企画と価格情報を抽出", en: "Extracting product plan and pricing" },
  "识别品类、国家、年龄段与渠道": { ja: "カテゴリ・市場・年齢層・チャネルを確認", en: "Identifying category, market, age range, and channels" },
  "已识别并可预填 5 项信息，未提及内容保持为空。": { ja: "自動入力できる5項目を検出しました。不明な項目は空欄のままです。", en: "Found 5 details to autofill. Unspecified fields will stay blank." },
  "暂不预填": { ja: "自動入力しない", en: "Skip for now" },
  "未识别：参考品牌": { ja: "未検出：参考ブランド", en: "Not found: Reference brands" },
  "价格段同时出现两个候选，请选择": { ja: "価格帯が2つ見つかりました。1つ選んでください。", en: "Two price ranges were found. Choose one." },
  "已完成": { ja: "完了", en: "Completed" },
  "项必填内容": { ja: "件の必須項目", en: "required fields" },
  "更新于": { ja: "更新", en: "Updated" },
  "资料": { ja: "資料", en: "files" },
  "份": { ja: "件", en: "" },
  "确认删除「{name}」吗？删除后不可恢复。": { ja: "「{name}」を削除しますか？この操作は元に戻せません。", en: "Delete “{name}”? This can’t be undone." },
  "已上传 {count} 份资料": { ja: "{count}件の資料をアップロード済み", en: "{count} file(s) uploaded" },
  "品类：女装": { ja: "カテゴリ：レディース", en: "Category: Womenswear" },
  "价格段：JPY8,000–18,000": { ja: "価格帯：JPY 8,000〜18,000", en: "Price range: JPY 8,000–18,000" },
  "国家：日本": { ja: "市場：日本", en: "Market: Japan" },
  "年龄段：25–34岁、35–44岁": { ja: "年齢層：25〜34歳、35〜44歳", en: "Age range: 25–34, 35–44" },
  "渠道：ZOZOTOWN、Rakuten Fashion": { ja: "販売チャネル：ZOZOTOWN、Rakuten Fashion", en: "Channels: ZOZOTOWN, Rakuten Fashion" },
  "应用预填结果": { ja: "自動入力を反映", en: "Apply Autofill" },
  "未填写": { ja: "未入力", en: "Not provided" },
  "使用此档案新建任务": { ja: "このプロファイルでタスク作成", en: "Create Task with Profile" },
  "查看详情": { ja: "詳細を見る", en: "View Details" },
  "编辑": { ja: "編集", en: "Edit" },
  "用于任务中的默认业务范围与生成边界": { ja: "タスクに適用する既定の事業条件と生成ルール", en: "Default business scope and generation rules for tasks" },
  "资料包": { ja: "資料", en: "Source Files" },
  "重新上传并解析": { ja: "再アップロードして解析", en: "Re-upload & Analyze" },
  "重命名档案": { ja: "プロファイル名を変更", en: "Rename Profile" },
  "删除档案": { ja: "プロファイルを削除", en: "Delete Profile" },
  "修改后将用于后续任务中选择此档案。": { ja: "変更後の名前は、以降のタスクで表示されます。", en: "The new name will appear when selecting this profile in future tasks." },
  "请输入档案名称": { ja: "プロファイル名を入力", en: "Enter profile name" },
  "货币": { ja: "通貨", en: "Currency" },
  "刚刚": { ja: "たった今", en: "Just now" },
  "档案已保存": { ja: "プロファイルを保存しました", en: "Profile saved" },
  "档案已重命名": { ja: "名前を変更しました", en: "Profile renamed" },
  "复制成功": { ja: "コピーしました", en: "Copied" },
  "档案已删除": { ja: "プロファイルを削除しました", en: "Profile deleted" },
};

const systemCopy: Record<string, Translation> = { ...generatedSiteCopy, ...copy };
const replacementCopy = {
  ja: Object.entries(systemCopy)
    .filter(([source]) => source.length > 1 && /[\u3400-\u9fff]/u.test(source) && !/[<>]/.test(source))
    .sort(([left], [right]) => right.length - left.length),
  en: Object.entries(systemCopy)
    .filter(([source]) => source.length > 1 && /[\u3400-\u9fff]/u.test(source) && !/[<>]/.test(source))
    .sort(([left], [right]) => right.length - left.length),
} as const;

const originalText = new WeakMap<Text, string>();
const translatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
const translatableAttributes = ["placeholder", "aria-label", "title", "alt"] as const;
const userContentSelector = ".conversation-message--user, .tree-row, .task-row, .composer-attachment-chip, [data-localize='off']";

function polishTranslation(value: string, language: "ja" | "en") {
  if (language === "ja") {
    return value
      .replaceAll("AI フェイスリフト", "AIデザイン")
      .replaceAll("フェイスリフト", "デザイン変更")
      .replaceAll("製品構造", "商品構成")
      .replaceAll("商品構造", "商品構成")
      .replaceAll("調査", "リサーチ");
  }
  return value
    .replace(/AI facelift/giu, "AI redesign")
    .replace(/commodity structure/giu, "assortment")
    .replace(/product structure/giu, "assortment")
    .replace(/new product planning case/giu, "New Product Plan")
    .replace(/customer proposal/giu, "client proposal")
    .replace(/\bsurvey\b/giu, "research");
}

export function translateSystemCopy(source: string, locale: Locale) {
  if (locale === "zh-CN" || !/[\u3400-\u9fff]/u.test(source)) return source;
  const language = locale === "ja-JP" ? "ja" : "en";
  const leading = source.match(/^\s*/u)?.[0] ?? "";
  const trailing = source.match(/\s*$/u)?.[0] ?? "";
  const content = source.trim();
  const exact = systemCopy[content]?.[language];
  if (exact) return `${leading}${polishTranslation(exact, language)}${trailing}`;

  let translated = content;
  replacementCopy[language].forEach(([fragment, translations]) => {
    if (translated.includes(fragment)) translated = translated.replaceAll(fragment, translations[language]);
  });
  return `${leading}${polishTranslation(translated, language)}${trailing}`;
}

export function translateHtmlCopy(html: string, locale: Locale) {
  if (locale === "zh-CN" || typeof DOMParser === "undefined") return html;
  const documentCopy = new DOMParser().parseFromString(html, "text/html");
  const walker = documentCopy.createTreeWalker(documentCopy.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parentName = node.parentElement?.tagName;
    if (parentName !== "SCRIPT" && parentName !== "STYLE") node.nodeValue = translateSystemCopy(node.nodeValue ?? "", locale);
    node = walker.nextNode();
  }
  documentCopy.querySelectorAll("[alt], [title], [aria-label]").forEach((element) => {
    ["alt", "title", "aria-label"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateSystemCopy(value, locale));
    });
  });
  return `<!doctype html>${documentCopy.documentElement.outerHTML}`;
}

function localizeTextNode(node: Text, locale: Locale) {
  if (node.parentElement?.closest(`${userContentSelector}, [data-i18n-static="true"]`)) return;
  const previousTranslation = translatedText.get(node);
  if (!originalText.has(node) || (previousTranslation !== undefined && node.data !== previousTranslation)) {
    originalText.set(node, node.data);
  }
  const source = originalText.get(node) ?? node.data;
  const next = translateSystemCopy(source, locale);
  translatedText.set(node, next);
  if (node.data !== next) node.data = next;
}

function localizeElementAttributes(element: Element, locale: Locale) {
  if (element.closest('[data-i18n-static="true"]')) return;
  let originals = originalAttributes.get(element);
  let translations = translatedAttributes.get(element);
  if (!originals) {
    originals = new Map();
    originalAttributes.set(element, originals);
  }
  if (!translations) {
    translations = new Map();
    translatedAttributes.set(element, translations);
  }
  translatableAttributes.forEach((attribute) => {
    const current = element.getAttribute(attribute);
    if (current === null) return;
    const previousTranslation = translations.get(attribute);
    if (!originals.has(attribute) || (previousTranslation !== undefined && current !== previousTranslation)) {
      originals.set(attribute, current);
    }
    const next = translateSystemCopy(originals.get(attribute) ?? current, locale);
    translations.set(attribute, next);
    if (current !== next) element.setAttribute(attribute, next);
  });
}

function localizeTree(root: Node, locale: Locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root as Text, locale);
    return;
  }
  if (!(root instanceof Element) && !(root instanceof DocumentFragment) && !(root instanceof Document)) return;
  if (root instanceof Element) localizeElementAttributes(root, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node as Text, locale);
    else localizeElementAttributes(node as Element, locale);
    node = walker.nextNode();
  }
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem("lightchain-locale");
    return stored === "ja-JP" || stored === "en-US" || stored === "zh-CN" ? stored : "zh-CN";
  });

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("lightchain-locale", locale);
    if (!document.body) return;
    localizeTree(document.body, locale);
    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        mutations.forEach((mutation) => {
          if (mutation.type === "characterData") localizeTree(mutation.target, locale);
          mutation.addedNodes.forEach((node) => localizeTree(node, locale));
          if (mutation.type === "attributes") localizeTree(mutation.target, locale);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...translatableAttributes] });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (source, values) => {
      const translated = locale === "zh-CN" ? source : systemCopy[source]?.[locale === "ja-JP" ? "ja" : "en"] ?? source;
      return Object.entries(values ?? {}).reduce((result, [key, item]) => result.replaceAll(`{${key}}`, String(item)), translated);
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
