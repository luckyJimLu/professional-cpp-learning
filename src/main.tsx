import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { courseReady } from "./lib/course";
import App from "./App";
import "./index.css";

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

const status = document.createElement("div");
status.className = "content-boot";
status.textContent = "加载课程内容…";
document.getElementById("root")!.appendChild(status);

// 首屏只等课程骨架(manifest 元数据 + 进度点)。课件正文、搜索索引、slides、
// topics、booklets 均改为挂载后由对应视图/后台异步触发,不再阻塞首屏。
courseReady
  .then(() => {
    status.remove();
    mount();
  })
  .catch(() => {
    status.remove();
    mount();
  });
