import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { InsertMatch } from "@shared/schema";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MatchCard from "./MatchCard";
import { log } from "console";

interface Ball {
  id: string;
  Locaiton: string; 
  isActive: boolean;
  matchId?: string; 
}

interface MinimizedMatchCardProps {
  match: InsertMatch & { id?: string };
  balls?: Ball[];
  onEdit: (match: InsertMatch & { id?: string }) => void;
  onDelete: (match: InsertMatch & { id?: string }) => void;
}

export default function MinimizedMatchCard({ match, balls, onEdit, onDelete }: MinimizedMatchCardProps) {
 console.log(balls ,"balls");
console.log(match ,"match");
 
  const [showFullDetails, setShowFullDetails] = useState(false);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "live": return { text: "Live", className: "bg-red-500" };
      case "ended": return { text: "Ended", className: "bg-gray-500" };
      case "upcoming": return { text: "Upcoming", className: "bg-amber-500" };
      case "not_started":
      default: return { text: "Not Started", className: "bg-[#6ab100]" };
    }
  };

  const generateTeamInitials = (teamName: string) =>
    teamName
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase();

  const statusInfo = getStatusDisplay(match.status);

  // فلترة الكرات الخاصة بالماتش الحالي (لو فيه matchId)
const matchBalls = balls?.filter(ball => ball.matchId === match.id) || [];


  return (
    <>
      <Card className="bg-[#212121] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Teams Section */}
            <div className="flex items-center space-x-3 flex-1">
              {/* Home Team */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <img
                    src={match.homeTeam.logo}
                    alt={match.homeTeam.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      const initials = generateTeamInitials(match.homeTeam.name);
                      target.src = `data:image/svg+xml,${encodeURIComponent(
                        `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                          <text x="50" y="55" font-family="Arial" font-size="30" fill="white" text-anchor="middle">${initials}</text>
                        </svg>`
                      )}`;
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{match.homeTeam.name}</span>
              </div>

              <span className="text-gray-400 text-sm">vs</span>

              {/* Away Team */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <img
                    src={match.awayTeam.logo}
                    alt={match.awayTeam.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      const initials = generateTeamInitials(match.awayTeam.name);
                      target.src = `data:image/svg+xml,${encodeURIComponent(
                        `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" r="45" fill="#6ab100"/>
                          <text x="50" y="55" font-family="Arial" font-size="30" fill="white" text-anchor="middle">${initials}</text>
                        </svg>`
                      )}`;
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{match.awayTeam.name}</span>
              </div>
            </div>

            {/* Status + Actions */}
            <div className="flex items-center space-x-3">
              <div className={`${statusInfo.className} px-3 py-1 rounded-full text-white text-xs font-medium`}>
                {statusInfo.text}
              </div>
              <div className="text-sm text-gray-400">{format(new Date(match.date), "MMM dd, yyyy")}</div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" onClick={() => setShowFullDetails(true)} className="h-8 w-8 p-0 hover:bg-[#3a3a3a]">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(match)} className="h-8 w-8 p-0 hover:bg-[#3a3a3a]">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(match)} className="h-8 w-8 p-0 hover:bg-red-900">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Balls Section as badges */}
          {/* Balls Section as badges */}
          
{matchBalls.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    
    {matchBalls.map(ball => (
      <span
        key={ball.id}
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          ball.isActive ? "bg-green-500 text-white" : "bg-red-500 text-gray-200"
        }`}
      >
        {ball.Locaiton || `Ball ${ball.id}`}
      </span>
    ))}
  </div>
)}
        </CardContent>
      </Card>

      {/* Full Details Dialog */}
      <Dialog open={showFullDetails} onOpenChange={setShowFullDetails}>
        <DialogContent className="max-w-md p-0 bg-transparent border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Match Details</DialogTitle>
            <DialogDescription>
              Full details for the match between {match.homeTeam.name} and {match.awayTeam.name}
            </DialogDescription>
          </DialogHeader>
          <MatchCard
            match={match}
            // balls={matchBalls} // ← تمرير نفس الكرات للـ MatchCard
            onEdit={(match) => { setShowFullDetails(false); onEdit(match); }}
            onDelete={(match) => { setShowFullDetails(false); onDelete(match); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
