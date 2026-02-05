import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminPriceManager } from '@/components/AdminPriceManager';
import { AdminCropManager } from '@/components/AdminCropManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/admin-login');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Data refreshed');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive text-destructive-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <h2 className="font-semibold text-sm mb-1">Admin Capabilities</h2>
            <p className="text-sm text-muted-foreground">
              As an admin, you can <strong>update current prices</strong> and <strong>add new crops</strong>. 
              Predicted prices, trends, and confidence scores are automatically calculated by the ML model 
              when you update current prices.
            </p>
          </div>

          <Tabs defaultValue="prices" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prices">Update Prices</TabsTrigger>
              <TabsTrigger value="crops">Manage Crops</TabsTrigger>
            </TabsList>

            <TabsContent value="prices">
              <AdminPriceManager key={`prices-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="crops">
              <AdminCropManager key={`crops-${refreshKey}`} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
