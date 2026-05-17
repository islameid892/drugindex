import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Stethoscope, ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export default function TermsOfService() {
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
            <h1 className="text-5xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-lg text-slate-600">
              Last updated: February 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">1. Agreement to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing and using the ICD-10 Search Engine website and services, you accept and agree to be bound by and comply with these Terms of Service. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Use License */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">2. Use License</h2>
            <p className="text-slate-600 leading-relaxed">
              Permission is granted to temporarily download one copy of the materials (information or software) on ICD-10 Search Engine for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              <li>Use the website for any unlawful purpose or in violation of any applicable laws or regulations</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">3. Disclaimer</h2>
            <p className="text-slate-600 leading-relaxed">
              The materials on ICD-10 Search Engine are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
            <p className="text-slate-600 leading-relaxed mt-4">
              <strong>Medical Disclaimer:</strong> The information provided on this website is for informational purposes only and should not be considered as medical advice. Always consult with qualified healthcare professionals for medical decisions. We are not responsible for any adverse effects or consequences resulting from the use of any information on this website.
            </p>
          </section>

          {/* Limitations of Liability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">4. Limitations of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              In no event shall ICD-10 Search Engine or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ICD-10 Search Engine, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          {/* Accuracy of Materials */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">5. Accuracy of Materials</h2>
            <p className="text-slate-600 leading-relaxed">
              The materials appearing on ICD-10 Search Engine could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our website are accurate, complete, or current. We may make changes to the materials contained on our website at any time without notice.
            </p>
          </section>

          {/* Materials and Content */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">6. Materials and Content</h2>
            <p className="text-slate-600 leading-relaxed">
              The materials on ICD-10 Search Engine are protected by copyright law. Unauthorized use of these materials may violate copyright, trademark, and other laws. You may not use our materials for commercial purposes without explicit written permission from us.
            </p>
          </section>

          {/* Limitations on Use */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">7. Limitations on Use</h2>
            <p className="text-slate-600 leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Harass or cause distress or inconvenience to any person</li>
              <li>Transmit obscene or offensive content</li>
              <li>Disrupt the normal flow of dialogue within our website</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated tools to access or scrape our website</li>
              <li>Engage in any form of abuse or harassment</li>
            </ul>
          </section>

          {/* Revisions and Errata */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">8. Revisions and Errata</h2>
            <p className="text-slate-600 leading-relaxed">
              The materials appearing on ICD-10 Search Engine may include inaccuracies or typographical errors. We are not responsible for correcting these errors. We may make improvements and/or changes to our website and the materials at any time.
            </p>
          </section>

          {/* Links */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">9. Links</h2>
            <p className="text-slate-600 leading-relaxed">
              We have not reviewed all of the sites linked to our website and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          {/* Modifications */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">10. Modifications</h2>
            <p className="text-slate-600 leading-relaxed">
              We may revise these Terms of Service for our website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms of Service.
            </p>
          </section>

          {/* Governing Law */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">11. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              These Terms of Service and any separate agreements we may enter into to provide you with the services are governed by and construed in accordance with the laws of Saudi Arabia, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          {/* User Responsibilities */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">12. User Responsibilities</h2>
            <p className="text-slate-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of any account information and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">13. Contact Information</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-white rounded-lg border border-sky-100 p-6 space-y-2">
              <p className="font-semibold text-slate-900">Islam Mostafa Eid</p>
              <p className="text-slate-600">Email: islameid892@outlook.com</p>
              <p className="text-slate-600">Subject: Terms of Service Inquiry</p>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-lg border border-sky-100 p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Questions About Our Terms?</h3>
            <p className="text-slate-600">
              If you have any concerns or questions about these terms, please reach out to us.
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
