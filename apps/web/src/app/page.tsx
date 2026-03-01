import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(43_74%_49%_/_0.06),transparent_50%),radial-gradient(circle_at_70%_80%,hsl(43_74%_49%_/_0.04),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(0_0%_0%_/_0.02)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_0%_/_0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-gold/20 to-transparent blur-2xl" />
          <Image
            src="/anima-ai.svg"
            alt="Anima AI"
            width={148}
            height={148}
            className="relative rounded-2xl shadow-elevated-xl"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Anima <span className="gold-gradient-text">AI</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground leading-relaxed">
          Bring your documents to life. Upload PDFs, create AI-powered chatbots,
          and share them with a QR code.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98]"
          >
            Go to Dashboard
          </Link>
          <a
            href="https://github.com/AlgoNoRhythm/Anima-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-8 py-3.5 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-elevated hover:bg-accent active:scale-[0.98]"
          >
            View on GitHub
          </a>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-300 hover:shadow-elevated-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-white text-lg mb-4 shadow-gold transition-shadow duration-300 group-hover:shadow-gold-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="font-semibold mb-1">Upload PDFs</h3>
            <p className="text-sm text-muted-foreground">Smart parsing with structure-aware chunking and indexing.</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-300 hover:shadow-elevated-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-white text-lg mb-4 shadow-gold transition-shadow duration-300 group-hover:shadow-gold-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="font-semibold mb-1">AI Chat</h3>
            <p className="text-sm text-muted-foreground">RAG-powered conversations with citations and customizable personality.</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-300 hover:shadow-elevated-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-white text-lg mb-4 shadow-gold transition-shadow duration-300 group-hover:shadow-gold-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </div>
            <h3 className="font-semibold mb-1">QR Codes</h3>
            <p className="text-sm text-muted-foreground">Generate styled QR codes to share your chatbot with anyone.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
