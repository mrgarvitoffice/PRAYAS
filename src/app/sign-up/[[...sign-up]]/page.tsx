import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-600 dark:bg-indigo-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent"></div>
        <div className="relative z-10 p-12 text-center max-w-lg">
          <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <span className="text-4xl font-bold text-white">P</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">Join Prayas News Terminal</h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Create an account to track your news preferences, generate your own custom podcasts, and access personalized daily briefings.
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl w-full",
                headerTitle: "text-slate-900 dark:text-white font-bold",
                headerSubtitle: "text-slate-500 dark:text-slate-400",
                socialButtonsBlockButton: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
                socialButtonsBlockButtonText: "font-semibold",
                dividerLine: "bg-slate-200 dark:bg-slate-700",
                dividerText: "text-slate-500 dark:text-slate-400",
                formFieldLabel: "text-slate-700 dark:text-slate-300 font-medium",
                formFieldInput: "bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 rounded-xl",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all rounded-xl",
                footerActionText: "text-slate-500 dark:text-slate-400",
                footerActionLink: "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold",
                identityPreviewText: "text-slate-900 dark:text-white",
                identityPreviewEditButton: "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300",
                formResendCodeLink: "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
