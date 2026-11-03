import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { courseReady } from "./lib/course";
import { hydrateTopics } from "./lib/topics";
import App from "./App";
import "./index.css";

const status = document.createElement("div");
status.className = "content-boot";
status.textContent = "加载课程内容…";
document.getElementById("root")!.appendChild(status);

// 首屏只等两件轻量索引:课程骨架(manifest 元数据+进度点)与专题列表(同为
// manifest 级,复用同一次下载)。二者是正文相对链接解析成 SPA 路由的必要索引;
// 课文正文、搜索索引、slides、booklets、参考书 PDF 导读等重内容全部异步/按需。
Promise.all([courseReady, hydrateTopics()])
  .then(() => {
    status.remove();
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch(() => {
    status.remove();
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
