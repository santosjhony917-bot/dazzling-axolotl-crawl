import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";

interface MetricsCardProps {
  visitors: number;
  followers: number;
  className?: string;
}

export const MetricsCard = ({ visitors, followers, className }: MetricsCardProps) => {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Users className="h-8 w-8 text-primary mb-2" />
          <span className="text-2xl font-bold">{visitors}</span>
          <span className="text-xs text-muted-foreground">Visitantes</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <UserPlus className="h-8 w-8 text-primary mb-2" />
          <span className="text-2xl font-bold">{followers}</span>
          <span className="text-xs text-muted-foreground">Seguidores</span>
        </CardContent>
      </Card>
    </div>
  );
};
