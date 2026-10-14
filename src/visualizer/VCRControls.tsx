import { useEffect, useState } from "react";
import type { MemorySnapshot } from "./types";

export function VCRControls({
  snapshots,
  currentStep,
  onStepChange,
  className = "",
}: {
  snapshots: MemorySnapshot[];
  currentStep: number;
  onStepChange: (step: number) => void;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1000); // 毫秒/步

  const totalSteps = snapshots.length;
  const currentSnapshot = snapshots[currentStep] || null;

  // 自动播放定时器
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStep >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      onStepChange(currentStep + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, totalSteps, speed, onStepChange]);

  const handleFirst = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    onStepChange(Math.max(0, currentStep - 1));
  };

  const handleTogglePlay = () => {
    if (currentStep >= totalSteps - 1) {
      onStepChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    onStepChange(Math.min(totalSteps - 1, currentStep + 1));
  };

  const handleLast = () => {
    setIsPlaying(false);
    onStepChange(totalSteps - 1);
  };

  if (totalSteps === 0) {
    return (
      <div className={`vcr-controls empty ${className}`}>
        <span>无可视化回放数据</span>
      </div>
    );
  }

  return (
    <div className={`vcr-controls-container ${className}`}>
      <div className="vcr-toolbar">
        <div className="vcr-buttons">
          <button
            type="button"
            className="vcr-btn"
            title="第一步 (First)"
            disabled={currentStep === 0}
            onClick={handleFirst}
          >
            ⏮
          </button>
          <button
            type="button"
            className="vcr-btn"
            title="上一步 (Prev)"
            disabled={currentStep === 0}
            onClick={handlePrev}
          >
            ◀
          </button>
          <button
            type="button"
            className={`vcr-btn play-btn ${isPlaying ? "active" : ""}`}
            title={isPlaying ? "暂停 (Pause)" : "自动播放 (Play)"}
            onClick={handleTogglePlay}
          >
            {isPlaying ? "⏸ 暂停" : "▶ 播放"}
          </button>
          <button
            type="button"
            className="vcr-btn"
            title="下一步 (Next)"
            disabled={currentStep >= totalSteps - 1}
            onClick={handleNext}
          >
            ▶
          </button>
          <button
            type="button"
            className="vcr-btn"
            title="最后一步 (Last)"
            disabled={currentStep >= totalSteps - 1}
            onClick={handleLast}
          >
            ⏭
          </button>
        </div>

        <div className="vcr-slider-wrapper">
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              onStepChange(Number(e.target.value));
            }}
            className="vcr-slider"
          />
          <span className="vcr-step-counter">
            Step <strong>{currentStep + 1}</strong> / {totalSteps}
          </span>
        </div>

        <div className="vcr-speed">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="vcr-speed-select"
          >
            <option value={1500}>0.7x 慢速</option>
            <option value={1000}>1.0x 正常</option>
            <option value={500}>2.0x 快速</option>
          </select>
        </div>
      </div>

      {currentSnapshot && (
        <div className="vcr-action-banner">
          <span className="vcr-action-tag">Line {currentSnapshot.line}</span>
          <span className="vcr-action-text">{currentSnapshot.description}</span>
          {currentSnapshot.warnings.length > 0 && (
            <div className="vcr-warning-pill">
              {currentSnapshot.warnings.map((w, idx) => (
                <span key={idx}>{w}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
