"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Shield, Sparkles, Globe2, Zap, Award, TrendingUp, Play } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { AuthSidebar } from "@/components/shared/auth-panel";

const Fallback: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = "", children }) => (
  <div className={`rounded-3xl border border-white/10 bg-white/5 ${className}`}>{children}</div>
);
const SpotlightCard = Fallback;
const TiltedCard = Fallback;
const MagicBento: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => (
  <div className={`grid grid-cols-2 md:grid-cols-3 gap-6 ${className}`}>{children}</div>
);
const Hyperspeed: React.FC<{ className?: string; density?: number }> = ({ className = "", density = 0.8 }) => (
  <div className={`absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent)] ${className}`} aria-hidden>
    <div className="absolute inset-0 animate-pulse opacity-30" style={{ background: `repeating-linear-gradient(90deg, rgba(59,130,246,.2), rgba(59,130,246,.2) 1px, transparent 1px, transparent ${Math.max(8, 24 * (1-density))}px)` }} />
  </div>
);
const Orb: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`absolute rounded-full blur-3xl opacity-30 ${className}`} aria-hidden />
);
const ShinyText: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => (
  <span className={`bg-[linear-gradient(90deg,theme(colors.cyan.200),theme(colors.blue.300),theme(colors.violet.300))] bg-clip-text text-transparent ${className}`}>{children}</span>
);
const FluidGlass: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = "", children }) => (
  <div className={`relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl ${className}`}>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
    {children}
  </div>
);

/**
 * Utilities
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener?.("change", onChange as EventListener);
    return () => m.removeEventListener?.("change", onChange as EventListener);
  }, []);
  return reduced;
}

function useSectionInView(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "-20% 0px -20% 0px", threshold: 0.15 }
    );
    io.observe(ref.current as Element);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

/**
 * Main Component
 */
export default function NexaLandingElite() {
  const reducedMotion = usePrefersReducedMotion();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Auth sidebar state
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarInitialView, setAuthSidebarInitialView] = useState<"role" | "consumer" | "provider" | "admin" | "verify">("role");

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove as EventListener);
    return () => window.removeEventListener('mousemove', handleMouseMove as EventListener);
  }, []);

  // Parallax transforms for hero
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  // Sticky progress bar
  const [progressRef] = useSectionInView();

  // Logo – pass your real path here
  const NEXA_LOGO = "/images/nexa_2.png"; // ensure this exists in public/

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Subtle animated background */}
      <div className="fixed inset-0 -z-10">
        <Orb className="w-[42rem] h-[42rem] top-[-10%] left-[-10%] bg-cyan-500/20" />
        <Orb className="w-[36rem] h-[36rem] bottom-[-10%] right-[-10%] bg-violet-500/20" />
        <Hyperspeed className="" density={0.7} />
      </div>
      {/* Sophisticated animated background with stars */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Animated star field */}
        <div className="absolute inset-0">
          {Array.from({ length: 200 }).map((_, i) => {
            const size = Math.random() * 2 + 0.5;
            const animationDuration = Math.random() * 3 + 2;
            const animationDelay = Math.random() * 3;
            
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.8)`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: animationDuration,
                  repeat: Infinity,
                  delay: animationDelay,
                  ease: "easeInOut"
                }}
              />
            );
          })}
        </div>

        {/* Mouse-reactive gradient spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 800px at ${mousePos.x}px ${mousePos.y}px, rgba(96, 165, 250, 0.15), transparent 70%)`,
          }}
        />

        {/* Layered gradient meshes */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-violet-950/30" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-950/20 via-transparent to-purple-950/20" />
        
        {/* Large floating gradient orbs with animation */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] rounded-full blur-[130px] opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)'
          }}
          animate={{
            x: [0, 60, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Radial vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
        
        {/* Subtle noise texture overlay for depth */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      {/* Sticky top progress + auth teaser slot */}
      <div ref={progressRef} className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <div className="flex items-center gap-3">
            {/* <img src={NEXA_LOGO} alt="NEXA" className="h-6 w-auto" /> */}
            <span className="hidden sm:inline text-sm text-slate-300/80">Next Generation of Travel Booking</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Slot for your existing auth sidebar trigger */}
            <button 
              id="open-auth" 
              onClick={() => setAuthSidebarOpen(true)}
              className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            >
              Sign in
            </button>
          </div>
        </div>
        {/* progress bar */}
        <motion.div style={{ scaleX: useTransform(scrollYProgress, [0, 1], [0, 1]) }} className="origin-left h-[2px] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500" />
      </div>

      {/* HERO */}
      <section ref={heroRef} className="relative flex min-h-[120vh] items-center justify-center px-4">
        <div className="relative mx-auto max-w-7xl text-center">
          {/* morphing sequence */}
          <div className="relative h-[420px] md:h-[520px]">
            
            {/* Phase A: Full phrase in 2 lines with elegant blur-in */}
            <motion.div
              initial={{ opacity: 0, filter: "blur(30px)", scale: 0.95 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                filter: ["blur(30px)", "blur(0px)", "blur(0px)", "blur(15px)"],
                scale: [0.95, 1, 1, 0.98]
              }}
              transition={{ 
                duration: 4.5,
                times: [0, 0.25, 0.6, 1],
                ease: [0.22, 1, 0.36, 1]
              }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl lg:text-8xl font-light tracking-wide leading-tight">
                <motion.span 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="block bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent"
                >
                  Next Generation
                </motion.span>
                <motion.span 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="block mt-2 md:mt-4 bg-gradient-to-r from-blue-300 via-violet-300 to-purple-300 bg-clip-text text-transparent"
                >
                  of Travel Booking
                </motion.span>
              </h1>
            </motion.div>

            {/* Phase B: Premium dissolve and particle transformation */}
            {!reducedMotion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0, 1, 1, 0],
                }}
                transition={{ 
                  duration: 5.5,
                  times: [0, 0.45, 0.5, 0.75, 1],
                  ease: "easeInOut"
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative">
                  {/* Dissolving particles from the phrase */}
                  {Array.from({ length: 40 }).map((_, i) => {
                    const angle = (i / 40) * Math.PI * 2;
                    const distance = 100 + Math.random() * 150;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    
                    return (
                      <motion.div
                        key={i}
                        initial={{ 
                          x: 0, 
                          y: 0, 
                          opacity: 0,
                          scale: 0
                        }}
                        animate={{ 
                          x: [0, x * 0.3, x, 0],
                          y: [0, y * 0.3, y, 0],
                          opacity: [0, 0.8, 0.4, 0],
                          scale: [0, 1, 0.5, 0]
                        }}
                        transition={{ 
                          delay: 2.2 + (i * 0.02),
                          duration: 2,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{
                          boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                        }}
                      />
                    );
                  })}
                  
                  {/* NEXA letters flowing in elegantly */}
                  <div className="font-['Playfair_Display'] text-7xl md:text-9xl lg:text-[11rem] font-bold tracking-tight">
                    {['N', 'E', 'X', 'A'].map((char, i) => (
                      <motion.span
                        key={char}
                        initial={{ 
                          opacity: 0,
                          y: 80,
                          scale: 0.3,
                          filter: "blur(20px)"
                        }}
                        animate={{ 
                          opacity: [0, 0, 1, 1],
                          y: [80, 60, 0, 0],
                          scale: [0.3, 0.6, 1.1, 1],
                          filter: ["blur(20px)", "blur(10px)", "blur(0px)", "blur(0px)"]
                        }}
                        transition={{ 
                          delay: 2.8 + (i * 0.15),
                          duration: 1.5,
                          times: [0, 0.3, 0.8, 1],
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        className="inline-block bg-gradient-to-br from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent"
                        style={{
                          textShadow: '0 0 40px rgba(59, 130, 246, 0.5)'
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  {/* Converging light rays */}
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={`ray-${i}`}
                      initial={{ 
                        scaleX: 0,
                        opacity: 0
                      }}
                      animate={{ 
                        scaleX: [0, 1, 0],
                        opacity: [0, 0.4, 0]
                      }}
                      transition={{ 
                        delay: 2.5 + (i * 0.1),
                        duration: 1.5,
                        ease: "easeOut"
                      }}
                      className="absolute left-1/2 top-1/2 h-[2px] w-64 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                        transformOrigin: 'center'
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase C: Final NEXA with parallax and glow */}
            <motion.div
              style={{ y: titleY }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 1] }}
              transition={{ 
                duration: 5.5,
                times: [0, 0.65, 0.8, 1],
                ease: "easeOut"
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, filter: "blur(10px)" }}
                animate={{ scale: 1, filter: "blur(0px)" }}
                transition={{ 
                  delay: 4.5, 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1] 
                }}
                className="relative"
              >
                {/* Multi-layer glow */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0.5] }}
                  transition={{ 
                    delay: 4.5,
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                  className="absolute -inset-20 md:-inset-24 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/30 to-violet-500/20 blur-3xl" 
                />
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0.6] }}
                  transition={{ 
                    delay: 4.7,
                    duration: 2.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                  className="absolute -inset-12 md:-inset-16 rounded-full bg-gradient-to-r from-blue-500/30 via-violet-500/40 to-cyan-500/30 blur-2xl" 
                />
                
                <h1 className="relative font-['Playfair_Display'] text-[18vw] md:text-[12rem] lg:text-[15rem] font-bold tracking-tight leading-none">
                  <span className="bg-gradient-to-br from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent drop-shadow-2xl">
                    NEXA
                  </span>
                </h1>
              </motion.div>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 0, 0, 1], y: [20, 20, 20, 0] }}
            transition={{ 
              duration: 5.5,
              times: [0, 0.75, 0.88, 1],
              delay: 0.3
            }}
            className="mt-10 text-xl md:text-2xl lg:text-3xl text-slate-300 font-light tracking-wide"
          >
            Where journeys transcend into experiences
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 0, 0, 1], y: [20, 20, 20, 0] }}
            transition={{ 
              duration: 5.5,
              times: [0, 0.78, 0.9, 1],
              delay: 0.5
            }}
            onClick={() => setAuthSidebarOpen(true)}
            className="group relative mx-auto mt-12 inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-10 py-4 text-lg font-medium tracking-wide shadow-[0_0_50px_rgba(59,130,246,0.5)] transition-all duration-500 hover:scale-110 hover:shadow-[0_0_70px_rgba(59,130,246,0.7)]"
          >
            <span className="relative z-10">Begin Your Journey</span>
            <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-500 group-hover:translate-x-2" />
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-gradient-to-r from-violet-600 to-cyan-500" />
          </motion.button>

          {/* Scroll indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 0.7] }}
            transition={{ 
              duration: 5.5,
              times: [0, 0.82, 0.94, 1]
            }}
            className="mt-20 flex justify-center"
          >
            <ChevronDown className="h-10 w-10 animate-bounce text-slate-400" />
          </motion.div>
        </div>
      </section>

      {/* FEATURE MOSAIC – spotlight cards (React Bits) */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-[\'Playfair_Display\'] text-4xl md:text-6xl font-light">
            <ShinyText>Redefining Excellence</ShinyText>
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Sparkles, title: "AI Orchestration", desc: "Neural co‑pilots craft bespoke itineraries in seconds.", grad: "from-cyan-400 via-blue-500 to-blue-600" },
              { icon: Globe2, title: "Infinite Horizons", desc: "Unrivaled inventory from hidden archipelagos to megacities.", grad: "from-blue-400 via-violet-500 to-purple-600" },
              { icon: Shield, title: "Fortress Security", desc: "End‑to‑end encryption and anomaly detection by default.", grad: "from-indigo-400 via-blue-500 to-cyan-600" },
              { icon: Zap, title: "Instant Gratification", desc: "Milliseconds from search to booked.", grad: "from-amber-400 via-orange-500 to-rose-500" },
              { icon: Award, title: "Curated Perfection", desc: "Hand‑picked stays and experiences with white‑glove QA.", grad: "from-emerald-400 via-teal-500 to-cyan-600" },
              { icon: TrendingUp, title: "Ultimate Value", desc: "Dynamic deals with transparent pricing intelligence.", grad: "from-rose-400 via-pink-500 to-fuchsia-600" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <SpotlightCard className="relative h-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
                  <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${f.grad}`}>
                    <f.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-[\'Playfair_Display\'] text-2xl">{f.title}</h3>
                  <p className="mt-2 text-slate-400">{f.desc}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ORCHESTRATED PERFECTION – glass section + orb */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <FluidGlass className="p-10 md:p-16">
            <div className="absolute inset-0">
              <Orb className="left-1/2 top-0 h-80 w-80 -translate-x-1/2 bg-cyan-400/20" />
            </div>
            <div className="relative grid items-center gap-16 md:grid-cols-2">
              <div>
                <h2 className="font-[\'Playfair_Display\'] text-4xl md:text-6xl leading-tight">
                  <ShinyText>Orchestrated Perfection</ShinyText>
                  <br />
                  <span className="text-slate-300">Beyond Convention</span>
                </h2>
                <p className="mt-6 text-slate-300">
                  Technology meets artistry: every interaction intuitive, every recommendation precise, every detail delightful.
                </p>
                <ul className="mt-8 space-y-3 text-slate-200">
                  {[
                    "Bespoke itineraries crafted in moments",
                    "Real‑time pricing optimization",
                    "White‑glove concierge service",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative h-[420px]">
                <TiltedCard className="relative h-full w-full rounded-[2rem] border border-white/10 bg-white/5 p-8">
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="relative h-64 w-64">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/30 to-violet-500/30 blur-2xl" />
                      <div className="absolute inset-6 rounded-full bg-gradient-to-r from-violet-500/30 to-blue-500/30 blur-xl" />
                      <div className="absolute inset-12 grid place-items-center rounded-full bg-gradient-to-br from-blue-500/40 via-cyan-500/40 to-violet-500/40">
                        <Globe2 className="h-24 w-24 text-cyan-200" />
                      </div>
                    </div>
                  </div>
                </TiltedCard>
              </div>
            </div>
          </FluidGlass>
        </div>
      </section>

      {/* SHOWCASE – Magic Bento grid using React Bits */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-[\'Playfair_Display\'] text-4xl md:text-6xl font-light">
            <ShinyText>See It In Motion</ShinyText>
          </h2>
          <MagicBento className="mt-12">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <Hyperspeed className="opacity-40" density={0.5 + i * 0.08} />
                <div className="absolute inset-0 grid place-items-center">
                  <button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur transition hover:bg-white/20">
                    <Play className="h-4 w-4" /> Preview {i + 1}
                  </button>
                </div>
              </motion.div>
            ))}
          </MagicBento>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-4 py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-[\'Playfair_Display\'] text-5xl md:text-7xl">
            <ShinyText>Your Odyssey Begins</ShinyText>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Step into tomorrow's travel experience today.
          </p>
          <button
            onClick={() => setAuthSidebarOpen(true)}
            className="group relative mx-auto mt-10 inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-10 py-4 text-lg shadow-[0_0_60px_rgba(59,130,246,0.6)]"
          >
            Discover NEXA
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
            <span className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-gradient-to-r from-violet-600 to-cyan-500" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} NEXA • Crafted for elevated journeys
      </footer>

      {/* Render AuthSidebar in a top-level fixed container so it appears above the navbar and any backdrop-blur stacking contexts. */}
      {authSidebarOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <AuthSidebar
            isOpen={authSidebarOpen}
            onClose={() => {
              setAuthSidebarOpen(false);
              setAuthSidebarInitialView("role");
            }}
            initialView={authSidebarInitialView}
          />
        </div>
      )}
    </div>
  );
}
