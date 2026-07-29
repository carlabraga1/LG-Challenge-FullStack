import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
