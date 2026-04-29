import { Link } from "wouter";
import { FileDown, Stethoscope, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileItem {
  id: string;
  name: string;
  description: string;
  url: string;
  size: string;
  icon: React.ReactNode;
}

export default function Files() {
  const files: FileItem[] = [
    {
      id: "1",
      name: "Category Management Combined Guide",
      description: "Comprehensive guide covering category management strategies and best practices",
      url: "/manus-storage/Category_Management_Combined_Guide_7e0afd63.pdf",
      size: "168 KB",
      icon: <FileDown className="h-6 w-6" />,
    },
    {
      id: "2",
      name: "Consumer Centric Category Management Summary",
      description: "Summary of consumer-centric approaches to category management",
      url: "/manus-storage/Consumer_Centric_Category_Management_Summary(1)_fa960fd4.pdf",
      size: "477 KB",
      icon: <FileDown className="h-6 w-6" />,
    },
    {
      id: "3",
      name: "Consumer Centric Category Management FINAL",
      description: "Final version of consumer-centric category management documentation",
      url: "/manus-storage/Consumer_Centric_Category_Management_FINAL_49deee4c.pdf",
      size: "198 KB",
      icon: <FileDown className="h-6 w-6" />,
    },
    {
      id: "4",
      name: "Consumer Centric Category Management Expanded",
      description: "Expanded English version with detailed explanations and examples",
      url: "/manus-storage/Consumer_Centric_Category_Management_Expanded_English_f894616c.pdf",
      size: "22 KB",
      icon: <FileDown className="h-6 w-6" />,
    },
  ];

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                <a className="text-sm font-medium text-slate-600 hover:text-sky-600">About</a>
              </Link>
              <Link href="/files">
                <a className="text-sm font-medium text-sky-600">Files</a>
              </Link>
              <Link href="/tools">
                <a className="text-sm font-medium text-slate-600 hover:text-sky-600">Tools</a>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">Back Home</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 space-y-12">
        {/* Hero Section */}
        <section className="space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 border border-sky-200">
            <FileDown className="h-4 w-4 text-sky-600" />
            <span className="text-sm font-semibold text-sky-700">Available Resources</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
            Download Files
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Access our collection of comprehensive guides and documentation on category management and consumer-centric approaches.
          </p>
        </section>

        {/* Files Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow space-y-4"
            >
              {/* File Icon and Header */}
              <div className="flex items-start justify-between">
                <div className="bg-sky-100 rounded-lg p-3 w-fit">
                  <div className="text-sky-600">{file.icon}</div>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {file.size}
                </span>
              </div>

              {/* File Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                  {file.name}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {file.description}
                </p>
              </div>

              {/* Download Button */}
              <Button
                onClick={() => handleDownload(file.url, file.name + ".pdf")}
                className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          ))}
        </section>

        {/* Info Section */}
        <section className="bg-emerald-50 rounded-xl border border-emerald-200 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">About These Files</h2>
          <p className="text-slate-700">
            These documents provide comprehensive information about category management strategies, consumer-centric approaches, and best practices in retail and business management. All files are available for download in PDF format.
          </p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>All files are free to download</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>Files are in PDF format for easy viewing and sharing</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold mt-1">✓</span>
              <span>Compatible with all devices and operating systems</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © 2024 ICD-10 Search Engine. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy">
                <a className="text-sm text-slate-600 hover:text-sky-600">Privacy Policy</a>
              </Link>
              <Link href="/terms">
                <a className="text-sm text-slate-600 hover:text-sky-600">Terms of Service</a>
              </Link>
              <Link href="/contact">
                <a className="text-sm text-slate-600 hover:text-sky-600">Contact</a>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
