import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Stethoscope, ChevronDown, Search, Shield, Zap, HelpCircle } from "lucide-react";
import Footer from "@/components/Footer";
import { useState } from "react";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    category: "Getting Started",
    question: "What is ICD-10 Search Engine?",
    answer: "ICD-10 Search Engine is a comprehensive medical coding platform designed to help healthcare professionals quickly search and verify ICD-10 codes, medications, and their coverage status under Saudi health insurance. It contains over 40,000 ICD-10 codes and information about 46,000+ medications and treatments."
  },
  {
    id: "2",
    category: "Getting Started",
    question: "How do I search for a code?",
    answer: "Simply type your search query in the search bar on the homepage. You can search by: ICD-10 code (e.g., E11.9), medication name (e.g., Panadol), or medical condition (e.g., Diabetes). The search is case-insensitive, so you can type in any format."
  },
  {
    id: "3",
    category: "Getting Started",
    question: "What information does each code show?",
    answer: "Each code displays: the ICD-10 code itself, the code description/name, related medications and treatments, associated medical conditions, and most importantly, whether it's covered by Saudi health insurance."
  },
  {
    id: "4",
    category: "Bulk Verification",
    question: "What is Bulk Verification and how do I use it?",
    answer: "Bulk Verification allows you to check multiple ICD-10 codes at once. Click the 'Bulk Verify' button, enter or paste multiple codes (one per line), and click 'Verify Batch'. You'll get instant results showing coverage status for all codes. You can also export results as CSV."
  },
  {
    id: "5",
    category: "Bulk Verification",
    question: "Can I upload an image to extract codes?",
    answer: "Yes! Click the camera icon in the Bulk Verify modal to upload an image (screenshot, photo, or document). The system uses AI to recognize ICD-10 codes in the image and automatically adds them to your verification list."
  },
  {
    id: "6",
    category: "Bulk Verification",
    question: "How do I add individual codes to the bulk verification?",
    answer: "Use the code search box at the top of the Bulk Verify modal. Type a code and click the '+' button to add it to the verification list. You can add multiple codes this way before clicking 'Verify Batch'."
  },
  {
    id: "7",
    category: "Coverage Status",
    question: "What does 'Covered' mean?",
    answer: "'Covered' means the ICD-10 code is covered by Saudi health insurance. Claims submitted with this code should be processed and reimbursed by the insurance provider, subject to policy terms and conditions."
  },
  {
    id: "8",
    category: "Coverage Status",
    question: "What does 'Not Covered' mean?",
    answer: "'Not Covered' means the ICD-10 code is not covered by Saudi health insurance. Claims submitted with this code may be rejected or require out-of-pocket payment. You may need to discuss alternative treatment options with your healthcare provider."
  },
  {
    id: "9",
    category: "Coverage Status",
    question: "How often is the coverage information updated?",
    answer: "Coverage information is updated regularly to reflect changes in Saudi health insurance policies. We recommend checking the platform periodically for the latest information, especially if you haven't verified a code in several months."
  },
  {
    id: "10",
    category: "Features",
    question: "Can I save my favorite codes?",
    answer: "Yes! Click the heart icon on any code to add it to your favorites. You can access all your saved codes from the 'Favorites' page. This helps you quickly access frequently used codes."
  },
  {
    id: "11",
    category: "Features",
    question: "What is the Database page?",
    answer: "The Database page allows you to browse all available codes, medications, and conditions in an organized table format. You can search, filter, and sort the data to find exactly what you need."
  },
  {
    id: "12",
    category: "Features",
    question: "Can I export search results?",
    answer: "Yes! In the Bulk Verify feature, you can export verification results as a CSV file. This is useful for record-keeping, reporting, and sharing results with colleagues."
  },
  {
    id: "13",
    category: "Technical",
    question: "Is my data private and secure?",
    answer: "Yes, your privacy is important to us. We do not store your search queries or personal information. All searches are processed securely. Please refer to our Privacy Policy for complete details about data handling."
  },
  {
    id: "14",
    category: "Technical",
    question: "What browsers are supported?",
    answer: "ICD-10 Search Engine works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of your browser."
  },
  {
    id: "15",
    category: "Technical",
    question: "Can I access this on mobile?",
    answer: "Yes! The platform is fully responsive and works on mobile devices, tablets, and desktops. You can search and verify codes on the go using your smartphone."
  },
  {
    id: "16",
    category: "Support",
    question: "I found an error or have a suggestion. How do I report it?",
    answer: "We'd love to hear from you! Please visit our Contact Us page and fill out the form with your feedback. You can also email us directly at islameid892@outlook.com with any issues or suggestions."
  },
  {
    id: "17",
    category: "Support",
    question: "How do I contact support?",
    answer: "You can reach us through: 1) Contact form on our website, 2) Email: islameid892@outlook.com, 3) We typically respond within 24 hours during business days."
  },
  {
    id: "18",
    category: "Support",
    question: "Is there a user guide or documentation?",
    answer: "Yes! Our website includes comprehensive documentation. Visit the 'About Us' page for more information about the platform and its features. You can also find help tips throughout the interface."
  }
];

const categories = ["All", "Getting Started", "Bulk Verification", "Coverage Status", "Features", "Technical", "Support"];

export default function FAQ() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = selectedCategory === "All" 
    ? faqItems 
    : faqItems.filter(item => item.category === selectedCategory);

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
      <main className="flex-1 container py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-sky-100 rounded-full p-4">
                <HelpCircle className="h-8 w-8 text-sky-600" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-slate-900">Frequently Asked Questions</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Find answers to common questions about ICD-10 codes, bulk verification, coverage status, and more.
            </p>
          </section>

          {/* Category Filter */}
          <section className="flex flex-wrap gap-2 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-sky-600 text-white shadow-lg"
                    : "bg-white border border-sky-100 text-slate-600 hover:border-sky-300"
                }`}
              >
                {category}
              </button>
            ))}
          </section>

          {/* FAQ Items */}
          <section className="space-y-4">
            {filteredFAQs.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-sky-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full px-6 py-4 flex items-start justify-between hover:bg-sky-50 transition-colors"
                >
                  <div className="flex-1 text-left space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-1 rounded">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform ${
                      expandedId === item.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedId === item.id && (
                  <div className="px-6 py-4 bg-sky-50 border-t border-sky-100">
                    <p className="text-slate-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Still Have Questions */}
          <section className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-lg border border-sky-100 p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Still have questions?</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Can't find the answer you're looking for? Our support team is here to help. Reach out to us anytime.
            </p>
            <Link href="/contact">
              <Button size="lg" className="gap-2">
                <Search className="h-4 w-4" />
                Contact Support
              </Button>
            </Link>
          </section>

          {/* Quick Links */}
          <section className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-sky-100 p-6 space-y-3">
              <div className="bg-sky-100 rounded-lg p-3 w-fit">
                <Zap className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Quick Start</h3>
              <p className="text-sm text-slate-600">
                New to the platform? Check out our About page to learn more.
              </p>
              <Link href="/about">
                <a className="text-sky-600 font-medium hover:text-sky-700 text-sm">Learn more →</a>
              </Link>
            </div>

            <div className="bg-white rounded-lg border border-emerald-100 p-6 space-y-3">
              <div className="bg-emerald-100 rounded-lg p-3 w-fit">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Privacy & Security</h3>
              <p className="text-sm text-slate-600">
                Your data is important. Read our privacy policy for details.
              </p>
              <Link href="/privacy">
                <a className="text-emerald-600 font-medium hover:text-emerald-700 text-sm">Read policy →</a>
              </Link>
            </div>

            <div className="bg-white rounded-lg border border-purple-100 p-6 space-y-3">
              <div className="bg-purple-100 rounded-lg p-3 w-fit">
                <HelpCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Terms & Conditions</h3>
              <p className="text-sm text-slate-600">
                Understand our terms of service and user responsibilities.
              </p>
              <Link href="/terms">
                <a className="text-purple-600 font-medium hover:text-purple-700 text-sm">View terms →</a>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
