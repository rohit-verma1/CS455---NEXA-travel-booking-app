"use client";

const faqs = [
  {
    q: "How does the booking process work?",
    a: "Search for your route, compare verified providers, select your service, and complete booking with secure payment.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support cards, UPI, wallets, and net banking through our integrated payment gateway.",
  },
  {
    q: "Can I cancel or reschedule my booking?",
    a: "Yes, based on provider policies. Some changes may incur penalties as per terms.",
  },
  {
    q: "How do loyalty points work?",
    a: "Earn points on every booking and redeem for discounts on future bookings.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use TLS/HTTPS encryption and secure password hashing with role-based authentication.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light text-gray-900 mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-500">
            Everything you need to know about Nexa
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <summary className="p-6 cursor-pointer flex justify-between items-center font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                <span className="text-sm">{faq.q}</span>
                <svg
                  className="w-5 h-5 text-gray-400 transform group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
