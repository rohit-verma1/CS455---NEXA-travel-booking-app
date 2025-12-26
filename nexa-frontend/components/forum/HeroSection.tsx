"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  onScrollToBlogs: () => void;
  onScrollToForums: () => void;
}

const phrases = [
  "Discover Your Next Adventure",
  "Connect with Fellow Travelers",
  "Explore Hidden Gems",
  "Share Your Journey",
];

const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToBlogs, onScrollToForums }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let direction: "forward" | "backward" = "forward";
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentPhrase = phrases[phraseIndex];
      setTypedText(currentPhrase.slice(0, charIndex));

      if (direction === "forward") {
        if (charIndex < currentPhrase.length) {
          charIndex += 1;
          timeout = setTimeout(tick, 80);
          return;
        }
        direction = "backward";
        timeout = setTimeout(tick, 2000);
        return;
      }

      if (charIndex > 0) {
        charIndex -= 1;
        timeout = setTimeout(tick, 40);
        return;
      }

      direction = "forward";
      phraseIndex = (phraseIndex + 1) % phrases.length;
      timeout = setTimeout(tick, 150);
    };

    timeout = setTimeout(tick, 150);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible(prev => !prev), 600);
    return () => clearInterval(blink);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 400;
    };

    setSize();

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
    }));

    let frameId = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();
      });

      particles.forEach((particle, index) => {
        for (let i = index + 1; i < particles.length; i += 1) {
          const other = particles[i];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    const handleResize = () => setSize();
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-b-[48px] border-b border-white/10 bg-gradient-to-br from-[#1a1a2e] via-[#23395b] to-[#ff8c73] shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,199,119,0.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(126,199,255,0.35), transparent 35%), radial-gradient(circle at 5% 80%, rgba(255,255,255,0.25), transparent 30%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(130deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(310deg, rgba(255,255,255,0.08) 25%, transparent 25%)",
          backgroundSize: "120px 120px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center text-white">
        <p className="mb-4 text-sm uppercase tracking-[0.4em] text-white/70">Curated Journeys</p>
        <h1 className="font-display text-[2.75rem] font-semibold leading-tight md:text-[4.5rem]">
          {typedText}
          <span className={`ml-1 ${cursorVisible ? "opacity-100" : "opacity-0"}`}>
            |
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/85 md:text-2xl">
          Discover breathtaking destinations, share travel experiences, and
          connect with fellow explorers in our premium travel community.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onScrollToBlogs}
            className="rounded-full bg-white/95 px-10 py-3 text-lg font-semibold text-[#1a1a2e] shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
          >
            Explore Blogs
          </button>
          <button
            type="button"
            onClick={() => {
              onScrollToForums();
            }}
            className="rounded-full border-2 border-white/80 px-10 py-3 text-lg font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:text-[#1a1a2e]"
          >
            Join Discussions
          </button>
        </div>
        <button
          type="button"
          onClick={onScrollToBlogs}
          className="mt-12 flex flex-col items-center text-sm font-medium text-white/80"
        >
          <span>Scroll to stories</span>
          <ChevronDown className="mt-2 h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
