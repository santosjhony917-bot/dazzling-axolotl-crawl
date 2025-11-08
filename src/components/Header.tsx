import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">MyApp</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/favorites">Favorites</Link>
          </nav>
        </div>
        <div>
          {user ? (
            <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
          ) : (
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;