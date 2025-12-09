import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTeamsByLeague, fetchPopularLeagues, fetchAllPopularTeams, searchTeams, type Team, type League } from "@/lib/apiFootball";

interface TeamSelectorProps {
  value?: {
    id: number;
    name: string;
    logo: string;
  };
  onValueChange: (team: { id: number; name: string; logo: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TeamSelector({ value, onValueChange, placeholder = "Select team...", disabled }: TeamSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch popular leagues
  const { data: leagues = [], isLoading: loadingLeagues } = useQuery({
    queryKey: ['/api/football/leagues'],
    queryFn: fetchPopularLeagues,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch all popular teams by default
  const { data: allTeams = [], isLoading: loadingAllTeams, error: allTeamsError } = useQuery({
    queryKey: ['/api/football/teams/all'],
    queryFn: fetchAllPopularTeams,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // Don't retry on rate limit errors
  });

  // Fetch teams by league (when filtering)
  const { data: leagueTeams = [], isLoading: loadingLeagueTeams, error: leagueTeamsError } = useQuery({
    queryKey: ['/api/football/teams', selectedLeague],
    queryFn: () => selectedLeague ? fetchTeamsByLeague(selectedLeague) : Promise.resolve([]),
    enabled: !!selectedLeague,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // Don't retry on rate limit errors
  });

  // Search teams by name
  const { data: searchResults = [], isLoading: loadingSearch, error: searchError } = useQuery({
    queryKey: ['/api/football/teams/search', searchQuery],
    queryFn: () => searchQuery.length >= 2 ? searchTeams(searchQuery) : Promise.resolve([]),
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on rate limit errors
  });

  const teams = searchQuery.length >= 2 ? searchResults : (selectedLeague ? leagueTeams : allTeams);
  const isLoading = loadingLeagues || loadingAllTeams || loadingLeagueTeams || loadingSearch;

  const handleTeamSelect = (team: Team) => {
    onValueChange({
      id: team.id,
      name: team.name,
      logo: team.logo
    });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-[#212121] border-[#3b3b3b] text-white hover:bg-[#2b2b2b]"
            disabled={disabled}
          >
            {value ? (
              <div className="flex items-center gap-2">
                <img 
                  src={value.logo} 
                  alt={value.name}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>{value.name}</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-[#212121] border-[#3b3b3b]" align="start">
          <Command className="bg-[#212121]">
            <div className="flex items-center border-b border-[#3b3b3b] px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-white" />
              <CommandInput
                placeholder="Search teams..."
                className="flex h-11 w-full bg-transparent py-3 text-sm text-white placeholder:text-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList className="max-h-[300px] overflow-y-auto">
              {!searchQuery && (
                <div className="p-2 border-b border-[#3b3b3b]">
                  <Select 
                    value={selectedLeague?.toString() || "all"} 
                    onValueChange={(value) => setSelectedLeague(value === "all" ? null : parseInt(value))}
                  >
                    <SelectTrigger className="w-full bg-[#2b2b2b] border-[#3b3b3b] text-white">
                      <SelectValue placeholder="Filter by league..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2b2b2b] border-[#3b3b3b]">
                      <SelectItem value="all">All Leagues</SelectItem>
                      {loadingLeagues ? (
                        <SelectItem value="loading" disabled>Loading leagues...</SelectItem>
                      ) : (
                        leagues.map((league: League) => (
                          <SelectItem key={league.id} value={league.id.toString()}>
                            <div className="flex items-center gap-2">
                              <img 
                                src={league.logo} 
                                alt={league.name}
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <span className="text-white">{league.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {isLoading ? (
                <CommandEmpty className="text-gray-400 p-4">Loading teams...</CommandEmpty>
              ) : allTeamsError || leagueTeamsError || searchError ? (
                <CommandEmpty className="text-gray-400 p-4">
                  {(allTeamsError as any)?.isRateLimit || (leagueTeamsError as any)?.isRateLimit || (searchError as any)?.isRateLimit
                    ? "API rate limit reached. Please try again tomorrow or upgrade your API plan."
                    : "Error loading teams. Please try again later."}
                </CommandEmpty>
              ) : teams.length === 0 ? (
                <CommandEmpty className="text-gray-400 p-4">
                  {searchQuery.length >= 2 
                    ? "No teams found matching your search."
                    : selectedLeague 
                      ? "No teams found for selected league."
                      : "Select a league or search for teams."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {teams.map((team: Team) => (
                    <CommandItem
                      key={team.id}
                      value={team.name}
                      onSelect={() => handleTeamSelect(team)}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#2b2b2b] text-white"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.id === team.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <img 
                        src={team.logo} 
                        alt={team.name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{team.name}</span>
                        {team.country && (
                          <span className="text-xs text-gray-400">{team.country}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}