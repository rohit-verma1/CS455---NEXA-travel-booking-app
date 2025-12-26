"use client";

const steps = [
  {
    number: "01",
    title: "Search & Compare",
    desc: "Browse verified providers with advanced filters",
  },
  {
    number: "02",
    title: "Select Service",
    desc: "Choose and customize your booking preferences",
  },
  {
    number: "03",
    title: "Book & Travel",
    desc: "Secure payment with instant confirmation",
  },
];

export function HowNexaWorksSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-light text-gray-900 mb-3">
            How Nexa Works
          </h2>
          <p className="text-sm text-gray-500">
            Your journey to hassle-free travel in three simple steps
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-gray-200" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
            {steps.map((step, idx) => (
              <div key={idx} className="text-center relative">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-900 text-white text-xl font-semibold mb-8 relative z-10 shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
