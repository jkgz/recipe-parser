import type { Metadata } from "next";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Family Recipes",
  description: "A personal recipe catalog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Our Family Recipes</Link>
          </nav>
          <AuthButton />
        </header>
        <main>{children}</main>
        <footer>
          <p>&copy; {new Date().getFullYear()} Our Family Recipes</p>
        </footer>
      </body>
    </html>
  );
}
