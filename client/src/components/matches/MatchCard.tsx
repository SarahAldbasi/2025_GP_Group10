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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'text-green-500';
      case 'ended':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const generateTeamInitials = (teamName: string) => {
    return teamName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const getTeamLogoUrl = (teamName: string) => {
    const sanitizedName = teamName.toLowerCase().replace(/\s+/g, '-');
    return `/team-logos/${sanitizedName}.svg`;
  };

  return (
    <Card className="bg-[#212121] text-white rounded-xl">
      <CardContent className="p-6">
        <div className="mb-4">
          <span className={`${getStatusColor(match.status)} font-medium text-sm`}>
            {match.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2">
              <div className="relative w-12 h-12">
                <img 
                  src={getTeamLogoUrl(match.homeTeam)}
                  alt={match.homeTeam}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    const initials = generateTeamInitials(match.homeTeam);
                    target.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                        <text x="50" y="50" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
                      </svg>
                    `)}`;
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-center">{match.homeTeam}</span>
          </div>

          <div className="mx-4 text-xl font-bold text-gray-400">VS</div>

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2">
              <div className="relative w-12 h-12">
                <img 
                  src={getTeamLogoUrl(match.awayTeam)}
                  alt={match.awayTeam}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    const initials = generateTeamInitials(match.awayTeam);
                    target.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                        <text x="50" y="50" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
                      </svg>
                    `)}`;
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-center">{match.awayTeam}</span>
          </div>
        </div>

        <div className="space-y-2 text-[#787878] text-sm">
          <p>League: {match.league}</p>
          <p>Venue: {match.venue}</p>
          <p>Date: {format(new Date(match.date), 'PPP')}</p>
          <p>Time: {format(new Date(match.date), 'p')}</p>
          <p>Main Referee: {match.mainReferee}</p>
          {match.assistantReferee1 && <p>Assistant Referee 1: {match.assistantReferee1}</p>}
          {match.assistantReferee2 && <p>Assistant Referee 2: {match.assistantReferee2}</p>}
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