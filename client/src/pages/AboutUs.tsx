import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Heart, Zap, Shield, Users, ArrowRight, Stethoscope } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-sky-100 bg-white/95 backdrop-blur-md">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900">ICD-10 Search</span>
              </a>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/about">
                <a className="text-sm font-medium text-sky-600">About</a>
              </Link>
              <Link href="/contact">
                <a className="text-sm font-medium text-slate-600 hover:text-sky-600">Contact</a>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">Back Home</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 space-y-20">
        {/* Hero Section */}
        <section className="space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
              About ICD-10 Search Engine
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Simplifying medical coding and healthcare administration through intelligent search and verification
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-slate-900">Our Mission</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              We believe that healthcare professionals deserve tools that work as hard as they do. Our mission is to eliminate the friction in medical coding by providing instant, accurate access to ICD-10 codes and their coverage status under Saudi health insurance.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              By combining comprehensive medical databases with intelligent search capabilities, we're helping doctors, pharmacists, and healthcare administrators save time and reduce errors in their daily operations.
            </p>
          </div>
          <div className="bg-gradient-to-br from-sky-100 to-emerald-100 rounded-2xl p-12 flex items-center justify-center min-h-96">
            <div className="text-center space-y-4">
              <Zap className="h-24 w-24 text-sky-600 mx-auto" />
              <p className="text-2xl font-bold text-slate-900">Fast & Accurate</p>
              <p className="text-slate-600">Instant verification of medical codes</p>
            </div>
          </div>
        </section>

        {/* Creator Section */}
        <section className="bg-white rounded-2xl border border-sky-100 p-12 space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-sky-500 to-emerald-500 rounded-full p-4">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Created by Islam Mostafa Eid</h3>
              <p className="text-slate-600 font-medium">Pharmacist & Healthcare Technology Specialist</p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed text-lg">
            With years of experience in pharmacy and healthcare administration, I recognized the need for a better way to access and verify medical codes. This platform was built to solve real problems faced by healthcare professionals every single day.
          </p>
          <p className="text-slate-600 leading-relaxed text-lg">
            Whether you're managing patient records, processing insurance claims, or conducting medical research, this tool is designed to make your work faster, easier, and more accurate.
          </p>
          
          {/* Qualifications */}
          <div className="border-t border-slate-200 pt-8 space-y-4">
            <h4 className="text-xl font-bold text-slate-900">Professional Qualifications</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="bg-sky-100 rounded-full p-2 mt-1 flex-shrink-0">
                  <div className="w-2 h-2 bg-sky-600 rounded-full"></div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">MBA in Pharmaceutical Management</p>
                  <p className="text-sm text-slate-600">Advanced expertise in healthcare administration and pharmaceutical operations</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-emerald-100 rounded-full p-2 mt-1 flex-shrink-0">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Australian Equivalency in Pharmacy</p>
                  <p className="text-sm text-slate-600">International pharmacy qualification recognized globally</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-purple-100 rounded-full p-2 mt-1 flex-shrink-0">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Postgraduate Clinical Pharmacy Diploma</p>
                  <p className="text-sm text-slate-600">Specialized training in clinical pharmacy practice and patient care</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-12">
          <h2 className="text-4xl font-bold text-slate-900 text-center">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl border border-sky-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
              <div className="bg-sky-100 rounded-lg p-3 w-fit">
                <Zap className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Lightning Fast</h3>
              <p className="text-slate-600">
                Search through 40,000+ ICD-10 codes in milliseconds. Get instant results with our optimized database.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl border border-emerald-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
              <div className="bg-emerald-100 rounded-lg p-3 w-fit">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Saudi Insurance Coverage</h3>
              <p className="text-slate-600">
                Know instantly which codes are covered by Saudi health insurance. Avoid claim rejections and administrative headaches.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl border border-purple-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 rounded-lg p-3 w-fit">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Built for Professionals</h3>
              <p className="text-slate-600">
                Designed by a pharmacist, for healthcare professionals. Every feature solves a real-world problem.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-gradient-to-r from-sky-500 to-emerald-500 rounded-2xl p-12 text-white space-y-8">
          <h2 className="text-4xl font-bold text-center">By The Numbers</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold">40,316</p>
              <p className="text-sky-100">ICD-10 Codes</p>
            </div>
            <div>
              <p className="text-4xl font-bold">202</p>
              <p className="text-sky-100">Non-Covered Codes</p>
            </div>
            <div>
              <p className="text-4xl font-bold">100%</p>
              <p className="text-sky-100">Accurate Data</p>
            </div>
            <div>
              <p className="text-4xl font-bold">24/7</p>
              <p className="text-sky-100">Available</p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="space-y-12">
          <h2 className="text-4xl font-bold text-slate-900 text-center">Our Core Values</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Heart className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Patient-Centric</h3>
                  <p className="text-slate-600">Everything we do is ultimately for better patient care and healthcare outcomes.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Accuracy First</h3>
                  <p className="text-slate-600">Medical data requires precision. We maintain the highest standards of accuracy.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Zap className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Efficiency</h3>
                  <p className="text-slate-600">Healthcare professionals are busy. We help them work smarter, not harder.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Users className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Collaboration</h3>
                  <p className="text-slate-600">Built for teams. Share results, collaborate, and improve together.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-white rounded-2xl border border-sky-100 p-12 text-center space-y-6">
          <h2 className="text-3xl font-bold text-slate-900">Ready to Simplify Your Medical Coding?</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Join healthcare professionals who are already saving time and reducing errors with our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="gap-2">
                Start Searching <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Get in Touch
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-slate-50 py-12 mt-20">
        <div className="container text-center text-slate-600">
          <p>© 2026 ICD-10 Search Engine. Created with ❤️ for healthcare professionals.</p>
        </div>
      </footer>
    </div>
  );
}
