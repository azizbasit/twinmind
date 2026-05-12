import Link from "next/link";
import { Brain, ArrowRight, Shield, Zap, Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <Brain className="h-6 w-6 text-violet-600" />
          <span className="ml-2 text-xl font-bold">TwinMind</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {!user ? (
            <>
              <Link href="/sign-in" className="text-sm font-medium hover:underline underline-offset-4">Login</Link>
              <Link href="/sign-up" className="text-sm font-medium hover:underline underline-offset-4">Get Started</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4 mr-4">
                Dashboard
              </Link>
              {/* Custom User Profile dropdown could go here */}
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0) || "U"}
              </div>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-slate-50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Your Personal AI <span className="text-violet-600">Digital Twin</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  TwinMind learns from everything you provide and becomes an AI representation of you. 
                  It thinks, responds, and acts just like you.
                </p>
              </div>
              <div className="space-x-4">
                {!user ? (
                  <Link href="/sign-up">
                    <button className="inline-flex items-center justify-center rounded-md bg-violet-600 px-8 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-700">
                      Create Your Twin <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <button className="inline-flex items-center justify-center rounded-md bg-violet-600 px-8 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-700">
                      Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-3 bg-violet-100 rounded-full">
                  <Zap className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="text-xl font-bold">Infinite Memory</h3>
                <p className="text-gray-500">Every interaction, note, and document is converted into semantic memory.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-3 bg-pink-100 rounded-full">
                  <Shield className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold">Privacy Centric</h3>
                <p className="text-gray-500">Your digital twin is yours alone. Your data never leaves your secure environment.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold">Behavioral Mirroring</h3>
                <p className="text-gray-500">Learns your tone, vocabulary, and decision-making patterns automatically.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">© 2026 TwinMind AI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
