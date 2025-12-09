import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MatchForm from "@/components/matches/MatchForm";
import { createMatch, getBalls, getReferees } from "@/lib/firestore";
import { type InsertMatch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AddMatchButton() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: referees } = useQuery({ queryKey: ["referees"], queryFn: getReferees });
 const { data: balls = [] } = useQuery({
    queryKey: ["balls"],
    queryFn: getBalls,
  });
  const handleSubmit = async (data: InsertMatch) => {
    try {
      const matchData: any = {
        venue: data.venue,
        date: data.date,
        league: data.league,
        status: data.status,
        matchCode: data.matchCode,
        homeTeam: { name: data.homeTeam.name, logo: data.homeTeam.logo || "" },
        awayTeam: { name: data.awayTeam.name, logo: data.awayTeam.logo || "" },
        mainReferee: { id: data.mainReferee.id, name: data.mainReferee.name, image: data.mainReferee.image || "" },
        assistantReferee1: data.assistantReferee1
          ? { id: data.assistantReferee1.id, name: data.assistantReferee1.name, image: data.assistantReferee1.image || "" }
          : undefined,
        assistantReferee2: data.assistantReferee2
          ? { id: data.assistantReferee2.id, name: data.assistantReferee2.name, image: data.assistantReferee2.image || "" }
          : undefined,
      };
      await createMatch(matchData);
      toast({ title: "Match created successfully" });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      let errorMessage = "Failed to create match";
      if (e?.code === "DUPLICATE_MATCH") {
        errorMessage = "Match already exists";
      } else if (e?.code === "DUPLICATE_MATCH_DIFFERENT_VENUE") {
        errorMessage = "A match with the same teams at the same time already exists at a different venue";
      } else if (e?.code === "DUPLICATE_MATCH_SAME_TEAM") {
        errorMessage = "A match with the same team at the same venue, date, and time already exists";
      } else if (e?.message) {
        errorMessage = e.message;
      }
      toast({ variant: "destructive", title: "Failed to create match", description: errorMessage });
    }
  };

  return (
    <>
      {/* Stat-style card wrapper for consistent look */}
      <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm">
        <CardContent className="p-6">
          <Button onClick={() => setOpen(true)} className="bg-[#6ab100] hover:bg-[#5a9700] w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Match
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#212121] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-[#212121] pb-4 z-10">
            <DialogTitle>Add New Match</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the match details below.
            </DialogDescription>
          </DialogHeader>
          <div className="px-1">
            <MatchForm onSubmit={handleSubmit} defaultValues={undefined} referees={referees} balls={balls} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
