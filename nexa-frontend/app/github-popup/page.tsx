"use client";
import { useEffect } from "react";

export default function GithubPopup() {
  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (!code) {
          console.error("❌ No GitHub code found in URL");
          return;
        }

        console.log("🔹 Sending code to backend:", code);

        const res = await fetch("http://127.0.0.1:8000/auth/github-login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        console.log("✅ GitHub login response:", data);

        // Send data back to parent window
        window.opener.postMessage(data, window.location.origin);
        window.close();
      } catch (err) {
        console.error("❌ GitHub popup error:", err);
        window.opener.postMessage({ error: String(err) }, window.location.origin);
      }
    };

    run();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-pulse">
            <svg
              className="w-16 h-16 mx-auto text-gray-800"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.65.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-center text-gray-900">
            Connecting to GitHub...
          </h1>
          <p className="mt-2 text-sm text-center text-gray-600">
            Please wait while we securely authenticate you.
          </p>
        </div>
      </div>
    </div>
  );
}