import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
const base = "https://dough.collegefootballrisk.com/api";

interface Team {
  seasons: number[];
}

interface TeamOdds {
  territory: string;
  winner: string;
  chance: number;
  combined_info?: string;
}

interface TerritoryTeam {
  team: string;
  players: number;
  power: number;
}

interface TerritoryData {
  teams: TerritoryTeam[];
}

const App = () => {
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [team, setTeam] = useState<string>("");
  const [teams, setTeams] = useState<{ name: string; id: number }[]>([]);
  const [mvpPlayers, setMvpPlayers] = useState<string[]>([]);
  const [defendTerritories, setDefendTerritories] = useState<string[]>([]);
  const [attackTerritories, setAttackTerritories] = useState<string[]>([]);
  const [odds, setOdds] = useState<{ territory: string; winner: string; chance: number; combined_info: string }[]>([]);

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const { data } = await axios.get<Team[]>(`${base}/teams`);
        const allSeasons = Array.from(new Set(data.flatMap((team) => team.seasons)))
          .sort((a, b) => a - b); // Now TypeScript knows a and b are numbers
        setSeasons(allSeasons);
      } catch (error) { console.error("Error fetching seasons", error); }
    };
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (!season) return;
    const fetchTeams = async () => {
      try {
        const { data } = await axios.get(`${base}/teams`);
        setTeams(
          data
            .filter((team: { seasons: number[] }) => team.seasons.includes(season))
            .map((team: { name: string; id: number }) => ({ name: team.name, id: team.id }))
            .sort((a: { name: string; id: number }, b: { name: string; id: number }) => a.name.localeCompare(b.name))
        );
      } catch (error) {
        console.error("Error fetching teams", error);
        setTeams([]);
      }
    };
    fetchTeams();
  }, [season]);
  

  const fetchData = async () => {
    if (!team) return console.warn("Team is required");
    await Promise.all([fetchMvpPlayers(), fetchLegalMoves(), fetchOdds()]);
  };

  const fetchLegalMoves = async () => {
    if (!season || !day || !team) return;
    try {
      const { defend, attack } = await getLegalMoves(season, day + 1, team);
      setDefendTerritories(defend);
      setAttackTerritories(attack);
    } catch (error) { console.error("Error fetching legal moves:", error); }
  };

  const fetchMvpPlayers = async () => {
    try {
      const { data } = await axios.get(`${base}/team/players`, { params: { team, season, day } });
      setMvpPlayers(data.filter((entry: any) => entry.mvp).map((entry: any) => entry.player.replace(/\$0$/, "")).sort());
    } catch (error) { console.error("Error fetching MVP players", error); setMvpPlayers([]); }
  };

  const fetchOdds = async () => {
    if (!season || !day || !team) return;
    try {
      const { data } = await axios.get<TeamOdds[]>(`${base}/team/odds`, { params: { team, season, day } });
      const teamOdds = data.map((entry: any) => ({
        territory: entry.territory, winner: entry.winner, chance: entry.chance
      }));
      const uniqueTerritories = [...new Set(teamOdds.map((odds) => odds.territory))];
      const territoryData: { [key: string]: string } = {};
      await Promise.all(uniqueTerritories.map(async (territory) => {
        const { data } = await axios.get<TerritoryData>(`${base}/territory/turn`, { params: { territory, season, day } });
        
        // Sort teams so that `myteam` is always first in the combined info
        const sortedTeams = data.teams.sort((a: any, b: any) => {
          if (a.team === team) return -1; // Put `myteam` first
          if (b.team === team) return 1;
          return 0; // Otherwise, keep the original order
        });
  
        const combinedInfo = sortedTeams
          .map((t: any) => `${t.team}: ${t.players} Players, ${t.power.toFixed(2)} Power`)
          .filter((t: string) => t.includes('Players')).join(" | ");
          
        territoryData[territory] = combinedInfo;
      }));
      setOdds(teamOdds.map((odds) => ({
        ...odds, combined_info: territoryData[odds.territory] || ""
      })).sort((a, b) => b.chance - a.chance || a.territory.localeCompare(b.territory)));
    } catch (error) { console.error("Error fetching odds:", error); setOdds([]); }
  };
  

  const getLegalMoves = async (season: number, day: number, myteam: string) => {
    try {
      const { data } = await axios.get(`${base}/territories?day=${day}&season=${season}`);
      const territories = data.map((territory: any) => ({
        id: territory.id, name: territory.name, owner: territory.owner,
        neighbors: territory.neighbors.map((neighbor: any) => neighbor.id)
      }));
      const defend = territories.filter((t: any) => t.owner === myteam &&
        !t.neighbors.every((neighborId: number) => territories.find((nt: any) => nt.id === neighborId)?.owner === myteam))
        .map((t: any) => t.name).sort();
      const attack = territories.filter((t: any) => t.owner !== myteam && t.neighbors.some((neighborId: number) =>
        territories.find((nt: any) => nt.id === neighborId)?.owner === myteam)).map((t: any) => t.name).sort();
      return { defend, attack };
    } catch (error) { console.error("Error fetching legal moves:", error); return { defend: [], attack: [] }; }
  };

  return (
    <div className="container mt-3">
      <h1>College Football Risk Website</h1>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "40%" }}>
          <h3>Selection</h3>
          <Form.Group>
            <Form.Label>Select Season</Form.Label>
            <Form.Control as="select" value={season ?? ""} onChange={(e) => setSeason(Number(e.target.value))}>
              <option value="">Select Season</option>
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </Form.Control>
          </Form.Group>
          <Form.Group>
            <Form.Label>Enter Day</Form.Label>
            <Form.Control type="number" value={day} onChange={(e) => setDay(Number(e.target.value))} min={1} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Select Team</Form.Label>
            <Form.Control as="select" value={team} onChange={(e) => setTeam(e.target.value)} disabled={teams.length === 0}>
              <option value="">Select Team</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </Form.Control>
          </Form.Group>
          <Button variant="primary" onClick={fetchData} disabled={!team}>Get Data</Button>
        </div>
        <div style={{ width: "50%" }}>
          <h3>MVP Players</h3>
          <Form.Control as="textarea" rows={1} value={mvpPlayers.join(", ")} readOnly style={{ resize: "none", width: "100%", minHeight: "200px"}} wrap="soft" />
          <h3>Legal Moves</h3>
          <strong>Defend:</strong>
          <p>{defendTerritories.length ? defendTerritories.join(", ") : "No defendable territories"}</p>
          <strong>Attack:</strong>
          <p>{attackTerritories.length ? attackTerritories.join(", ") : "No attackable territories"}</p>
          <h3>Odds</h3>
          {odds.length ? (
            <table className="table table-striped">
              <thead>
                <tr><th>Territory</th><th>Winner</th><th>Chance</th><th>Details</th></tr>
              </thead>
              <tbody>
                {odds.map((odd, idx) => (
                  <tr key={idx}>
                    <td>{odd.territory}</td>
                    <td>{odd.winner}</td>
                    <td>{(odd.chance * 100).toFixed(2)}%</td>
                    <td>{odd.combined_info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>No odds available</p>}
        </div>
      </div>
    </div>
  );
};

export default App;
