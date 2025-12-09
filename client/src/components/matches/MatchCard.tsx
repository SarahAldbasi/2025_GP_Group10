import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InsertMatch } from '@shared/schema';
import { format, differenceInDays } from 'date-fns';

interface MatchCardProps {
  match: InsertMatch & { id?: string };
  onEdit: (match: InsertMatch & { id?: string }) => void;
  onDelete: (match: InsertMatch & { id?: string }) => void;
}

export default function MatchCard({ match, onEdit, onDelete }: MatchCardProps) {
  const getStatusDisplay = (status: string, date: Date) => {
    switch (status) {
      case 'live':
        return {
          text: 'Live',
          className: 'bg-red-500'
        };
      case 'ended':
        return {
          text: 'Ended',
          className: 'bg-gray-500'
        };
      case 'upcoming':
        return {
          text: 'Upcoming',
          className: 'bg-amber-500'  // Changed color to distinguish from regular matches
        };
      case 'not_started':
      default:
        return {
          text: 'Not Started',
          className: 'bg-[#6ab100]'
        };
    }
  };

  const generateTeamInitials = (teamName: string) => {
    return teamName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const statusInfo = getStatusDisplay(match.status, match.date);

  return (
    <Card className="bg-[#212121] text-white rounded-xl">
      <div className="flex justify-center">
        <div className={`${statusInfo.className} w-32 py-1 rounded-b-xl text-white text-sm font-medium text-center`}>
          {statusInfo.text}
        </div>
      </div>

      <CardContent className="p-6">
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2">
              <div className="relative w-12 h-12">
                <img 
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    const initials = generateTeamInitials(match.homeTeam.name);
                    // Simplified SVG with better accessibility
                    target.src = `data:image/svg+xml,${encodeURIComponent(
                      `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                        <text x="50" y="55" font-family="Arial" font-size="24" fill="white" text-anchor="middle">${initials}</text>
                      </svg>`
                    )}`;
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-center">{match.homeTeam.name}</span>
          </div>

          <div className="mx-4 text-xl font-bold text-gray-400">VS</div>

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2">
              <div className="relative w-12 h-12">
                <img 
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    const initials = generateTeamInitials(match.awayTeam.name);
                    // Simplified SVG with better accessibility
                    target.src = `data:image/svg+xml,${encodeURIComponent(
                      `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                        <text x="50" y="55" font-family="Arial" font-size="24" fill="white" text-anchor="middle">${initials}</text>
                      </svg>`
                    )}`;
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-center">{match.awayTeam.name}</span>
          </div>
        </div>

        <div className="space-y-2 text-[#787878] text-sm">
        {/* {match.matchCode && (
            <p className="font-medium text-[#6ab100]">Match Code: {match.matchCode}</p>
          )} */}
          <p>Match Code: {match.matchCode}</p>
          <p>League: {match.league}</p>
          <p>Venue: {match.venue}</p>
          <p>Date: {format(new Date(match.date), 'PPP')}</p>
          <p>Time: {format(new Date(match.date), 'p')}</p>
          <p>Main Referee: {match.mainReferee.name}</p>
          {match.assistantReferee1 && <p>Assistant Referee 1: {match.assistantReferee1.name}</p>}
          {match.assistantReferee2 && <p>Assistant Referee 2: {match.assistantReferee2.name}</p>}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onEdit(match)}
            className="flex-1 bg-[#6ab100]"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(match)}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
