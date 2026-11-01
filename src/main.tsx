import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { hydrateCourses, courseReady } from "./lib/course";
import { hydrateSlides } from "./lib/slides";
import { hydrateTopics, hydrateReferenceBooks } from "./lib/topics";
import { hydrateSearch } from "./lib/search";
import { hydrateBooklets } from "./lib/booklets";
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

courseReady
  .then(() =>
    Promise.all([hydrateSlides(), hydrateTopics(), hydrateSearch(), hydrateBooklets(), hydrateReferenceBooks()]),
  )
  .then(() => {
    status.remove();
    mount();
  })
  .catch(() => {
    status.remove();
    mount();
  });
