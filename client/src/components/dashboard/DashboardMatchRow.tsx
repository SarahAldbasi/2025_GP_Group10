import { useState } from "react";
import type { Match } from "@/lib/firestore";
import type { InsertMatch } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MatchCard from "@/components/matches/MatchCard";

type Props = {
  match: Match;
  onEdit?: (m: InsertMatch & { id?: string }) => void;
  onDelete?: (m: InsertMatch & { id?: string }) => void;
};

export default function DashboardMatchRow({ match, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);

  // Defaults: if you don’t pass handlers, redirect to /matches for edit/delete
  const handleEdit = onEdit ?? (() => (window.location.href = "/matches"));
  const handleDelete = onDelete ?? (() => (window.location.href = "/matches"));

  // Coerce to MatchCard’s expected type
  const cardMatch = match as unknown as InsertMatch & { id?: string };

  const home = match.homeTeam;
  const away = match.awayTeam;

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#2e2e2e] bg-[#1f1f1f] px-3 py-2">
      {/* teams */}
      <div className="flex items-center gap-3 min-w-0">
        <TeamChip name={home?.name || "Home"} logo={home?.logo} />
        <span className="text-sm text-gray-400">vs</span>
        <TeamChip name={away?.name || "Away"} logo={away?.logo} />
      </div>

      {/* EXACT same view button behavior as old card: eye icon opens dialog */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 hover:bg-[#3a3a3a]"
        aria-label="View"
        title="View"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Details dialog (reuses MatchCard) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Match Details</DialogTitle>
            <DialogDescription>
              Full details for the match between {home?.name} and {away?.name}
            </DialogDescription>
          </DialogHeader>
          <MatchCard
            match={cardMatch}
            onEdit={(m) => {
              setOpen(false);
              handleEdit(m);
            }}
            onDelete={(m) => {
              setOpen(false);
              handleDelete(m);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamChip({ name, logo }: { name: string; logo?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {logo ? (
        <img src={logo} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <div className="h-6 w-6 rounded-full bg-[#2f2f2f]" />
      )}
      <span className="truncate text-sm text-white max-w-[9rem]">{name}</span>
    </div>
  );
}
