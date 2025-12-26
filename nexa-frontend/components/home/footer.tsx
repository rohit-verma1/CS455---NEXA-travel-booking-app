"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Technology & Academic Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-gray-500 mb-3">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                Academic Project
              </div>
              <h3 className="text-lg font-light mb-2">CS455 Software Engineering</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Developed by <span className="text-white font-medium">Arcade Nation</span> at IIT Kanpur under <span className="text-white font-medium">Prof. Priyanka Bagade</span>.  All bookings simulated for educational purposes.
              </p>
            </div>

            <div className="lg:col-span-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: "PostgreSQL", role: "Database" },
                  { name: "Django", role: "Backend Framework" },
                  { name: "Next.js", role: "Frontend Framework" },
                  { name: "ShadCN", role: "UI Components" },
                  { name: "Gemini", role: "Agentic AI" },
                  { name: "Redis", role: "Caching Layer" },
                ].map((tech, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg p-4 h-15 flex flex-col items-center justify-center text-center border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <h5 className="font-medium text-white text-sm mb-2">{tech.name}</h5>
                    <p className="text-xs text-gray-400">{tech.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-semibold">Nexa</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              The next generation of travel booking platform
            </p>
            <div className="flex gap-3">
              {[
                {
                  name: "GitHub",
                  icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  ),
                },
                {
                  name: "LinkedIn",
                  icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  ),
                },
                {
                  name: "Twitter",
                  icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  ),
                },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Services</h4>
            <ul className="space-y-2">
              {["Flights", "Trains", "Buses", "Group Booking"].map((item, idx) => (
                <li key={idx}>
                  <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Support</h4>
            <ul className="space-y-2">
              {["Help Center", "Contact Us", "Booking Status", "Cancellation"].map((item, idx) => (
                <li key={idx}>
                  <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">About</h4>
            <ul className="space-y-2">
              {["About Nexa", "Team", "Documentation", "Privacy Policy"].map((item, idx) => (
                <li key={idx}>
                  <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Team</h4>
            <ul className="space-y-2">
              {[
                { name: "Likith Sai Jonna", roll: "220483" },
                { name: "KSU Rithwin", roll: "220537" },
                { name: "Karthik Kollamoram", roll: "220538" },
                { name: "Rohit Verma", roll: "220917" },
                { name: "Ritesh Hans", roll: "220893" },
              ].map((member, idx) => (
                <li key={idx} className="text-gray-400 text-xs">
                  <span className="text-white">{member.name}</span>
                  <span className="text-gray-600 ml-1">({member.roll})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-gray-500 text-xs text-center md:text-left">
              © 2025 Nexa. Made with ❤️ at IIT Kanpur
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-white text-xs transition-colors">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-white text-xs transition-colors">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-white text-xs transition-colors">
                Cookies
              </a>
            </div>
          </div>
          
          {/* Academic Disclaimer */}
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              <span className="text-gray-300 font-medium">Academic Disclaimer:</span>
              {" "}This is an educational project for CS455 at IIT Kanpur. All bookings and transactions are simulated for demonstration purposes only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}