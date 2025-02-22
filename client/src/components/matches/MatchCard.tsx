import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Match } from '@shared/schema';
import { format } from 'date-fns';

interface MatchCardProps {
  match: Match;
  onEdit: (match: Match) => void;
  onDelete: (id: number) => void;
}

export default function MatchCard({ match, onEdit, onDelete }: MatchCardProps) {
  return (
    <Card className="bg-[#212121] text-white rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{match.homeTeam} vs {match.awayTeam}</h3>
          <span className="text-[#6ab100]">{match.status}</span>
        </div>

        <div className="space-y-2 text-[#787878]">
          <p>Venue: {match.venue}</p>
          <p>Date: {format(new Date(match.date), 'PPP')}</p>
          <p>Time: {format(new Date(match.date), 'p')}</p>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onEdit(match)}
            className="flex-1"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(match.id)}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
