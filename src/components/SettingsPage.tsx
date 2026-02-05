import { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Globe, Download, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportFullReportPDF, downloadCSV } from '@/lib/exportUtils';

// Storage keys for preferences
const PREFS_KEY = 'cropprice_preferences';

interface UserPreferences {
  notifications: boolean;
  priceAlerts: boolean;
  weeklyReports: boolean;
  language: string;
  currency: string;
}

const defaultPrefs: UserPreferences = {
  notifications: true,
  priceAlerts: true,
  weeklyReports: false,
  language: 'en',
  currency: 'inr',
};

export const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPrefs);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem(PREFS_KEY);
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    setSaveStatus('saving');
    localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 300);
  };

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    savePreferences({ ...preferences, [key]: value });
  };

  // Export user data functionality
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch user's profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id || '')
        .single();

      // Export user data as CSV
      const userData = [{
        'User ID': user?.id || 'N/A',
        'Email': user?.email || 'N/A',
        'Display Name': profileData?.display_name || 'N/A',
        'Farm Name': profileData?.farm_name || 'N/A',
        'Location': profileData?.location || 'N/A',
        'Created At': profileData?.created_at || 'N/A',
        'Preferences - Notifications': preferences.notifications ? 'Enabled' : 'Disabled',
        'Preferences - Price Alerts': preferences.priceAlerts ? 'Enabled' : 'Disabled',
        'Preferences - Weekly Reports': preferences.weeklyReports ? 'Enabled' : 'Disabled',
        'Preferences - Language': preferences.language,
        'Preferences - Currency': preferences.currency,
      }];
      
      downloadCSV(userData, 'my_cropprice_data');
      
      // Also export a full market report
      await exportFullReportPDF([]);
      
      toast.success('Your data has been exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete account functionality
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user's profile data first
      if (user?.id) {
        await supabase
          .from('profiles')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Clear local preferences
      localStorage.removeItem(PREFS_KEY);
      
      // Sign out user
      await signOut();
      
      toast.success('Your account data has been deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Request notification permission
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Please enable notifications in your browser settings');
        return;
      }
      toast.success('Notifications enabled! You\'ll receive price alerts.');
    }
    updatePref('notifications', enabled);
  };

  const handlePriceAlertToggle = (enabled: boolean) => {
    updatePref('priceAlerts', enabled);
    if (enabled) {
      toast.success('Price alerts enabled! You\'ll be notified of significant price changes.');
    } else {
      toast.info('Price alerts disabled.');
    }
  };

  const handleWeeklyReportToggle = (enabled: boolean) => {
    updatePref('weeklyReports', enabled);
    if (enabled) {
      toast.success('Weekly reports enabled! Check your email every Monday.');
    } else {
      toast.info('Weekly reports disabled.');
    }
  };

  const handleLanguageChange = (lang: string) => {
    updatePref('language', lang);
    toast.success(`Language changed to ${getLanguageName(lang)}`);
  };

  const handleCurrencyChange = (curr: string) => {
    updatePref('currency', curr);
    toast.success(`Currency changed to ${getCurrencyName(curr)}`);
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi',
      gu: 'Gujarati',
      pa: 'Punjabi',
    };
    return languages[code] || code;
  };

  const getCurrencyName = (code: string) => {
    const currencies: Record<string, string> = {
      inr: 'Indian Rupee (₹)',
      usd: 'US Dollar ($)',
    };
    return currencies[code] || code;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>
        {saveStatus !== 'idle' && (
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveStatus === 'saved' && <Check className="h-4 w-4 text-success" />}
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications" className="text-foreground">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive price updates on your device</p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={handleNotificationToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="priceAlerts" className="text-foreground">Price Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when prices change significantly</p>
            </div>
            <Switch
              id="priceAlerts"
              checked={preferences.priceAlerts}
              onCheckedChange={handlePriceAlertToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weeklyReports" className="text-foreground">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Receive weekly market summary emails</p>
            </div>
            <Switch
              id="weeklyReports"
              checked={preferences.weeklyReports}
              onCheckedChange={handleWeeklyReportToggle}
            />
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Localization</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={preferences.language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={preferences.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inr">₹ Indian Rupee (INR)</SelectItem>
                <SelectItem value="usd">$ US Dollar (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Data & Privacy</h3>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your data is securely stored and never shared with third parties. 
            We use industry-standard encryption to protect your information.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Data
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    data, preferences, and remove your profile from our servers.
                    You will be signed out after deletion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">About CropPrice</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Version 1.0.0</p>
          <p>
            CropPrice uses advanced machine learning algorithms including Random Forest 
            and TensorFlow to predict crop prices with high accuracy.
          </p>
          <div className="flex gap-4 pt-2">
            <a 
              href="https://example.com/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                toast.info('Terms of Service page coming soon');
              }}
            >
              Terms of Service
            </a>
            <a 
              href="https://example.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                toast.info('Privacy Policy page coming soon');
              }}
            >
              Privacy Policy
            </a>
            <a 
              href="mailto:support@cropprice.app" 
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                // Copy email to clipboard
                navigator.clipboard.writeText('support@cropprice.app');
                toast.success('Email address copied to clipboard: support@cropprice.app');
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account ID:</span>
              <span className="text-foreground font-mono text-xs">{user.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sign In:</span>
              <span className="text-foreground">
                {user.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
