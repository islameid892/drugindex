import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mail, Send, Stethoscope, MessageSquare } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notifyOwnerMutation = trpc.system.notifyOwner.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await notifyOwnerMutation.mutateAsync({
        title: `New Contact Form Submission: ${formData.subject}`,
        content: `From: ${formData.name} (${formData.email})\n\nMessage:\n${formData.message}`,
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
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
              <Link href="/contact">
                <a className="text-sm font-medium text-sky-600">Contact</a>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">Back Home</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16 space-y-16">
        {/* Hero Section */}
        <section className="space-y-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
            Get in Touch
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you. Reach out to us and we'll respond as soon as possible.
          </p>
        </section>

        {/* Contact Info Cards */}
        <section className="grid md:grid-cols-3 gap-8">
          {/* Email */}
          <div className="bg-white rounded-xl border border-sky-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="bg-sky-100 rounded-lg p-4 w-fit">
              <Mail className="h-6 w-6 text-sky-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Email</h3>
            <p className="text-slate-600">
              Send us an email and we'll get back to you within 24 hours.
            </p>
            <a 
              href="mailto:islameid892@outlook.com"
              className="text-sky-600 font-semibold hover:text-sky-700 inline-flex items-center gap-2"
            >
              islameid892@outlook.com
              <Send className="h-4 w-4" />
            </a>
          </div>

          {/* Message */}
          <div className="bg-white rounded-xl border border-emerald-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="bg-emerald-100 rounded-lg p-4 w-fit">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Contact Form</h3>
            <p className="text-slate-600">
              Fill out the form below and we'll respond to your inquiry promptly.
            </p>
            <p className="text-emerald-600 font-semibold">
              ↓ Use the form below
            </p>
          </div>

          {/* Quick Response */}
          <div className="bg-white rounded-xl border border-purple-100 p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="bg-purple-100 rounded-lg p-4 w-fit">
              <Send className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Quick Response</h3>
            <p className="text-slate-600">
              We typically respond to all inquiries within 24 hours during business days.
            </p>
            <p className="text-purple-600 font-semibold">
              Average response time: 4 hours
            </p>
          </div>
        </section>

        {/* Contact Form */}
        <section className="max-w-2xl mx-auto bg-white rounded-2xl border border-sky-100 p-12 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Send us a Message</h2>
            <p className="text-slate-600">
              We're here to help and answer any questions you might have.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-900">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-900">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium text-slate-900">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="What is this about?"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-slate-900">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us more about your inquiry..."
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  Send Message
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-slate-500 text-center">
            We respect your privacy. Your information will only be used to respond to your inquiry.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="space-y-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="bg-white rounded-lg border border-slate-200 p-6 cursor-pointer hover:border-sky-200 transition-colors">
              <summary className="font-semibold text-slate-900 flex items-center justify-between">
                How long does it take to get a response?
                <span className="text-sky-600">+</span>
              </summary>
              <p className="text-slate-600 mt-4">
                We typically respond to all inquiries within 24 hours during business days. For urgent matters, please mark your email as urgent.
              </p>
            </details>

            <details className="bg-white rounded-lg border border-slate-200 p-6 cursor-pointer hover:border-sky-200 transition-colors">
              <summary className="font-semibold text-slate-900 flex items-center justify-between">
                Can I request new features?
                <span className="text-sky-600">+</span>
              </summary>
              <p className="text-slate-600 mt-4">
                Absolutely! We love hearing feature requests from our users. Please describe your idea in detail and we'll review it carefully.
              </p>
            </details>

            <details className="bg-white rounded-lg border border-slate-200 p-6 cursor-pointer hover:border-sky-200 transition-colors">
              <summary className="font-semibold text-slate-900 flex items-center justify-between">
                Is there a support phone line?
                <span className="text-sky-600">+</span>
              </summary>
              <p className="text-slate-600 mt-4">
                Currently, we support inquiries through email and contact form. We're working on adding phone support soon.
              </p>
            </details>

            <details className="bg-white rounded-lg border border-slate-200 p-6 cursor-pointer hover:border-sky-200 transition-colors">
              <summary className="font-semibold text-slate-900 flex items-center justify-between">
                How is my data handled?
                <span className="text-sky-600">+</span>
              </summary>
              <p className="text-slate-600 mt-4">
                Your privacy is important to us. We only use your contact information to respond to your inquiry and will never share it with third parties.
              </p>
            </details>
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
