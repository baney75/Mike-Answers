import { useEffect, useMemo, useRef } from "react";
import type { DemoSpec } from "../types";

interface DemoBlockProps {
  json: string;
}

function readSpec(json: string): DemoSpec | null {
  try {
    return JSON.parse(json) as DemoSpec;
  } catch {
    return null;
  }
}

export function DemoBlock({ json }: DemoBlockProps) {
  const spec = useMemo(() => readSpec(json), [json]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!spec || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let frame = 0;
    let animationFrame = 0;

    const width = canvas.width;
    const height = canvas.height;
    const params = spec.params ?? {};

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fffaf8";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#1f1a18";
      ctx.lineWidth = 2;

      if (spec.type === "kinematics") {
        const amplitude = params.amplitude ?? 120;
        const speed = (params.speed ?? 1.4) * 0.018;
        const y = height * 0.68;
        const x = 40 + ((frame * speed * 80) % (width - 80));
        ctx.strokeStyle = "#7a1f34";
        ctx.beginPath();
        ctx.moveTo(30, y + 18);
        ctx.lineTo(width - 30, y + 18);
        ctx.stroke();
        ctx.fillStyle = "#7a1f34";
        ctx.fillRect(x - 30, y - amplitude * 0.1, 60, 40);
      }

      if (spec.type === "pendulum") {
        const angle = Math.sin(frame * 0.04) * (params.angle ?? 0.7);
        const length = params.length ?? 130;
        const originX = width / 2;
        const originY = 40;
        const bobX = originX + Math.sin(angle) * length;
        const bobY = originY + Math.cos(angle) * length;
        ctx.strokeStyle = "#355070";
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();
        ctx.fillStyle = "#b88c3a";
        ctx.beginPath();
        ctx.arc(bobX, bobY, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      if (spec.type === "function_transform") {
        const scale = params.scale ?? 1;
        const shift = params.shift ?? 0;
        ctx.strokeStyle = "#7a1f34";
        ctx.beginPath();
        for (let px = 0; px < width; px += 1) {
          const x = (px - width / 2) / 40;
          const y = scale * Math.sin(x + shift + frame * 0.02);
          const py = height / 2 - y * 50;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      if (spec.type === "distribution") {
        const mean = params.mean ?? width / 2;
        const spread = params.spread ?? 90;
        ctx.strokeStyle = "#7a1f34";
        ctx.beginPath();
        for (let px = 0; px < width; px += 1) {
          const distance = (px - mean) / spread;
          const y = Math.exp(-(distance * distance) / 2);
          const py = height - 40 - y * (height * 0.62);
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [spec]);

  if (!spec) {
    return null;
  }

  return (
    <section className="my-6 rounded-[1.6rem] border-2 border-gray-900 bg-white p-5 dark:border-gray-100 dark:bg-gray-950">
      {spec.title ? <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{spec.title}</h4> : null}
      {spec.caption ? <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{spec.caption}</p> : null}
      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-gray-200 bg-(--aqs-paper) dark:border-gray-800">
        <canvas ref={canvasRef} width={720} height={320} className="h-auto w-full" />
      </div>
      {spec.note ? <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{spec.note}</p> : null}
    </section>
  );
}
