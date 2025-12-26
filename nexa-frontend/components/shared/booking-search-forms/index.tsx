"use client";

import FlightSearchForm from "./flight";
import TrainSearchForm from "./train";
import BusSearchForm from "./bus";

type TravelOption = "Flights" | "Trains" | "Buses";

interface BookingSearchFormProps {
  activeTab: TravelOption;
}

export default function BookingSearchForm({ activeTab }: BookingSearchFormProps) {
  // Optional: shared header that shows the current tab
  return (
    <div>
        {activeTab === "Flights" && <FlightSearchForm />}
        {activeTab === "Trains" && <TrainSearchForm />}
        {activeTab === "Buses" && <BusSearchForm />}
    </div>
  );
}