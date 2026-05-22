# ACM Trainer

Windows 本地 ACM 训练助手。它用 Electron + React + SQLite 保存 VP 比赛、复盘、图片墙、比赛提醒缓存，并提供置顶正计时/倒计时窗口。

## 运行环境

- Node.js LTS
- npm
- Windows 10/11

## 本地开发

```powershell
npm install
npm run dev
```

`npm run dev` 会同时启动 Vite 渲染进程和 Electron 主进程。

## 常用命令

```powershell
npm run test -- --run
npm run build
npm run start
npm run package
```

- `npm run test -- --run`：运行 Vitest。
- `npm run build`：构建 renderer、main、preload。
- `npm run start`：使用已构建的 Electron 入口启动应用。
- `npm run package`：生成 Windows 安装包，输出到 `dist-packaged`。

## 数据位置

默认数据保存在 Electron 的 `userData` 目录中，设置页会显示实际路径。主要内容包括：

- `acm-trainer.sqlite`：本地 SQLite 数据库。
- `media/images`：导入到图片墙的本地图片副本。

测试和 e2e 会使用临时数据目录，不会污染正式数据。

## 使用方式

- 关闭主窗口后应用会留在托盘后台运行。
- 托盘菜单可以打开主窗口、打开置顶计时器、刷新比赛、查看今日提醒或退出应用。
- 今日提醒会在启动和 Windows 解锁后尝试刷新比赛；网络失败时继续使用本地缓存。
- 设置页可以开关比赛提醒、随机图片提醒、开机自启，并查看数据目录。
