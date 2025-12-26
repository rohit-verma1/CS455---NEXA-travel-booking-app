"use client";

import React, { useState } from 'react';
import { Check, ChevronRight, Plane, Armchair } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';

// Types
interface Traveller {
  id: number;
  name: string;
  seat: string | null;
}

interface Meal {
  id: number;
  name: string;
  price: number;
  image: string;
  veg: boolean;
}

type SeatMap = Record<number, string>;
type MealMap = Record<number, number>; // travellerId -> mealId

const FlightAddonsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'seat' | 'meal'>('seat');
  const [selectedSeats, setSelectedSeats] = useState<SeatMap>({} as SeatMap);
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [selectedMeals, setSelectedMeals] = useState<MealMap>({} as MealMap);
  const [activeTraveller, setActiveTraveller] = useState<number>(1);

  const bookedSeats = [
    '1A', '1B', '2C', '3D', '3E', '4F', '5B', '6A', '7E', '8C', '9F',
    '10A', '11D', '12B', '13E', '14C', '15F', '16A', '17B', '18D',
    '19E', '20C', '21F', '22A', '23B', '24D', '25E', '26C', '27F'
  ];

  const travellers: Traveller[] = [
    { id: 1, name: 'Arun R', seat: null },
    { id: 2, name: 'Liki J', seat: null },
    { id: 3, name: 'Karthik K', seat: null }
  ];

  const meals: Meal[] = [
    {
      id: 1,
      name: 'Vegan meal + beverage',
      price: 425,
      image: '🥗',
      veg: true
    },
    {
      id: 2,
      name: 'Cucumber Tomato Cheese and Lettuce Sandwich + beverage',
      price: 425,
      image: '🥪',
      veg: true
    },
    {
      id: 3,
      name: 'Paneer Tikka Sandwich',
      price: 425,
      image: '🥙',
      veg: true
    },
    {
      id: 4,
      name: '6E Eats choice of the day (non-veg) + beverage',
      price: 525,
      image: '🍗',
      veg: false
    },
    {
      id: 5,
      name: 'Low calori',
      price: 425,
      image: '🥗',
      veg: true
    },
    {
      id: 6,
      name: 'Jain meal + beverage',
      price: 425,
      image: '🍱',
      veg: true
    },
    {
      id: 7,
      name: 'Fruit Cake',
      price: 225,
      image: '🍰',
      veg: true
    },
    {
      id: 8,
      name: 'Diabetic veg meal + beverage',
      price: 425,
      image: '🥗',
      veg: true
    },
    {
      id: 9,
      name: 'Chicken Junglee Sandwich + beverage',
      price: 525,
      image: '🥪',
      veg: false
    },
    {
      id: 10,
      name: '#IndiaByIndiGo regional favourite (veg)',
      price: 425,
      image: '🍛',
      veg: true
    }
  ];

  const priceRanges: { label: string; range: string }[] = [
    { label: 'Free', range: 'free' },
    { label: '₹350 - ₹1000', range: '350-1000' },
    { label: '₹1900', range: '1900' }
  ];

  const generateSeats = (row: number): string[] => {
    if (row === 28) {
      return ['A', 'B', 'D', 'E'];
    }
    return ['A', 'B', 'C', 'D', 'E', 'F'];
  };

  const getSeatStatus = (row: number, seat: string): 'booked' | 'premium' | 'selected' | 'available' => {
    const seatId = `${row}${seat}`;
    if (bookedSeats.includes(seatId)) return 'booked';
    if (row === 1) return 'premium';

    // Check if this seat is selected by any traveller
    for (const travellerIdStr in selectedSeats) {
      const travellerId = Number(travellerIdStr);
      if (selectedSeats[travellerId] === seatId) {
        return 'selected';
      }
    }
    return 'available';
  };

  const getSeatColor = (status: string): string => {
    switch (status) {
      case 'booked':
        return 'text-slate-400';
      case 'premium':
        return 'text-pink-500 hover:text-pink-600 cursor-pointer';
      case 'selected':
        return 'text-blue-600 cursor-pointer';
      default:
        return 'text-amber-400 hover:text-amber-500 cursor-pointer';
    }
  };

  const handleSeatClick = (row: number, seat: string): void => {
    const seatId = `${row}${seat}`;
    const status = getSeatStatus(row, seat);
    
    if (status === 'booked') return;

    setSelectedSeats(prev => {
      const newSeats = { ...prev };
      
      // If this seat is already selected by the active traveller, deselect it
      if (newSeats[activeTraveller] === seatId) {
        delete newSeats[activeTraveller];
      } else {
        // Assign seat to active traveller
        newSeats[activeTraveller] = seatId;
      }
      
      return newSeats;
    });
  };

  const filteredMeals = vegOnly ? meals.filter((m) => m.veg) : meals;

  const getTravellerSeat = (travellerId: number): string | null => {
    return selectedSeats[travellerId] || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Your Flight</h3>
                <span className="text-xs text-slate-500">One Way</span>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Mon, 27 Oct</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Plane className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">IndiGo</p>
                      <p className="text-xs text-slate-500">6E 6489</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mt-4">
                  <div>
                    <p className="text-xl font-bold text-slate-900">23:40</p>
                    <p className="text-xs text-slate-500">Lucknow</p>
                  </div>
                  <div className="flex-1 mx-3 text-center">
                    <p className="text-xs text-slate-500">1h 15m</p>
                    <div className="h-0.5 bg-slate-300 my-1" />
                    <p className="text-xs text-emerald-600 font-medium">Non-stop</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">00:55</p>
                    <p className="text-xs text-slate-500">New Delhi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Travellers</h3>
                <button className="text-orange-600 text-sm font-medium">+2 More</button>
              </div>

              <div className="p-6 space-y-3">
                {travellers.map((traveller, idx) => (
                  <div key={traveller.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{idx + 1}. {traveller.name}</span>
                    <span className="text-xs text-slate-500">
                      {getTravellerSeat(traveller.id) ? 
                        `Seat ${getTravellerSeat(traveller.id)}` : 
                        'Select Seat'
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Fare Summary</h3>
                <p className="text-sm text-slate-500">3 Travellers</p>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Fare Type</span>
                  <span className="text-emerald-600 font-semibold">Partially Refundable</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base Fare</span>
                  <span className="font-semibold text-slate-900">₹7,347</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Taxes & Fees</span>
                  <span className="font-semibold text-slate-900">₹4,950</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Instant Off</span>
                  <span className="font-semibold">-₹965</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Total Amount</span>
                    <span className="text-2xl font-bold text-slate-900">₹11,332</span>
                  </div>
                  <p className="text-xs text-slate-500 line-through mt-1">₹12,297</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('seat')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === 'seat'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Seat
                  </button>
                  <button
                    onClick={() => setActiveTab('meal')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === 'meal'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Meal
                  </button>
                </div>
                <button className="text-orange-600 text-sm font-medium hover:text-orange-700">
                  Skip to Payment →
                </button>
              </div>

              {activeTab === 'seat' && (
                <div className="p-6">
                  <div className="mb-6 flex items-center space-x-2">
                    {priceRanges.map((range) => (
                      <button
                        key={range.range}
                        className="px-4 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl p-8 border-2 border-slate-200">
                    <div className="mb-6">
                      <div className="w-full h-24 bg-gradient-to-b from-blue-400 to-blue-500 rounded-t-full mx-auto flex items-center justify-center relative overflow-hidden" style={{maxWidth: '500px'}}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                        <Plane className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                      <div className="space-y-2 mx-auto" style={{maxWidth: '500px'}}>
                        <div className="flex items-center justify-center mb-4 sticky top-0 bg-gradient-to-b from-slate-100 to-transparent pt-2 pb-2 z-10">
                          <div className="grid gap-3" style={{gridTemplateColumns: '40px repeat(3, 50px) 30px repeat(3, 50px)'}}>
                            <div className="text-center text-xs font-semibold text-slate-500"></div>
                            {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, idx) => (
                              <div key={idx} className="text-center text-xs font-semibold text-slate-600">
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {Array.from({ length: 40 }, (_, i) => {
                          const row = i + 1;
                          const seats = generateSeats(row);
                          
                          return (
                            <div key={row} className="flex items-center justify-center">
                              <div className="grid gap-3 items-center" style={{gridTemplateColumns: '40px repeat(3, 50px) 30px repeat(3, 50px)'}}>
                                <div className="flex items-center justify-center">
                                  <span className="text-xs font-bold text-slate-700">{row}</span>
                                </div>

                                {['A', 'B', 'C'].map((seatLabel) => {
                                  if (!seats.includes(seatLabel)) {
                                    return <div key={seatLabel} />;
                                  }
                                  const status = getSeatStatus(row, seatLabel);
                                  return (
                                    <button
                                      key={seatLabel}
                                      onClick={() => handleSeatClick(row, seatLabel)}
                                      disabled={status === 'booked'}
                                      className={`relative ${getSeatColor(status)} transition-all transform hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed`}
                                      title={`${row}${seatLabel}`}
                                    >
                                      <Armchair className="w-10 h-10" strokeWidth={1.5} />
                                      {status === 'selected' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}

                                <div className="flex items-center justify-center">
                                  <div className="w-1 h-8 bg-slate-300 rounded-full"></div>
                                </div>

                                {['D', 'E', 'F'].map((seatLabel) => {
                                  if (!seats.includes(seatLabel)) {
                                    return <div key={seatLabel} />;
                                  }
                                  const status = getSeatStatus(row, seatLabel);
                                  return (
                                    <button
                                      key={seatLabel}
                                      onClick={() => handleSeatClick(row, seatLabel)}
                                      disabled={status === 'booked'}
                                      className={`relative ${getSeatColor(status)} transition-all transform hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed`}
                                      title={`${row}${seatLabel}`}
                                    >
                                      <Armchair className="w-10 h-10" strokeWidth={1.5} />
                                      {status === 'selected' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-center flex-wrap gap-4 text-xs">
                      <div className="flex items-center space-x-2">
                        <Armchair className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                        <span className="text-slate-600">Available</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Armchair className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
                        <span className="text-slate-600">Selected</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Armchair className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                        <span className="text-slate-600">Booked</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Armchair className="w-6 h-6 text-pink-500" strokeWidth={1.5} />
                        <span className="text-slate-600">Premium</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-4 text-center">
                        Select traveller to assign seat
                      </p>
                      <div className="flex items-center justify-center flex-wrap gap-3">
                        {travellers.map((traveller) => (
                          <button
                            key={traveller.id}
                            onClick={() => setActiveTraveller(traveller.id)}
                            className={`px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all transform hover:scale-105 ${
                              activeTraveller === traveller.id
                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                                : getTravellerSeat(traveller.id)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-300 text-slate-600 hover:border-slate-400 bg-white'
                            }`}
                          >
                            {traveller.name}
                            {getTravellerSeat(traveller.id) && (
                              <span className="block text-xs mt-1 font-normal">
                                Seat {getTravellerSeat(traveller.id)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'meal' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Select Your Meal</h3>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vegOnly}
                        onChange={(e) => setVegOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-slate-700">🌱 Veg only</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {filteredMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center space-x-4 p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center text-4xl flex-shrink-0">
                          {meal.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{meal.name}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            {meal.veg && (
                              <span className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm flex-shrink-0">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              </span>
                            )}
                            <span className="text-sm font-bold text-slate-900">₹{meal.price}</span>
                          </div>
                        </div>
                        <button className="px-4 py-2 border-2 border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-all text-sm flex-shrink-0">
                          Add
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t-2 border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-4">Meal Selection per Traveller</h4>
                    <div className="flex items-center justify-center flex-wrap gap-3">
                      {travellers.map((traveller) => (
                        <button
                          key={traveller.id}
                          className={`px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                            selectedMeals[traveller.id]
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400 bg-white'
                          }`}
                        >
                          {traveller.name}
                          <span className="block text-xs mt-1 font-normal">
                            {selectedMeals[traveller.id] 
                              ? 'Meal Selected'
                              : 'Select Meal'
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden sticky bottom-4">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">₹11,332</p>
                  <p className="text-xs text-slate-500">
                    <span className="line-through">₹12,297</span> • 3 Travellers
                  </p>
                </div>
                <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2">
                  <span>{activeTab === 'seat' ? 'Meal Selection' : 'Continue'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightAddonsPage;