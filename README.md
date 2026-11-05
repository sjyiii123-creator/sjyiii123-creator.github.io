# 李正淼 · 个人简历网站

极简现代风个人简历站点：深蓝侧边栏 + 白色内容区，带滚动渐进动画、渐变过场动画、LEGO 手指光标、欢迎词首屏。
访客只能浏览与留言；**只有站长可以在后台可视化编辑全部内容**。

## 目录结构

```
├── index.html          # 简历主页（访客可见）
├── css/style.css       # 主样式（侧边栏 / 动画 / 光标）
├── js/main.js          # 渲染 + 滚动动画 + LEGO 光标 + 打字机
├── data/resume.json    # ★ 全部简历数据（后台编辑的就是它）
├── assets/             # 头像、项目配图、LEGO 手指光标
└── admin/              # ★ 站长后台（可视化编辑器）
    ├── index.html
    ├── admin.css
    ├── admin.js
    └── config.js       # 登录配置（Google / 口令 / 仓库）
```

## 部署（GitHub Pages）

1. 把整个目录推送到你的 `用户名.github.io` 仓库的 `main` 分支。
2. 仓库 Settings → Pages → Source 选择 `main` 分支根目录。
3. 访问 `https://用户名.github.io/`（主页）与 `https://用户名.github.io/admin/`（后台）。

## 后台登录配置（admin/config.js）

| 配置项 | 说明 |
| --- | --- |
| `googleClientId` | Google OAuth Client ID（推荐）。到 Google Cloud Console 创建「OAuth 客户端 ID（Web 应用）」，授权来源填 `https://用户名.github.io` |
| `allowedEmails` | 允许登录的 Google 邮箱列表；留空表示任意 Google 账号可进入编辑界面 |
| `adminPasscode` | 管理员口令（备用登录方式，**请务必改成你自己的强口令**） |
| `repoOwner` / `repoName` / `branch` | 简历仓库信息；留空则自动使用 Token 对应账号的 `用户名.github.io` |

> **安全模型**：进入后台界面需要身份验证；而**真正能改动线上内容**必须持有你的 GitHub Token（保存时调用 GitHub API 提交）。
> Token 只存在你自己浏览器的 localStorage 中，不会被网站访客获取。
> 如果想再加一层保险，把 `allowedEmails` 填成你的 Google 邮箱即可。

## 内容编辑

后台支持：欢迎词 / 关于我 / 工作经历 / 技能 / 作品集（含图片上传）/ 教育背景 / 联系方式 / 全局信息，
所有列表支持添加、删除、上移下移排序，改完点「保存并发布」约 1 分钟内自动生效（Ctrl/Cmd + S 快捷保存）。

## 本地预览

```bash
cd resume-site
python3 -m http.server 8080
# 打开 http://localhost:8080
```
