# GitHub Pages 部署

本站是 Vite 应用，必须部署构建后的 `dist/`，不能直接发布仓库根目录。

## 仓库设置

在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
对应 GitHub API 字段为 `build_type: workflow`，不是 `legacy`。

推送到 `main` 后，`.github/workflows/deploy.yml` 校验发布来源，检查课程内容，
使用 `GITHUB_PAGES=true` 构建，再上传 `dist/` 并通过 `actions/deploy-pages` 发布。
项目资源前缀为 `/professional-cpp-learning/`。`public/.nojekyll` 会复制到产物根目录，
标明这是已构建的静态站点。

本地验证：

```bash
npm run check:course
npm run check:migration
npm run ppt:check
npm run build:pages
```

## 排查 Jekyll / Liquid 报错

2026-10-28 的 `pages build and deployment #147` 由分支发布触发，
Jekyll 将 `daily/day-023-reuse-stdlib-third-party-own.md` 中的 C++ 初始化列表
`{{...}}` 识别为 Liquid 变量并失败。同一提交的 Vite 部署工作流成功。

遇到此类错误应检查 Pages 发布来源，不应修改合法的 C++ 教材代码或增加 Liquid 转义。
也不要在仓库根目录添加 `.nojekyll` 后继续发布源码：源码中的 TSX 尚未经过 Vite 编译。
修正来源后，在 Actions 中运行 **Deploy to GitHub Pages**；历史失败记录会保留，
以最新 Vite 部署结果为准。
