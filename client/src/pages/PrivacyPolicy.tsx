import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Stethoscope, ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 flex flex-col">
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
            <Link href="/">
              <Button size="sm" variant="outline">Back Home</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-16 max-w-4xl">
        <div className="space-y-12">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-lg text-slate-600">
              Last updated: February 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              ICD-10 Search Engine ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Personal Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  When you contact us through our contact form, we collect the following information:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Subject of inquiry</li>
                  <li>Message content</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Usage Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  We automatically collect certain information about your device and how you interact with our website, including:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent</li>
                  <li>Search queries and results viewed</li>
                  <li>Device type and operating system</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">2. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>To respond to your inquiries and provide customer support</li>
              <li>To improve and optimize our website and services</li>
              <li>To analyze usage patterns and trends</li>
              <li>To prevent fraud and ensure security</li>
              <li>To comply with legal obligations</li>
              <li>To send you updates and announcements (with your consent)</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">3. Data Protection & Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Third-Party Sharing */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">4. Third-Party Sharing</h2>
            <p className="text-slate-600 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>With service providers who assist us in operating our website and conducting our business</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">5. Cookies & Tracking Technologies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our website. These technologies help us understand how you use our site and remember your preferences. You can control cookie settings through your browser preferences.
            </p>
          </section>

          {/* User Rights */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">6. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              To exercise these rights, please contact us at islameid892@outlook.com.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">7. Children's Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information promptly.
            </p>
          </section>

          {/* Policy Changes */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">8. Changes to This Privacy Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on our website and updating the "Last updated" date. Your continued use of our website following the posting of revised Privacy Policy means you accept and agree to the changes.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">9. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-white rounded-lg border border-sky-100 p-6 space-y-2">
              <p className="font-semibold text-slate-900">Islam Mostafa Eid</p>
              <p className="text-slate-600">Email: islameid892@outlook.com</p>
              <p className="text-slate-600">Subject: Privacy Policy Inquiry</p>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-lg border border-sky-100 p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Have Questions?</h3>
            <p className="text-slate-600">
              If you have any concerns about your privacy or how we handle your data, please don't hesitate to contact us.
            </p>
            <Link href="/contact">
              <Button className="gap-2">
                Contact Us
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
