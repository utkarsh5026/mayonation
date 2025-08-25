import { useState } from "react";
import {
  HeroSection,
  Footer,
  InstallationSection,
  ExamplesSection,
  APISection,
  DemoSection,
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
            <FeaturesSection />
            <DemoSection />
            <APISection />
            <ExamplesSection />
            <InstallationSection />
          </>
        )}
        {activeSection === "Features" && <FeaturesSection />}
        {activeSection === "Demos" && <DemoSection />}
        {activeSection === "API" && <APISection />}
        {activeSection === "Examples" && <ExamplesSection />}
        {activeSection === "Installation" && <InstallationSection />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
