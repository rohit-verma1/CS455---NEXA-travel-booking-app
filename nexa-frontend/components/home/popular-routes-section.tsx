"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type TravelOption = "Flights" | "Trains" | "Buses";

interface PopularRoutesSectionProps {
  activeTab: TravelOption;
}

const CITIES = [
  { city: "Delhi", code: "DEL", state: "Delhi" },
  { city: "Mumbai", code: "BOM", state: "Maharashtra" },
  { city: "Bengaluru", code: "BLR", state: "Karnataka" },
  { city: "Hyderabad", code: "HYD", state: "Telangana" },
  { city: "Chennai", code: "MAA", state: "Tamil Nadu" },
  { city: "Kolkata", code: "CCU", state: "West Bengal" },
  { city: "Pune", code: "PNQ", state: "Maharashtra" },
  { city: "Ahmedabad", code: "AMD", state: "Gujarat" },
  { city: "Jaipur", code: "JAI", state: "Rajasthan" },
  { city: "Goa", code: "GOX", state: "Goa" },
];

const getCityImage = (city: string) => {
  const images: Record<string, string> = {
    Delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80",
    Mumbai: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&q=80",
    Bengaluru: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80",
    Hyderabad: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80",
    Chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80",
    Kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&q=80",
    Pune: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=800&q=80",
    Ahmedabad: "https://images.unsplash.com/photo-1609766975192-e295ba0087f7?w=800&q=80",
    Jaipur: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80",
    Goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80",
  };
  return images[city] || images.Delhi;
};

const routes = [
  {
    from: "Mumbai",
    destinations: ["Delhi", "Goa", "Bengaluru", "Pune"],
  },
  {
    from: "Delhi",
    destinations: ["Mumbai", "Bengaluru", "Jaipur", "Goa"],
  },
  {
    from: "Bengaluru",
    destinations: ["Mumbai", "Delhi", "Chennai", "Hyderabad"],
  },
  {
    from: "Chennai",
    destinations: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad"],
  },
  {
    from: "Hyderabad",
    destinations: ["Mumbai", "Delhi", "Bengaluru", "Chennai"],
  },
  {
    from: "Kolkata",
    destinations: ["Mumbai", "Delhi", "Bengaluru", "Chennai"],
  },
];

/* ---------- date helpers ---------- */
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { const nd = new Date(d); nd.setMonth(nd.getMonth() + n); return nd; }
function getDaysGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear(), m = month.getMonth();
  const first = new Date(year, m, 1), last = new Date(year, m + 1, 0);
  const days: (Date | null)[] = [];
  const pad = first.getDay();
  for (let i = 0; i < pad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, m, d));
  while (days.length < 42) days.push(null);
  return days;
}

/* ---------- CalendarPopover component ---------- */
function CalendarPopover({
  targetRef,
  open,
  value,
  onChange,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const [month, setMonth] = useState(startOfMonth(value));
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMonth(startOfMonth(value)), [value]);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-popover", "true");
    portalRef.current = el;
    document.body.appendChild(el);
    return () => {
      if (portalRef.current) document.body.removeChild(portalRef.current);
      portalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open || !portalRef.current || !targetRef.current) return;

    const updatePosition = () => {
      const port = portalRef.current;
      const target = targetRef.current;
      if (!port || !target) return;

      const rect = target.getBoundingClientRect();
      const docLeft = window.scrollX || window.pageXOffset;
      const docTop = window.scrollY || window.pageYOffset;

      const desiredWidth = 360;
      let left = Math.round(rect.left + docLeft);
      const maxLeft = Math.round(document.documentElement.scrollWidth - desiredWidth - 12);
      left = Math.max(8, Math.min(left, maxLeft));

      const top = Math.round(rect.bottom + docTop + 8);

      Object.assign(port.style, {
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        minWidth: `${desiredWidth}px`,
        zIndex: "2147483647",
        pointerEvents: "auto",
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, targetRef]);

  const prev = () => setMonth(m => addMonths(m, -1));
  const next = () => setMonth(m => addMonths(m, 1));

  if (!portalRef.current || !open) return null;

  return createPortal(
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4" style={{ width: 360 }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-2 rounded hover:bg-gray-100" aria-label="Previous month">◀</button>
        <div className="font-medium text-center">{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <button onClick={next} className="p-2 rounded hover:bg-gray-100" aria-label="Next month">▶</button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-500 mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="h-8 flex items-center justify-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {getDaysGrid(month).map((day, idx) => {
          const disabled = !day || day < today;
          const selected = day && isSameDay(day, value);
          return (
            <button
              key={idx}
              onClick={() => day && !disabled && onChange(day)}
              disabled={disabled}
              className={`h-10 flex items-center justify-center rounded-md transition ${!day ? "invisible" : disabled ? "text-gray-300 cursor-not-allowed" : selected ? "bg-orange-500 text-white" : "hover:bg-gray-100"}`}
            >
              {day ? day.getDate() : ""}
            </button>
          );
        })}
      </div>
    </div>,
    portalRef.current
  );
}

export function PopularRoutesSection({ activeTab }: PopularRoutesSectionProps) {
  const router = useRouter();
  
  // Default date: tomorrow
  const [date, setDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  });
  
  const [openCalendar, setOpenCalendar] = useState(false);
  const dateRef = useRef<HTMLDivElement | null>(null);

  // Format date as "16th Oct'25"
  const formatDateNeatly = (d: Date) => {
    const day = d.getDate();
    const monthIndex = d.getMonth();
    const year = d.getFullYear().toString().slice(-2);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[monthIndex];
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    return `${day}${suffix} ${monthStr}'${year}`;
  };

  const formatYmd = (d: Date) => {
    const dd = new Date(d);
    dd.setHours(0,0,0,0);
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    const day = String(dd.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Close calendar on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const insideDate = dateRef.current && target && dateRef.current.contains(target);
      const insidePortal = target && !!target.closest('[data-popover="true"]');
      if (!insideDate && !insidePortal) setOpenCalendar(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Get mode string
  const modeString = activeTab === "Flights" ? "flight" : activeTab === "Trains" ? "train" : "bus";

  const handleDestinationClick = (sourceCity: string, destCity: string) => {
    const sourceCode = CITIES.find(c => c.city === sourceCity)?.code || "";
    const destCode = CITIES.find(c => c.city === destCity)?.code || "";
    
    if (!sourceCode || !destCode) return;

    const ymd = formatYmd(date);
    const params = new URLSearchParams({
      source: sourceCode,
      destination: destCode,
      date: ymd,
    });

    // For flights, add tripType=oneWay
    if (activeTab === "Flights") {
      params.set("tripType", "oneWay");
    }

    router.push(`/booking/${modeString}?${params.toString()}`);
  };

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light text-gray-900 mb-2">
              Popular {activeTab} Routes
            </h2>
            <p className="text-sm text-gray-500">
              Most traveled connections across India
            </p>
          </div>

          {/* Date Picker */}
          <div 
            ref={dateRef}
            className="flex items-center gap-3 bg-white border border-gray-300 px-4 py-3 cursor-pointer hover:border-gray-400 transition-all"
            style={{
              borderRadius: "50px",
              minWidth: "200px",
            }}
            onClick={() => setOpenCalendar(s => !s)}
          >
            <CalendarIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div className="text-base text-gray-800 font-medium">
              {formatDateNeatly(date)}
            </div>
          </div>

          <CalendarPopover 
            targetRef={dateRef} 
            open={openCalendar} 
            value={date} 
            onChange={(d) => { setDate(d); setOpenCalendar(false); }} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route, idx) => (
            <div
              key={idx}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={getCityImage(route.from)}
                  alt={route.from}
                  width={800}
                  height={600}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <h3 className="absolute bottom-4 left-5 text-white text-2xl font-semibold">
                  {route.from} {activeTab}
                </h3>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
                  To:
                </p>
                <div className="flex flex-wrap gap-2">
                  {route.destinations.map((dest, didx) => (
                    <span key={didx}>
                      <span
                        onClick={() => handleDestinationClick(route.from, dest)}
                        className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors hover:underline"
                      >
                        {dest}
                      </span>
                      {didx < route.destinations.length - 1 && (
                        <span className="text-gray-300 mx-1.5">•</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
