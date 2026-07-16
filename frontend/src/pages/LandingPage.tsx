import { useEffect } from 'react';
import { Navbar } from '../components/Landing/Navbar';
import { HeroSection } from '../components/Landing/HeroSection';
import { ProblemSolution } from '../components/Landing/ProblemSolution';
import { FeaturesSection } from '../components/Landing/FeaturesSection';
import { HowItWorks } from '../components/Landing/HowItWorks';
import { BottomCTA } from '../components/Landing/BottomCTA';
import { Footer } from '../components/Landing/Footer';
import { useThemeStore } from '../store/themeStore';

export function LandingPage() {
  const { darkMode } = useThemeStore();

  // Set the document title on page load
  useEffect(() => {
    document.title = 'Emberpath – Giám Sát An Toàn & Sơ Tán Thông Minh';
  }, []);

  // Sync dark class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const isDark = darkMode;

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
        isDark ? 'dark bg-[#0F172A] text-slate-100' : 'bg-white text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Navbar */}
      <Navbar isDark={isDark} />

      {/* Hero Section */}
      <HeroSection isDark={isDark} />

      {/* Problem & Solution */}
      <ProblemSolution isDark={isDark} />

      {/* Key Features */}
      <FeaturesSection isDark={isDark} />

      {/* How It Works (Emergency Operation Journey) */}
      <HowItWorks isDark={isDark} />

      {/* Bottom CTA */}
      <BottomCTA isDark={isDark} />

      {/* Footer */}
      <Footer isDark={isDark} />
    </div>
  );
}
