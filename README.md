# ACM Trainer

Windows 本地 ACM 训练助手。它用 Electron + React + SQLite 保存 VP 比赛、复盘、图片墙、比赛提醒缓存，并提供置顶正计时/倒计时窗口。

## 下载与安装

前往 [最新版本下载页](https://github.com/PollyPorrot/acm-trainer/releases/latest)。Windows 10/11 用户请下载名为 `ACM Trainer Setup <版本>.exe` 的安装程序并运行。

安装程序目前未进行代码签名，因此 Windows 可能显示“未知发布者”或 SmartScreen 警告。确认安装程序是从本官方仓库下载后，可依次选择“更多信息”和“仍要运行”继续安装。

## 开发环境要求

以下环境仅用于本地开发；安装已打包应用的用户无需安装 Node.js 或 npm。

- Node.js LTS
- npm

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

打包版本会将全部应用数据保存在与 `ACM Trainer.exe` 同级的 `data` 目录中；开发模式默认使用仓库根目录下的 `data` 目录。设置页会显示当前实际使用的数据目录。数据包括：

- `acm-trainer.sqlite`：本地 SQLite 数据库。
- `media/images`：导入到图片墙的本地图片副本。

卸载应用或移动安装位置前，建议备份整个 `data` 目录。

测试和 e2e 会使用临时数据目录，不会污染正式数据。

## 使用方式

- 关闭主窗口后应用会留在托盘后台运行。
- 托盘菜单可以打开主窗口、打开置顶计时器、刷新比赛、查看今日提醒或退出应用。
- 今日提醒会在启动和 Windows 解锁后尝试刷新比赛；网络失败时继续使用本地缓存。
- 设置页可以开关比赛提醒、随机图片提醒、开机自启，并查看数据目录。
