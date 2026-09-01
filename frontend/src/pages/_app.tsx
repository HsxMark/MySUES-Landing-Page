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
    <main className={ibmPlexMono.variable}>
      <Component {...pageProps} />
    </main>
  );
}
