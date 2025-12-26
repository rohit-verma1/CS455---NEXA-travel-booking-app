"use client";

const comparisonData = [
  {
    feature: "Speed",
    flights: "Fastest",
    trains: "Moderate",
    buses: "Slower",
  },
  {
    feature: "Cost",
    flights: "Premium",
    trains: "Moderate",
    buses: "Budget",
  },
  {
    feature: "Comfort",
    flights: "Excellent",
    trains: "Good",
    buses: "Moderate",
  },
  {
    feature: "Eco-Friendly",
    flights: "Lower",
    trains: "Highest",
    buses: "Moderate",
  },
];

export function TravelComparisonSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light text-gray-900 mb-3">
            Choose Your Perfect Journey
          </h2>
          <p className="text-sm text-gray-500">
            Compare travel modes based on what matters to you
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-6 text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Feature
                </th>
                <th className="text-center p-6 text-sm font-semibold text-gray-900">
                  Flights ✈️
                </th>
                <th className="text-center p-6 text-sm font-semibold text-gray-900">
                  Trains 🚆
                </th>
                <th className="text-center p-6 text-sm font-semibold text-gray-900">
                  Buses 🚌
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {comparisonData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-6 font-medium text-gray-900 text-sm">
                    {row.feature}
                  </td>
                  <td className="p-6 text-center text-gray-600 text-sm">
                    {row.flights}
                  </td>
                  <td className="p-6 text-center text-gray-600 text-sm">
                    {row.trains}
                  </td>
                  <td className="p-6 text-center text-gray-600 text-sm">
                    {row.buses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
