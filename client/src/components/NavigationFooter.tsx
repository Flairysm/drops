import { Home, Gamepad2, Package, User, RotateCcw } from "lucide-react";
import { Link } from "wouter";

export function NavigationFooter() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B12]/95 backdrop-blur-xl border-t border-[#26263A]/50 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around items-center py-3 px-4">
          {/* Home */}
          <Link href="/home" className="flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Reload */}
          <Link href="/reload" className="flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors">
            <RotateCcw className="w-5 h-5" />
            <span className="text-xs font-medium">Reload</span>
          </Link>

          {/* Play - Direct Link */}
          <Link href="/play" className="flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors">
            <div className="w-12 h-12 bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:shadow-[0_0_30px_rgba(124,58,237,0.8)] transition-all duration-300 hover:scale-105">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium">Play</span>
          </Link>

          {/* My Packs */}
          <Link href="/my-packs" className="flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors">
            <Package className="w-5 h-5" />
            <span className="text-xs font-medium">My Packs</span>
          </Link>

          {/* Vault */}
          <Link href="/vault" className="flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors">
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Vault</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
