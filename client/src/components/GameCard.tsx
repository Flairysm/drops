import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GameCardProps {
  name: string;
  description: string;
  cost: string;
  maxPayout: string;
  color: string;
  icon: React.ReactNode;
  onPlay: () => void;
  isPlaying?: boolean;
}

export function GameCard({
  name,
  description,
  cost,
  maxPayout,
  color,
  icon,
  onPlay,
  isPlaying = false,
}: GameCardProps) {
  return (
    <Card className="gaming-card hover:glow-effect transition-all transform hover:scale-105 group">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="w-full h-48 rounded-lg mb-6 overflow-hidden bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative flex items-center justify-center">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
              {icon}
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex justify-center">
                <Badge className={`bg-gradient-to-r ${color} text-white`}>
                  Ready to Play
                </Badge>
              </div>
            </div>
          </div>
          
          <h3 className="font-gaming font-bold text-xl mb-3 text-primary">{name}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm">Cost per play:</span>
              <span className="font-semibold text-accent">{cost} Credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Max payout:</span>
              <span className="font-semibold text-legendary">{maxPayout}</span>
            </div>
          </div>
          
          <Button
            className={`w-full bg-gradient-to-r ${color} text-white hover:glow-effect transition-all`}
            onClick={onPlay}
            disabled={isPlaying}
            data-testid={`button-play-${name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isPlaying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Playing...
              </>
            ) : (
              <>
                {icon}
                <span className="ml-2">Play {name.split(' ')[0]}</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
