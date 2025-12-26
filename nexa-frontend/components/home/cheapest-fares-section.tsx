"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

import { API } from "@/app/api";

interface Fare {
  city: string;
  price: string;
  date: string;
  code: string;
  departureDate: string;
}

export function CheapestFaresSection() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [cheapestFares, setCheapestFares] = useState<Fare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFares = async () => {
      setLoading(true);
      setError(null);
      const source = CITIES.find((c) => c.city === selectedCity)?.code;
      const destinations = CITIES.filter((c) => c.city !== selectedCity)
        .map((c) => c.code)
        .join(",");

      if (!source) {
        setError("Invalid source city selected.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API.BASE_URL}/bookings/search/cheap-fares?source=${source}&destinations=${destinations}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch cheapest fares.");
        }
        const data = await response.json();
        console.log("API Response:", data);
        const formattedFares = data.map((fare: Record<string, unknown>) => {
          const destinationCode = fare.route__destination__code as string;
          const departureTime = fare.departure_time__date as string;
          const departureDateOnly = departureTime.split("T")[0];
          return {
            city: CITIES.find((c) => c.code === destinationCode)?.city as string,
            code: destinationCode,
            price: `₹${parseInt(fare.min_price as string).toLocaleString("en-IN")}`,
            date: new Date(departureTime).toLocaleDateString(
              "en-GB",
              {
                day: "numeric",
                month: "short",
              }
            ),
            departureDate: departureDateOnly,
          };
        });
        console.log("Formatted Fares:", formattedFares);
        setCheapestFares(formattedFares);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFares();
  }, [selectedCity]);

  const handleCardClick = (destination: Fare) => {
    const sourceCode = CITIES.find((c) => c.city === selectedCity)?.code;
    if (!sourceCode) {
      console.error("Source code not found");
      return;
    }
    
    const queryString = new URLSearchParams({
      source: sourceCode,
      destination: destination.code,
      departure_date: destination.departureDate,
      tripType: "oneWay",
    }).toString();

    console.log("Navigating to:", `/booking/flight?${queryString}`);
    router.push(`/booking/flight?${queryString}`);
  };
  
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl font-light text-gray-900 mb-2">
              Cheapest Fares From
            </h2>
            <p className="text-sm text-gray-500">
              Best prices for your next journey
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {CITIES.slice(0, 6).map((city) => (
              <button
                key={city.code}
                onClick={() => setSelectedCity(city.city)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCity === city.city
                    ? "bg-gray-900 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {city.city}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-center">Loading...</div>}
        {error && <div className="text-center text-red-500">{error}</div>}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {cheapestFares.map((destination, idx) => (
              <div
                key={idx}
                onClick={() => handleCardClick(destination)}
                className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url('${getCityImage(
                    destination.city
                  )}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                    <h3 className="text-2xl font-semibold mb-1">
                      {destination.city}
                    </h3>
                    <p className="text-sm text-gray-300 mb-5">
                      {CITIES.find((c) => c.city === destination.city)?.state}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        {destination.date}
                      </div>
                      <div className="bg-white/15 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/20">
                        <span className="text-lg font-semibold">
                          {destination.price}
                        </span>
                        <span className="text-xs text-gray-200 ml-1">
                          onwards
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
