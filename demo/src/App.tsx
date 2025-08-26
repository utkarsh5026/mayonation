import { useState } from "react";
import {
  HeroSection,
  Footer,
  InstallationSection,
  ExamplesSection,
  APISection,
  Navigation,
  FeaturesSection,
} from "./components";

function App() {
  const [activeSection, setActiveSection] = useState("Hero");

  return (
    <div className="bg-black text-white min-h-screen font-source-code-pro">
      <Navigation
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <main>
        {activeSection === "Hero" && (
          <>
            <HeroSection />
            <ExamplesSection />
            <APISection />
            <InstallationSection />
            <FeaturesSection />
          </>
        )}
        {activeSection === "API" && <APISection />}
        {activeSection === "Examples" && <ExamplesSection />}
        {activeSection === "Installation" && <InstallationSection />}
        {activeSection === "Features" && <FeaturesSection />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
