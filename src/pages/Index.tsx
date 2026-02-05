import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { ProfitCalculator } from '@/components/ProfitCalculator';
import { CropDatabase } from '@/components/CropDatabase';
import { MarketTrends } from '@/components/MarketTrends';
import { RegionalData } from '@/components/RegionalData';
import { SettingsPage } from '@/components/SettingsPage';
import { HelpPage } from '@/components/HelpPage';


const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'predictions':
        return <Dashboard />;
      case 'trends':
        return <MarketTrends />;
      case 'crops':
        return <CropDatabase />;
      case 'calculator':
        return <ProfitCalculator />;
      case 'regions':
        return <RegionalData />;
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} onNavigate={setActiveTab} />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
