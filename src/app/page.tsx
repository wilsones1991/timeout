import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/app-icon.png"
              alt="Class Card logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold text-gray-900">Class Card</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Track Student Check-Ins with a Simple Scan
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Know exactly which students are out of your classroom at any moment.
            Students scan their QR code ID cards to check in and out—no more paper sign-out sheets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-hover transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 bg-gray-50 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-6xl">📱</div>
              <div className="text-4xl text-gray-400">→</div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl text-gray-400">→</div>
              <div className="text-6xl">✅</div>
            </div>
            <p className="text-gray-500 mt-6">Scan → Track → Done</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Simple tools designed for busy teachers
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">QR Code Scanning</h3>
              <p className="text-gray-600">
                Students hold up their ID card to the webcam. One scan checks them in or out automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Queue</h3>
              <p className="text-gray-600">
                See exactly who is out of the room right now. The queue updates in real-time as students scan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Setup</h3>
              <p className="text-gray-600">
                Import students from a CSV or add them manually. Print QR code cards and you are ready to go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 text-center mb-12">
            Get up and running in four simple steps
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">1</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Create a classroom</h3>
                <p className="text-gray-600">Set up your classroom with a name and optional description.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">2</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Add your students</h3>
                <p className="text-gray-600">Import from CSV, sync with Google Classroom, or add students one by one.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">3</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Print QR code cards</h3>
                <p className="text-gray-600">Generate and print personalized QR code ID cards for each student.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">4</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Students scan to check in/out</h3>
                <p className="text-gray-600">Students scan their card at your classroom kiosk. You see the live queue update instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify classroom check-ins?
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Join teachers who have ditched paper sign-out sheets for good.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-lighter transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/app-icon.png"
              alt="Class Card logo"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="text-gray-600">Class Card</span>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Class Card. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
