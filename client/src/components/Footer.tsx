import { Link } from "wouter";
import { Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-sky-100 bg-slate-50">
      <div className="container py-6">
        {/* Single Row Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <p className="text-slate-600">
              © {currentYear} ICD-10 Search Engine
            </p>
            <div className="hidden md:block w-px h-4 bg-slate-300"></div>
            <a href="mailto:islameid892@outlook.com" className="text-slate-600 hover:text-sky-600 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>Contact</span>
            </a>
          </div>

          {/* Center Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <Link href="/about">
              <a className="text-slate-600 hover:text-sky-600 transition-colors">About</a>
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/faq">
              <a className="text-slate-600 hover:text-sky-600 transition-colors">FAQ</a>
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/privacy">
              <a className="text-slate-600 hover:text-sky-600 transition-colors">Privacy</a>
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/terms">
              <a className="text-slate-600 hover:text-sky-600 transition-colors">Terms</a>
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/tools">
              <a className="text-slate-600 hover:text-sky-600 transition-colors">Tools</a>
            </Link>
          </div>

          {/* Right Section */}
          <p className="text-slate-600">
            By <span className="font-semibold">Islam Mostafa Eid</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
