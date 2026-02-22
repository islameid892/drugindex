import { Link } from 'wouter';
import { FileText, Layers, ArrowLeft, Wrench } from 'lucide-react';

const tools = [
  {
    title: 'Image to PDF',
    description: 'Convert multiple images into a single PDF document. Supports JPG, PNG, WebP, and GIF formats.',
    icon: FileText,
    href: '/tools/image-to-pdf',
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'from-blue-500/10 to-cyan-500/10',
    borderColor: 'border-blue-500/20 hover:border-blue-500/40',
  },
  {
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one document. Reorder files before merging.',
    icon: Layers,
    href: '/tools/merge-pdf',
    gradient: 'from-purple-500 to-pink-500',
    bgGlow: 'from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/20 hover:border-purple-500/40',
  },
];

export default function Tools() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container py-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Tools</h1>
              <p className="text-slate-400 mt-1">Free utilities for healthcare professionals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href}>
                <a className={`group block p-8 rounded-2xl bg-gradient-to-br ${tool.bgGlow} border ${tool.borderColor} transition-all duration-300 hover:scale-[1.02]`}>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <tool.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{tool.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{tool.description}</p>
                  <div className="mt-4 text-sm font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
                    Open tool →
                  </div>
                </a>
              </Link>
            ))}
          </div>

          {/* Info */}
          <div className="mt-12 p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl text-center">
            <p className="text-slate-400 text-sm">
              All tools run entirely in your browser. Your files are never uploaded to any server — fast, private, and works offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
