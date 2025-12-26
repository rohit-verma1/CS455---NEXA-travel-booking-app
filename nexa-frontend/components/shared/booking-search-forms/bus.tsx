// components/shared/booking-search-forms/Bus.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bus, ArrowLeftRight, Calendar as CalendarIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";


interface Station {
  station_id?: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  points?: { name: string; code: string }[];
}

/* ---------- sample station data (replace with your API/DB) ---------- */
const BUS_STATIONS: Station[] = [
  {
    name: 'Delhi',
    code: 'DEL',
    city: 'Delhi',
    state: 'Delhi',
    points: [
      { name: 'Kashmere Gate ISBT', code: 'ISBTKG' },
      { name: 'Anand Vihar ISBT', code: 'ISBTAV' },
      { name: 'Sarai Kale Khan ISBT', code: 'ISBTSKK' },
      { name: 'Azadpur Terminal', code: 'AZDP' },
      { name: 'Dhaula Kuan', code: 'DKN' },
    ],
  },
  {
    name: 'Lucknow',
    code: 'LKO',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Alambagh Bus Station', code: 'ALMB' },
      { name: 'Charbagh', code: 'CHBG' },
      { name: 'Kaiserbagh', code: 'KSBG' },
      { name: 'Polytechnic', code: 'PLTC' },
      { name: 'Dubagga', code: 'DBGA' },
    ],
  },
  {
    name: 'Kanpur',
    code: 'KNU',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Jhakarkati Bus Station', code: 'JKKT' },
      { name: 'Rawatpur', code: 'RWTP' },
      { name: 'Naubasta', code: 'NBST' },
      { name: 'Barra', code: 'BRRA' },
      { name: 'Fazalganj', code: 'FZLG' },
    ],
  },
  {
    name: 'Mumbai',
    code: 'BOM',
    city: 'Mumbai',
    state: 'Maharashtra',
    points: [
      { name: 'Dadar TT', code: 'DDR' },
      { name: 'Andheri East', code: 'ANDR' },
      { name: 'Kurla Nehru Nagar', code: 'KRLN' },
      { name: 'Bandra (E)', code: 'BNDE' },
      { name: 'Borivali Depot', code: 'BORV' },
    ],
  },
  {
    name: 'Pune',
    code: 'PNQ',
    city: 'Pune',
    state: 'Maharashtra',
    points: [
      { name: 'Swargate Bus Stand', code: 'SWGT' },
      { name: 'Shivajinagar Bus Stand', code: 'SVJR' },
      { name: 'Pune Station', code: 'PNST' },
      { name: 'Nigdi', code: 'NGDI' },
      { name: 'Katraj', code: 'KTRJ' },
    ],
  },
  {
    name: 'Ahmedabad',
    code: 'AMD',
    city: 'Ahmedabad',
    state: 'Gujarat',
    points: [
      { name: 'Gita Mandir Bus Stand', code: 'GTMD' },
      { name: 'Nehru Nagar', code: 'NNRG' },
      { name: 'Kalupur', code: 'KLP' },
      { name: 'Iskon Cross Road', code: 'ISCN' },
      { name: 'Naroda', code: 'NRDA' },
    ],
  },
  {
    name: 'Indore',
    code: 'IDR',
    city: 'Indore',
    state: 'Madhya Pradesh',
    points: [
      { name: 'Sarwate Bus Stand', code: 'SRWT' },
      { name: 'Gangwal Bus Stand', code: 'GNGL' },
      { name: 'Vijay Nagar', code: 'VJNR' },
      { name: 'Rajendra Nagar', code: 'RJNR' },
      { name: 'Dewas Naka', code: 'DWNK' },
    ],
  },
  {
    name: 'Jaipur',
    code: 'JAI',
    city: 'Jaipur',
    state: 'Rajasthan',
    points: [
      { name: 'Sindhi Camp Bus Stand', code: 'SNDC' },
      { name: 'Durgapura', code: 'DRGP' },
      { name: 'Sodala', code: 'SDLA' },
      { name: 'Lal Kothi', code: 'LLKT' },
      { name: 'Gopalpura', code: 'GPLP' },
    ],
  },
  {
    name: 'Goa',
    code: 'GOX',
    city: 'Goa',
    state: 'Goa',
    points: [
      { name: 'Panjim KTC Bus Stand', code: 'PNJM' },
      { name: 'Margao KTC Bus Stand', code: 'MRGA' },
      { name: 'Mapusa KTC', code: 'MPSA' },
      { name: 'Vasco Bus Stand', code: 'VSCO' },
      { name: 'Ponda Bus Stand', code: 'PNDA' },
    ],
  },
  {
    name: 'Chennai',
    code: 'MAA',
    city: 'Chennai',
    state: 'Tamil Nadu',
    points: [
      { name: 'CMBT Koyambedu', code: 'CMBT' },
      { name: 'Broadway Bus Terminus', code: 'BWDY' },
      { name: 'T Nagar', code: 'TNGR' },
      { name: 'Saidapet', code: 'SDPT' },
      { name: 'Guindy', code: 'GNDY' },
    ],
  },
  {
    name: 'Bengaluru',
    code: 'BLR',
    city: 'Bengaluru',
    state: 'Karnataka',
    points: [
      { name: 'Kempegowda (Majestic)', code: 'KBS' },
      { name: 'Shivajinagar', code: 'SVN' },
      { name: 'K R Market', code: 'KRM' },
      { name: 'Yeshwanthpur TTMC', code: 'YPRB' },
      { name: 'Hebbal TTMC', code: 'HBL' },
    ],
  },
  {
    name: 'Hyderabad',
    code: 'HYD',
    city: 'Hyderabad',
    state: 'Telangana',
    points: [
      { name: 'MGBS (Imlibun)', code: 'MGBS' },
      { name: 'Jubilee Bus Station', code: 'JBS' },
      { name: 'Koti Bus Depot', code: 'KOTI' },
      { name: 'Dilsukhnagar', code: 'DSNR' },
      { name: 'Secunderabad', code: 'SCBD' },
    ],
  },
  {
    name: 'Kolkata',
    code: 'CCU',
    city: 'Kolkata',
    state: 'West Bengal',
    points: [
      { name: 'Esplanade', code: 'ESP' },
      { name: 'Howrah', code: 'HWHB' },
      { name: 'Karunamoyee', code: 'KMY' },
      { name: 'Garia', code: 'GAR6' },
      { name: 'Shyambazar', code: 'SYMZ' },
    ],
  },
  {
    name: 'Guwahati',
    code: 'GAU',
    city: 'Guwahati',
    state: 'Assam',
    points: [
      { name: 'Paltan Bazar', code: 'PLTN' },
      { name: 'Adabari', code: 'ADBR' },
      { name: 'Khanapara', code: 'KHNP' },
      { name: 'ISBT Guwahati', code: 'ISBTG' },
      { name: 'Jalukbari', code: 'JLBK' },
    ],
  },
  {
    name: 'Bhubaneswar',
    code: 'BBI',
    city: 'Bhubaneswar',
    state: 'Odisha',
    points: [
      { name: 'Baramunda ISBT', code: 'BRMD' },
      { name: 'Kalpana Square', code: 'KLPN' },
      { name: 'Master Canteen', code: 'MSTC' },
      { name: 'Vani Vihar', code: 'VNVR' },
      { name: 'Palasuni', code: 'PLSN' },
    ],
  },
  {
    name: 'Kochi',
    code: 'COK',
    city: 'Kochi',
    state: 'Kerala',
    points: [
      { name: 'Vyttila Mobility Hub', code: 'VYTH' },
      { name: 'Ernakulam KSRTC', code: 'ERNA' },
      { name: 'Kaloor', code: 'KLOR' },
      { name: 'Edappally', code: 'EDPL' },
      { name: 'Fort Kochi', code: 'FTKC' },
    ],
  },
  {
    name: 'Patna',
    code: 'PAT',
    city: 'Patna',
    state: 'Bihar',
    points: [
      { name: 'Mithapur ISBT', code: 'MTPR' },
      { name: 'Gandhi Maidan', code: 'GDMD' },
      { name: 'Meethapur', code: 'MTP' },
      { name: 'Danapur', code: 'DNPR' },
      { name: 'Bailey Road', code: 'BYLR' },
    ],
  },
  {
    name: 'Agra',
    code: 'AGR',
    city: 'Agra',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Idgah Bus Stand', code: 'IDGH' },
      { name: 'ISBT Agra', code: 'ISBTA' },
      { name: 'Bhagwan Talkies', code: 'BGTK' },
      { name: 'Kamla Nagar', code: 'KMLN' },
      { name: 'Water Works', code: 'WTWK' },
    ],
  },
  {
    name: 'Visakhapatnam',
    code: 'VTZ',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    points: [
      { name: 'Dwaraka Bus Complex', code: 'DWRC' },
      { name: 'Maddilapalem', code: 'MDLP' },
      { name: 'Gajuwaka', code: 'GJWK' },
      { name: 'NAD Junction', code: 'NADJ' },
      { name: 'RTC Complex', code: 'RTCC' },
    ],
  },
  {
    name: 'Chandigarh',
    code: 'IXC',
    city: 'Chandigarh',
    state: 'Chandigarh',
    points: [
      { name: 'Sector 17 ISBT', code: 'S17B' },
      { name: 'Sector 43 ISBT', code: 'S43B' },
      { name: 'PGI Bus Stop', code: 'PGIB' },
      { name: 'Sector 22 Market', code: 'S22B' },
      { name: 'Manimajra', code: 'MNMJ' },
    ],
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

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


/* ---------- PopoverPortal: portal + absolute positioning near targetRef ---------- */
function PopoverPortal({
  targetRef,
  open,
  children,
  preferBelow = true,
  offset = 8,
  className,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: React.ReactNode;
  preferBelow?: boolean;
  offset?: number;
  className?: string;
}) {
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = document.createElement("div");
    // mark portal so outside click handler can detect clicks inside popovers
    el.setAttribute("data-popover", "true");
    portalRef.current = el;
    document.body.appendChild(el);
    return () => {
      if (portalRef.current) document.body.removeChild(portalRef.current);
      portalRef.current = null;
    };
  }, []);

  const recompute = useCallback(() => {
    const port = portalRef.current;
    const target = targetRef.current;
    if (!port || !target) return;

    const rect = target.getBoundingClientRect();
    const docLeft = window.scrollX || window.pageXOffset;
    const docTop = window.scrollY || window.pageYOffset;

    const desiredWidth = Math.max(280, rect.width);
    let left = Math.round(rect.left + docLeft);
    const maxLeft = Math.round(document.documentElement.scrollWidth - desiredWidth - 12);
    left = Math.max(8, Math.min(left, maxLeft));

    const belowTop = Math.round(rect.bottom + docTop + offset);
    const aboveTop = Math.round(rect.top + docTop - offset);

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placeBelow = preferBelow;
    if (preferBelow) {
      if (spaceBelow < 140 && spaceAbove > spaceBelow) placeBelow = false;
    } else {
      if (spaceAbove < 140 && spaceBelow > spaceAbove) placeBelow = true;
    }

    const top = placeBelow ? belowTop : Math.round(rect.top + docTop - offset - 8);

    Object.assign(port.style, {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      minWidth: `${desiredWidth}px`,
      zIndex: "2147483647",
      pointerEvents: "auto",
    });

    setTick(t => t + 1);
  }, [targetRef, preferBelow, offset]);

  useEffect(() => {
    if (!open) return;
    recompute();
    const onScroll = () => recompute();
    const onResize = () => recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const obs = new MutationObserver(() => recompute());
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      obs.disconnect();
    };
  }, [open, recompute]);

  if (!portalRef.current || !open) return null;
  return createPortal(
    <div className={className ?? ""}>
      {children}
    </div>,
    portalRef.current
  );
}

/* ---------- StationDropdown component ---------- */
function StationDropdown({
  targetRef,
  targetRect,
  open,
  stations,
  query,
  onQuery,
  onSelect,
  oppositeSelected,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  targetRect: { top: number; left: number; width: number };
  open: boolean;
  stations: Station[];
  query: string;
  onQuery: (v: string) => void;
  onSelect: (s: Station) => void;
  oppositeSelected: Station | null;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.city.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.state ?? "").toLowerCase().includes(q)
    );
  }, [stations, query]);

  if (!open) return null;

  return createPortal(
    <div 
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto"
      style={{ 
        width: '400px',
        maxWidth: '95vw',
        left: `${Math.max(10, Math.min(typeof window !== 'undefined' ? window.innerWidth - 410 : 1000, targetRect.left))}px`, 
        top: `${targetRect.top + 20}px`,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
      }}
      data-popover="true"
    >
      {/* Dropdown pointer */}
      <div 
        className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2 left-6"
        style={{ zIndex: 10000 }}
      ></div>
      
      {/* Station list */}
      {filtered.length > 0 ? (
        filtered.map((station) => {
          const isSameAsOpposite = oppositeSelected && station.code === oppositeSelected.code;
          return (
            <div
              key={station.code}
              className={`p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                isSameAsOpposite 
                  ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                  : 'hover:bg-gray-50 cursor-pointer'
              }`}
              onClick={() => {
                if (!isSameAsOpposite) {
                  onSelect(station);
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-gray-700">{station.code}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{station.city}</div>
                  <div className="text-sm text-gray-500">{station.state}</div>
                </div>
                {isSameAsOpposite && (
                  <div className="text-xs text-red-500 font-medium">Already selected</div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-4 text-center text-gray-500">No stations found</div>
      )}
    </div>,
    document.body
  );
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
  useEffect(() => setMonth(startOfMonth(value)), [value]);

  const prev = () => setMonth(m => addMonths(m, -1));
  const next = () => setMonth(m => addMonths(m, 1));

  return (
    <PopoverPortal targetRef={targetRef} open={open} preferBelow offset={8}>
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
      </div>
    </PopoverPortal>
  );
}

/* ---------- Main Bbbus component (default export) ---------- */
export default function Bbbus() {
  const [from, setFrom] = useState(""); // selected station name
  const [to, setTo] = useState("");
  const [date, setDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [freeCancellation, setFreeCancellation] = useState(false);

  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);

  const fromRef = useRef<HTMLDivElement | null>(null);
  const toRef = useRef<HTMLDivElement | null>(null);
  const dateRef = useRef<HTMLDivElement | null>(null);

  const fromInputRef = useRef<HTMLInputElement | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);

  // controlled input values the user types
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");

  // Positioning state for dropdowns
  const [fromRect, setFromRect] = useState({ top: 0, left: 0, width: 0 });
  const [toRect, setToRect] = useState({ top: 0, left: 0, width: 0 });

  // Update position references when fields are mounted/updated or dropdown visibility changes
  useEffect(() => {
    const updatePositions = () => {
      if (fromRef.current) {
        const rect = fromRef.current.getBoundingClientRect();
        setFromRect({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
      if (toRef.current) {
        const rect = toRef.current.getBoundingClientRect();
        setToRect({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    updatePositions();
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    
    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [openFrom, openTo]);

  // Close popovers if click is outside inputs and popovers (portals are marked data-popover="true")
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const insideFrom = fromRef.current && target && fromRef.current.contains(target);
      const insideTo = toRef.current && target && toRef.current.contains(target);
      const insideDate = dateRef.current && target && dateRef.current.contains(target);
      const insidePortal = target && !!target.closest('[data-popover="true"]');

      // If click is inside target input or inside portal for that target, don't close that one.
      // Close each popover only if click is outside both the input and any portal.
      if (!insideFrom && !insidePortal) setOpenFrom(false);
      if (!insideTo && !insidePortal) setOpenTo(false);
      if (!insideDate && !insidePortal) setOpenCalendar(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ESC closes everything
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenFrom(false); setOpenTo(false); setOpenCalendar(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // When user types in the input, keep query in state and open dropdown.
  // If they clear the box entirely, clear the selected station as well.
  const handleFromInput = (v: string) => {
    setFromQuery(v);
    setOpenFrom(true);
    if (v.trim() === "") {
      setFrom("");
      setFromStation(null);
    }
  };
  const handleToInput = (v: string) => {
    setToQuery(v);
    setOpenTo(true);
    if (v.trim() === "") {
      setTo("");
      setToStation(null);
    }
  };

  // Get filtered stations for enter key handler
  const getFilteredFromStations = () => {
    const q = fromQuery.trim().toLowerCase();
    if (!q) return BUS_STATIONS;
    return BUS_STATIONS.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.city.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.state ?? "").toLowerCase().includes(q)
    );
  };

  const getFilteredToStations = () => {
    const q = toQuery.trim().toLowerCase();
    if (!q) return BUS_STATIONS;
    return BUS_STATIONS.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.city.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.state ?? "").toLowerCase().includes(q)
    );
  };

  const handleFromKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && openFrom) {
      e.preventDefault();
      const filtered = getFilteredFromStations();
      if (filtered.length > 0 && filtered[0].code !== toStation?.code) {
        handleSelectFrom(filtered[0]);
        // Move focus to the "to" field
        setTimeout(() => toInputRef.current?.focus(), 0);
      }
    }
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && openTo) {
      e.preventDefault();
      const filtered = getFilteredToStations();
      if (filtered.length > 0 && filtered[0].code !== fromStation?.code) {
        handleSelectTo(filtered[0]);
        // Move focus to the date field
        setTimeout(() => dateRef.current?.focus(), 0);
      }
    }
  };

  const handleSelectFrom = (s: Station) => {
    setFromStation(s);
    setFrom(s.name);
    setFromQuery(`${s.code} - ${s.name}`);
    setOpenFrom(false);
  };
  const handleSelectTo = (s: Station) => {
    setToStation(s);
    setTo(s.name);
    setToQuery(`${s.code} - ${s.name}`);
    setOpenTo(false);
  };

  const handleSwap = () => {
    const nextFrom = toStation;
    const nextTo = fromStation;
    setFromStation(nextFrom);
    setToStation(nextTo);

    setFrom(nextFrom ? nextFrom.name : "");
    setTo(nextTo ? nextTo.name : "");

    setFromQuery(nextFrom ? `${nextFrom.code} - ${nextFrom.name}` : "");
    setToQuery(nextTo ? `${nextTo.code} - ${nextTo.name}` : "");
  };

  // Format date as "Thu, 16th Oct'25"
  const formatDateNeatly = (d: Date) => {
    const dayOfWeek = d.toLocaleDateString(undefined, { weekday: "short" });
    const day = d.getDate();
    const monthIndex = d.getMonth();
    const year = d.getFullYear().toString().slice(-2);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[monthIndex];
    
    // Get ordinal suffix
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    return `${dayOfWeek}, ${day}${suffix} ${monthStr}'${year}`;
  };

  const setToday = () => setDate(new Date());
  const setTomorrow = () => { const d = new Date(); d.setDate(d.getDate()+1); setDate(d); };

  const router = useRouter();

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Use station CODE for API
    const source = fromStation?.code || "";
    const destination = toStation?.code || "";
    
    if (!source || !destination) {
      // Focus on the empty field
      if (!source) {
        fromInputRef.current?.focus();
      } else if (!destination) {
        toInputRef.current?.focus();
      }
      return;
    }

    const dateStr = toYYYYMMDD(date);

    const qs = new URLSearchParams({
      source,
      destination,
      date: dateStr,
    });

    router.push(`/booking/bus?${qs.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white shadow-lg p-1 md:p-2 py-8 md:py-2">
      <div className="relative rounded-2xl overflow-visible">
        <div className="flex items-stretch h-24 md:h-24">
          {/* From + swap + To */}
          <div className="flex-none w-179 flex items-center px-3 py-4 md:py-6 bg-gray-50 border border-gray-200 rounded-l-2xl">
            <div ref={fromRef} className="flex items-center gap-2 flex-1 relative">
              <div className="flex items-center justify-center w-9 h-9 rounded-md">
                <Bus className="w-4 h-4 text-gray-700" />
              </div>

              <input
                ref={fromInputRef}
                aria-label="From Station"
                value={fromQuery}
                onChange={(e) => handleFromInput(e.target.value)}
                onKeyDown={handleFromKeyDown}
                onFocus={() => { setOpenFrom(true); setFromQuery(from); }}
                placeholder="From Station"
                className="w-full bg-transparent placeholder-gray-400 text-gray-800 text-base focus:outline-none"
                autoComplete="off"
              />

              {from && (
                <button
                  type="button"
                  onClick={() => {
                    setFrom("");
                    setFromQuery("");
                    setFromStation(null);
                    setOpenFrom(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition"
                  aria-label="Clear From Station"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              {/* Divider behind swap button */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-px bg-gray-200 z-0" />
              <button type="button" onClick={handleSwap} aria-label="Swap" className="relative z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm border border-gray-200">
                <ArrowLeftRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div ref={toRef} className="flex items-center gap-2 flex-1 ml-2 relative">
              <div className="flex items-center justify-center w-9 h-9 rounded-md">
                <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
              </div>

              <input
                ref={toInputRef}
                aria-label="To Station"
                value={toQuery}
                onChange={(e) => handleToInput(e.target.value)}
                onKeyDown={handleToKeyDown}
                onFocus={() => { setOpenTo(true); setToQuery(to); }}
                placeholder="To Station"
                className="w-full bg-transparent placeholder-gray-400 text-gray-800 text-base focus:outline-none"
                autoComplete="off"
              />

              {to && (
                <button
                  type="button"
                  onClick={() => {
                    setTo("");
                    setToQuery("");
                    setToStation(null);
                    setOpenTo(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition"
                  aria-label="Clear To Station"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Date + Today/Tomorrow */}
          <div className="flex-none w-93 flex items-center gap-2 px-2 py-2 md:py-4 bg-gray-50 border-t border-b border-gray-200 relative">
            <div ref={dateRef} className="flex items-center gap-2 cursor-pointer select-none flex-1">
              <CalendarIcon className="w-4 h-4 text-gray-600" />
              <div
                onClick={() => setOpenCalendar(s => !s)}
                className="text-md text-gray-800 tracking-tight"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenCalendar(s => !s); }}
              >
                {formatDateNeatly(date)}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-1">
              <button type="button" onClick={setToday} className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50">Today</button>
              <button type="button" onClick={setTomorrow} className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50">Tomorrow</button>
            </div>

            <CalendarPopover targetRef={dateRef} open={openCalendar} value={date} onChange={(d) => { setDate(d); setOpenCalendar(false); }} />
          </div>

          {/* Search button */}
          <div className="flex-1 flex items-center bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-xl">
            <button type="submit" className="h-full w-full px-8 md:px-12 text-white text-xl md:text-2xl font-medium rounded-r-xl focus:outline-none transition-colors hover:from-blue-600 hover:to-indigo-700">Search</button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <label 
            className="flex items-start gap-3 cursor-pointer group"
            onClick={() => setFreeCancellation(!freeCancellation)}
          >
            <div 
              className={`w-5 h-5 mt-0.5 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                freeCancellation 
                  ? 'bg-green-500 border-green-500' 
                  : 'bg-white border-gray-300 group-hover:border-green-400'
              }`}
            >
              <svg 
                className={`w-3 h-3 text-white transition-opacity ${
                  freeCancellation ? 'opacity-100' : 'opacity-0'
                }`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-green-700 group-hover:text-green-800 transition-colors">Always opt for Free Cancellation</div>
              <div className="flex flex-wrap text-xs text-gray-500 mt-1 gap-x-2">
                <span className="flex items-center">₹0 cancellation fee</span>
                <span>•</span>
                <span>Instant refunds, no questions asked</span>
                <span>•</span>
                <span>Priority customer service</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Station Dropdowns (positioned outside the form) */}
      <StationDropdown
        targetRef={fromRef}
        targetRect={fromRect}
        open={openFrom}
        stations={BUS_STATIONS}
        query={fromQuery}
        onQuery={v => handleFromInput(v)}
        onSelect={handleSelectFrom}
        oppositeSelected={toStation}
      />

      <StationDropdown
        targetRef={toRef}
        targetRect={toRect}
        open={openTo}
        stations={BUS_STATIONS}
        query={toQuery}
        onQuery={v => handleToInput(v)}
        onSelect={handleSelectTo}
        oppositeSelected={fromStation}
      />
    </form>
  );
}