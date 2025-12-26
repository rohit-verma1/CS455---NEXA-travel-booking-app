"use client";

import { Plane, Train, Bus } from "lucide-react";

type TravelOption = "Flights" | "Trains" | "Buses";

interface HeroSectionProps {
  activeTab: TravelOption;
  onChange: (tab: TravelOption) => void;
}

export function HeroSection({ activeTab, onChange }: HeroSectionProps) {
  const travelOptions: TravelOption[] = ["Flights", "Trains", "Buses"];

  const getTabStyle = (tab: TravelOption) => {
    return activeTab === tab
      ? "text-indigo-500 border-b-2 border-indigo-500 font-medium"
      : "text-gray-600 hover:text-indigo-500";
  };

  const tabIcons: Record<TravelOption, React.ReactNode> = {
    Flights: <Plane className="h-5 w-5" />,
    Trains: <Train className="h-5 w-5" />,
    Buses: <Bus className="h-5 w-5" />
  };


    // Calculate the position for the sliding border
  const getActiveTabIndex = () => travelOptions.indexOf(activeTab);
  const activeIndex = getActiveTabIndex();
  const translateX = `${activeIndex * 100}%`;

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-8">
          Book Travel, Experience <span className="text-indigo-500">Freedom</span>
        </h1>

        <div className="bg-white rounded-xl shadow-xl max-w-7xl mx-auto overflow-hidden" style={{ boxShadow: '0 15px 40px rgba(0, 0, 0, 0.12)' }}>
          <div className="flex border-b relative">
            {travelOptions.map((option) => (
              <button
                key={option}
                aria-pressed={activeTab === option}
                className={`flex items-center space-x-2 flex-1 py-4 px-2 text-center transition-colors duration-300  ${getTabStyle(option)}`}
                onClick={() => onChange(option)}
              >
                <div className="flex justify-center items-center w-full">
                  <span className="mr-2">{tabIcons[option]}</span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
            {/* Sliding border indicator */}
            <div 
              className="absolute bottom-0 h-0.5 bg-indigo-500 transition-all duration-300 ease-in-out"
              style={{
                width: `${100 / travelOptions.length}%`,
                transform: `translateX(${translateX})`
              }}
            />
          </div>

          {/* If you want to render a summary/CTA specific to the current tab in the hero itself,
              add it here, but the main form is handled in BookingSearchForm (in page). */}
        </div>
      </div>
    </section>
  );
}