import ErrorBoundary from "../components/common/ErrorBoundary";
import { useScrollToHash } from "../hooks/useScrollToHash";
import ActivityFeed from "../components/home/ActivityFeed";
import Categories from "../components/home/Categories";
import CTA from "../components/home/CTA";
import FeaturedInvestors from "../components/home/FeaturedInvestors";
import FeaturedStartups from "../components/home/FeaturedStartups";
import Features from "../components/home/Features";
import Hero from "../components/home/Hero";
import HowItWorks from "../components/home/HowItWorks";
import Opportunities from "../components/home/Opportunities";
import Partners from "../components/home/Partners";
import SearchSection from "../components/home/SearchSection";
import StatsSection from "../components/home/StatsSection";
import Testimonials from "../components/home/Testimonials";

export default function Home() {
  useScrollToHash();

  return (
    <main>
      <Hero />
      <SearchSection />
      <ErrorBoundary><StatsSection /></ErrorBoundary>
      <ErrorBoundary><FeaturedStartups /></ErrorBoundary>
      <ErrorBoundary><FeaturedInvestors /></ErrorBoundary>
      <ErrorBoundary><Categories /></ErrorBoundary>
      <HowItWorks />
      <Features />
      <ErrorBoundary><Testimonials /></ErrorBoundary>
      <ErrorBoundary><ActivityFeed /></ErrorBoundary>
      <ErrorBoundary><Opportunities /></ErrorBoundary>
      <ErrorBoundary><Partners /></ErrorBoundary>
      <CTA />
    </main>
  );
}
