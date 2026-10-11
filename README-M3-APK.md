# 人生重开 · 禄 · 离线版

[English](./README.md) | 简体中文

基于 [VickScarlet/remake](https://github.com/VickScarlet/remake) 制作的**双端离线版**：Android APK + Windows 便携版。
完全离线运行，不需要服务器或 VPS。

当前版本：**1.1.0**（APK `versionCode 2`）

## 已实现内容

- **Android APK**：可断网运行；包名 `com.skyzenglu.liferestart`；应用名「人生重开」。
- **Windows 便携版 EXE**：免安装，双击即用，同样离线；日志每次启动自动清空重建。
- 使用 **Material 3** 风格重新设计界面：顶部应用栏、圆角卡片、填充按钮、M3 色板和深浅色主题。
- **存档导出与导入**：
  - 手机端：导出生成 JSON 存档并调起系统分享；导入选择文件后恢复。
  - 桌面端：调用 Windows 原生文件对话框。
  - 界面入口在顶部应用栏的「导出 / 导入」两个按钮。

### 天赋

- 新增**橙色天赋【禄】**：
  - 名称：禄
  - 描述：【Sky增禄】。
  - 效果：初始可用属性点 +2000，快乐 +100。
- 新增第 5 档稀有度**彩色天赋**（比金色更高）：
  - 出现概率为**金色天赋的 1/2**，所有品级概率之和仍为 100%。
  - 金色与彩色会随成就数量同步加成，保持「彩色 = 金色的一半」这一关系。
  - 界面以彩虹渐变呈现。
- 新增两个**彩色天赋**：
  - 【气运之子】：遇到增加属性的事件概率大幅提升（正向属性事件权重 ×3）。
  - 【先天道体】：悟出大道的概率大幅提升（悟道事件权重 ×3）。

### 模式

- 新增模式**「我的命运我做主！」**（常驻第三个模式）：
  - 列出全部天赋，按稀有度降序。
  - 最多可选择 10 个天赋，可一键清空。
  - 选择后进入属性分配并开始人生。

### 悟道概率（全局调整）

「悟出各种大道」的总概率不再固定，改为随智力变化：

| 智力 | 悟出大道的概率 |
| --- | --- |
| 0 | 1% |
| 500 | 2% |
| 1000 | 3% + 原有 1% = **4%** |
| ≥ 1000 | 4%（封顶） |

若持有【先天道体】，在此基础之上再 ×3。

## 桌面版日志

便携版运行时会在 **exe 同目录**写入日志，且**每次启动都会清空上一次的内容**：

```text
skyzl\liferestart\liferestart.log
```

## 从源码重新构建

环境要求：

- Node.js 20 或更高版本
- pnpm（本项目在 pnpm 12 上验证通过）
- **JDK 21**（用 17 会报「无效的源发行版：21」）
- Android SDK 35 和 Build-Tools 35
- Bun（`build:data` 需要）

```powershell
$env:JAVA_HOME = '<你的 JDK 21 路径>'

pnpm install
pnpm build:data
pnpm cap sync android
cd android; .\gradlew.bat assembleDebug
cd ..; pnpm build:exe
```

产物位置：

```text
android\app\build\outputs\apk\debug\app-debug.apk      # APK
dist-electron\人生重开-禄-3.0.0-便携版.exe               # Windows 便携版
```

> 注意：`pnpm-workspace.yaml` 里的 `allowBuilds` 已放开 `electron` / `electron-winstaller`。
> pnpm 12 默认拦截依赖的构建脚本，若删掉这两项，Electron 二进制不会被下载，`build:exe` 会失败。

## 数据与代码修改位置

| 内容 | 位置 |
| --- | --- |
| 天赋数据 | `packages/data/src/talent.xlsx` |
| 游戏事件数据 | `packages/data/src/event.xlsx` |
| 天赋稀有度定义 | `packages/data/src/talent.types.ts` |
| 天赋抽取概率与评级 | `apps/web/src/config.ts` |
| 天赋抽取逻辑 | `packages/core/src/talent.ts` |
| 事件加权（气运之子 / 悟道概率 / 先天道体） | `packages/core/src/game.ts` |
| 新逻辑测试 | `packages/core/src/rainbow.spec.ts` |
| 模式定义 | `packages/hooks/src/play.ts` |
| 「我的命运我做主」界面 | `apps/web/src/containers/Pick.tsx` |
| 存档导入导出 | `apps/web/src/storage/save.ts` |
| Material 3 样式 | `apps/web/src/styles/material.css` |
| 稀有度配色 | `apps/web/src/styles/colors.css` |
| 桌面端入口 | `desktop/main.cjs`、`desktop/preload.cjs` |
| 打包配置 | `capacitor.config.ts`、`electron-builder.yml` |
| 桌面版图标 | `build/icon.ico`（由 Android 图标生成） |

`packages/data/dist` 与 `apps/web/dist` 是构建产物，已被 `.gitignore` 忽略；
克隆后需先执行 `pnpm install` 和 `pnpm build:data`。修改 `.xlsx` 后也必须重新运行 `pnpm build:data`。

## 关于 EXE 的分发

便携版 EXE 约 85 MB，不适合提交进 Git（`.gitignore` 已排除 `release/*.exe` 与 `dist-electron/`）。
建议构建后通过 **GitHub Releases** 分发。
