import { Card, CardContent } from "@/components/ui/card";

type OfferItem = {
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
  badgeText?: string;
  validUntil: string;
};

export function OffersSection() {
  const offers: OfferItem[] = [
    {
      title: "Flat 12% Off",
      description: "on Domestic Flights with Nexa Bank Credit Cards + Interest Free EMI",
      bgColor: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
      textColor: "text-white",
      validUntil: "Valid till 31st Oct",
    },
    {
      title: "Flat 8% Off",
      description: "on Int'l Flights with Nexa Bank Credit Cards & Credit Card EMI",
      bgColor: "bg-gradient-to-r from-cyan-500 to-blue-500",
      textColor: "text-white",
      badgeText: "FREE EXTENDED",
      validUntil: "Valid till 30th Sep",
    },
    {
      title: "Up to 25% Off",
      description: "on Business & Economy Class",
      bgColor: "bg-gradient-to-r from-amber-400 to-amber-600",
      textColor: "text-white",
      validUntil: "Valid till 31st Oct",
    },
    {
      title: "Get up to ₹1500 Off",
      description: "on Domestic & International Flights with ICICI Bank Credit Cards + Interest Free EMI",
      bgColor: "bg-gradient-to-r from-orange-600 to-orange-500",
      textColor: "text-white",
      validUntil: "Valid till 31st Oct",
    },
  ];

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Today's Flight Offers
          </h2>
          
          <div className="flex gap-2">
            <button className="px-4 py-1 rounded-full bg-blue-500 text-white text-sm">Flights</button>
            <button className="px-4 py-1 rounded-full bg-white text-gray-600 border border-gray-200 text-sm">Bank Offers</button>
            <button className="px-4 py-1 rounded-full bg-white text-gray-600 border border-gray-200 text-sm">Hotels</button>
            <button className="px-4 py-1 rounded-full bg-white text-gray-600 border border-gray-200 text-sm">Trains</button>
            <button className="px-4 py-1 rounded-full bg-white text-gray-600 border border-gray-200 text-sm hover:text-blue-500">
              View All <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {offers.map((offer, index) => (
            <Card 
              key={index} 
              className={`overflow-hidden cursor-pointer transition-transform hover:scale-105 ${offer.bgColor} border-0 shadow-lg`}
            >
              <CardContent className="p-6 flex flex-col justify-between min-h-[240px]">
                <div>
                  {offer.badgeText && (
                    <span className="inline-block bg-yellow-300 text-yellow-800 text-xs px-2 py-1 rounded mb-4 font-medium">
                      {offer.badgeText}
                    </span>
                  )}
                  <h3 className={`text-2xl font-bold mb-2 ${offer.textColor}`}>{offer.title}</h3>
                  <p className={`${offer.textColor} opacity-90`}>{offer.description}</p>
                </div>
                
                <div className="flex items-center justify-between mt-6">
                  <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    <span className={`text-xs ${offer.textColor}`}>{offer.validUntil}</span>
                  </div>
                  
                  {/* Sample flight graphic */}
                  <div className={`${offer.textColor}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}