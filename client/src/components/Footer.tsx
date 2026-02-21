import { Link } from "wouter";
import { Mail, Stethoscope } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-sky-100 bg-gradient-to-b from-white to-slate-50">
      <div className="container py-16 space-y-12">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/">
              <a className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900">ICD-10 Search</span>
              </a>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed">
              Simplifying medical coding and healthcare administration through intelligent search and verification.
            </p>
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4" />
              <a href="mailto:islameid892@outlook.com" className="text-sm hover:text-sky-600">
                islameid892@outlook.com
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    Search Codes
                  </a>
                </Link>
              </li>
              <li>
                <a href="/#bulk-verify" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  Bulk Verify
                </a>
              </li>
              <li>
                <Link href="/">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    Browse Database
                  </a>
                </Link>
              </li>
              <li>
                <a href="/#features" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    About Us
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    Contact Us
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    Privacy Policy
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                    Terms of Service
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#faq" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#documentation" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#help" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#feedback" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  Send Feedback
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            © {currentYear} ICD-10 Search Engine. All rights reserved.
          </p>
          <p className="text-sm text-slate-600">
            Created with ❤️ for healthcare professionals by Islam Mostafa Eid
          </p>
          <div className="flex items-center gap-4">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-sky-600 transition-colors">
              <span className="text-sm">LinkedIn</span>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-sky-600 transition-colors">
              <span className="text-sm">Twitter</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
