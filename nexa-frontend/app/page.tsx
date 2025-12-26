"use client";

import { useState } from "react";
import { Navbar } from "@/components/shared/navbar";
import { HeroSection } from "@/components/shared/hero-section";
import BookingSearchForm from "@/components/shared/booking-search-forms";
import { Footer } from "@/components/home/footer";
import OrionAgent from "@/components/shared/orion";
import { CheapestFaresSection } from "@/components/home/cheapest-fares-section";
import { PopularRoutesSection } from "@/components/home/popular-routes-section";
import { WhyNexaSection } from "@/components/home/why-nexa-section";
import { HowNexaWorksSection } from "@/components/home/how-nexa-works-section";
import { TravelComparisonSection } from "@/components/home/travel-comparison-section";
import { FAQSection } from "@/components/home/faq-section";

type TravelOption = "Flights" | "Trains" | "Buses";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TravelOption>("Flights");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main>
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 via-blue-50/20 bg-white pointer-events-none" />
          <div className="relative">
            <HeroSection activeTab={activeTab} onChange={setActiveTab} />
            <div className="max-w-7xl mx-auto -mt-8 relative z-10">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)' }}>
                <BookingSearchForm activeTab={activeTab} />
              </div>
            </div>
          </div>
        </section>

        <CheapestFaresSection />
        <PopularRoutesSection activeTab={activeTab} />
        <WhyNexaSection />
        <HowNexaWorksSection />
        <TravelComparisonSection />
        <FAQSection />
      </main>
      <Footer />
      <OrionAgent />
    </div>
  );
}