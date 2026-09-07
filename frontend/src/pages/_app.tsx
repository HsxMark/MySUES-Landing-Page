import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={ibmPlexMono.variable}>
      <Component {...pageProps} />
      <footer
        aria-label="网站备案信息"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--filing-banner-height)] items-center justify-center border-t border-[var(--border)] bg-[var(--background)] px-4 pb-[env(safe-area-inset-bottom)] text-xs text-[var(--muted)] sm:text-sm"
      >
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-full items-center rounded-sm px-3 transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          鲁ICP备2026043859号-1
        </a>
      </footer>
    </div>
  );
}
