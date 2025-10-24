import { Home, Gamepad2, Package, User, RotateCcw } from "lucide-react";
import { Link } from "wouter";

export function NavigationFooter() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B12]/95 backdrop-blur-xl border-t border-[#26263A]/50 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around items-center py-2 px-4 safe-area-pb">
          {/* Home */}
          <Link href="/home" className="btn-mobile-optimized flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors min-h-[48px] min-w-[48px] justify-center">
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Reload */}
          <Link href="/reload" className="btn-mobile-optimized flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors min-h-[48px] min-w-[48px] justify-center">
            <RotateCcw className="w-5 h-5" />
            <span className="text-xs font-medium">Reload</span>
          </Link>

          {/* Play - Direct Link */}
          <Link href="/play" className="btn-mobile-optimized flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors min-h-[48px] min-w-[48px] justify-center">
            <div className="w-10 h-10 bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:shadow-[0_0_30px_rgba(124,58,237,0.8)] transition-all duration-300 hover:scale-105">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium">Play</span>
          </Link>

          {/* My Packs */}
          <Link href="/my-packs" className="btn-mobile-optimized flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors min-h-[48px] min-w-[48px] justify-center">
            <Package className="w-5 h-5" />
            <span className="text-xs font-medium">My Packs</span>
          </Link>

          {/* Vault */}
          <Link href="/vault" className="btn-mobile-optimized flex flex-col items-center space-y-1 text-[#9CA3AF] hover:text-[#22D3EE] transition-colors min-h-[48px] min-w-[48px] justify-center">
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Vault</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
