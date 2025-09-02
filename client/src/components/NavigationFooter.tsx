import { Home, Gamepad2, Package, User } from "lucide-react";
import { Link } from "wouter";

export function NavigationFooter() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg floating-nav">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around items-center py-3 px-4">
          {/* Home */}
          <Link href="/" className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Play/Games */}
          <Link href="/play" className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
            <Gamepad2 className="w-5 h-5" />
            <span className="text-xs font-medium">Play</span>
          </Link>

          {/* Packs */}
          <Link href="/my-packs" className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
            <Package className="w-5 h-5" />
            <span className="text-xs font-medium">Packs</span>
          </Link>

          {/* Vault */}
          <Link href="/vault" className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Vault</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
