import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RtosApp } from "./RtosApp.tsx";
import "../styles.css";
import "./rtos.css";

createRoot(document.getElementById("root")!).render(<StrictMode><RtosApp /></StrictMode>);
