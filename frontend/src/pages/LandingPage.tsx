import { useState, useEffect } from 'react';
import { Navbar } from '../components/Landing/Navbar';
import { HeroSection } from '../components/Landing/HeroSection';
import { ProblemSolution } from '../components/Landing/ProblemSolution';
import { FeaturesSection } from '../components/Landing/FeaturesSection';
import { HowItWorks } from '../components/Landing/HowItWorks';
import { BottomCTA } from '../components/Landing/BottomCTA';
import { Footer } from '../components/Landing/Footer';

export function LandingPage() {
  // Defaulting to Dark Mode for the premium tech aesthetic as suggested
  const [isDark, setIsDark] = useState<boolean>(true);

  // Set the document title on page load
  useEffect(() => {
    document.title = 'Emberpath – Giám Sát An Toàn & Sơ Tán Thông Minh';
  }, []);

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
        isDark ? 'dark bg-[#0F172A] text-slate-100' : 'bg-white text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Navbar */}
      <Navbar isDark={isDark} setIsDark={setIsDark} />

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
