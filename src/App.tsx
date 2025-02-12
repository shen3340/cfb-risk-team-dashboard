import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

// API base URL
const base = "https://dough.collegefootballrisk.com/api";

const App = () => {
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [team, setTeam] = useState<string>("");
  const [teams, setTeams] = useState<{ name: string; id: number }[]>([]);
  const [mvpPlayers, setMvpPlayers] = useState<string[]>([]);
  const [isMvpFetched, setIsMvpFetched] = useState<boolean>(false);
  const [defendTerritories, setDefendTerritories] = useState<string[]>([]);
  const [attackTerritories, setAttackTerritories] = useState<string[]>([]);

  // Fetch available seasons when component mounts
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get(`${base}/teams`);

        if (response.data && Array.isArray(response.data)) {
          const allSeasons = Array.from(
            new Set(
              response.data.flatMap((team: { seasons: number[] }) => team.seasons)
            )
          ).sort((a, b) => a - b);

          setSeasons(allSeasons);
        } else {
          console.error("Unexpected API response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching seasons", error);
      }
    };

    fetchSeasons();
  }, []);

  // Fetch teams when season changes
  useEffect(() => {
    if (!season) return;

    const fetchTeams = async () => {
      try {
        const response = await axios.get(`${base}/teams`);

        if (response.data && Array.isArray(response.data)) {
          const filteredTeams = response.data
            .filter((team: { seasons: number[] }) => team.seasons.includes(season))
            .map((team: { name: string; id: number }) => ({
              name: team.name,
              id: team.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setTeams(filteredTeams);
        } else {
          setTeams([]);
        }
      } catch (error) {
        console.error("Error fetching teams", error);
        setTeams([]);
      }
    };

    fetchTeams();
  }, [season]);

  // Fetch MVP players
  const fetchMvpPlayers = async () => {
    try {
      const response = await axios.get(`${base}/team/players`, {
        params: { team, season, day },
      });

      if (response.data && Array.isArray(response.data)) {
        const mvpList = response.data
          .filter((entry: any) => entry.mvp === true)
          .map((entry: any) => entry.player.replace(/\$0$/, ""))
          .sort((a, b) => a.localeCompare(b));

        setMvpPlayers(mvpList);
        setIsMvpFetched(true);
      } else {
        setMvpPlayers([]);
        setIsMvpFetched(false);
      }
    } catch (error) {
      console.error("Error fetching MVP players", error);
    }
  };

  // Fetch legal moves
  const getLegalMoves = async (season: number, day: number, myteam: string,  excluded_ids: number[] = []) => {
    const url = `${base}/territories?day=${day}&season=${season}`;
    console.log("API Request URL:", url);
  
    try {
      const response = await axios.get(url);
      console.log("Raw API Response:", response.data);
  
      if (!Array.isArray(response.data)) {
        console.error("Unexpected API response format:", response.data);
        return { defend: [], attack: [] };
      }
  
      // Ensure neighbors are converted into integer arrays if they are strings
      const data = response.data.map((territory: any) => ({
        id: territory.id,
        name: territory.name,
        owner: territory.owner,
        // Map neighbors to only their IDs
        neighbors: territory.neighbors.map((neighbor: any) => neighbor.id)
      }));
  
      console.log("Processed Territories Data:", data);
  
      // **Defend Territories:**
      // - Owned by myteam
      // - At least one neighbor is NOT owned by myteam (excluding Sicily)
      const defendTerritories = data
        .filter(t => t.owner === myteam && // Territory is owned by myteam
              !t.neighbors.every((neighborId: number) => // Exclude if every neighbor is owned by myteam
                data.find(nt => nt.id === neighborId)?.owner === myteam))
        .map(t => t.name)
        .sort();
  
      console.log("Defend Territories:", defendTerritories);
  
      // **Attack Territories:**
      // - Not owned by myteam
      // - At least one neighbor is NOT owned by myteam (excluding Sicily)
      // - Excluding Sicily itself (id: 249)
      const attackTerritories = data
        .filter(t => t.owner !== myteam && // Territory is not owned by myteam
              t.neighbors.some((neighborId: number) => // At least one neighbor is owned by myteam
                data.find(nt => nt.id === neighborId)?.owner === myteam) &&
              !excluded_ids.includes(t.id) && // Exclude territories in excluded_ids
              t.id !== 249 && // Exclude Sicily
              t.id !== 186) // Exclude additional territories (like 186)
        .map(t => t.name)
        .sort();
  
      console.log("Filtered Attack Territories:", attackTerritories);
      
      // Check if any territories match the attack criteria
      if (attackTerritories.length === 0) {
        console.warn("No attack territories found. Check neighbor ownership conditions.");
      }
  
      return { defend: defendTerritories, attack: attackTerritories };
  
    } catch (error) {
      console.error("Error fetching legal moves:", error);
      return { defend: [], attack: [] };
    }
  };
  
  
  

  const fetchLegalMoves = async () => {
    if (!season || !day || !team) {
      console.warn("fetchLegalMoves: Missing required values (season, day, team)");
      return;
    }
  
    console.log(`Fetching legal moves for Season: ${season}, Day: ${day}, Team: ${team}`);
  
    try {
      const { defend, attack } = await getLegalMoves(season, day + 1, team);
      
      console.log("Defend Territories:", defend);
      console.log("Attack Territories:", attack);
  
      setDefendTerritories(defend);
      setAttackTerritories(attack);
    } catch (error) {
      console.error("Error fetching legal moves:", error);
    }
  };

  return (
    <div className="container mt-3">
      <h1>College Football Risk Dashboard</h1>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ width: "40%", minWidth: "300px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.1)" }}>
          <h3>Selection</h3>

          <Form.Group className="mb-3">
            <Form.Label>Select Season</Form.Label>
            <Form.Control as="select" value={season ?? ""} onChange={(e) => setSeason(Number(e.target.value))}>
              <option value="">Select Season</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Enter Day</Form.Label>
            <Form.Control type="number" value={day} onChange={(e) => setDay(Number(e.target.value))} min={1} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Select Team</Form.Label>
            <Form.Control as="select" value={team} onChange={(e) => setTeam(e.target.value)} disabled={teams.length === 0}>
              <option value="">Select Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Button variant="primary" onClick={fetchMvpPlayers} disabled={!team}>
            Get MVP Players
          </Button>

          <Button variant="secondary" onClick={fetchLegalMoves} disabled={!team} className="ms-2">
            Get Legal Moves
          </Button>
        </div>

        <div style={{ width: "50%", minWidth: "350px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.1)" }}>
          <h3>MVP Players</h3>
          <Form.Control as="textarea" rows={1} value={mvpPlayers.join(", ")} readOnly style={{ resize: "none", width: "100%", minHeight: "200px", height: isMvpFetched ? "auto" : "0" }} wrap="soft" />
          
          <h3>Legal Moves</h3>
          <strong>Defend:</strong>
          <p>{defendTerritories.length ? defendTerritories.join(", ") : "No defendable territories"}</p>

          <strong>Attack:</strong>
          <p>{attackTerritories.length ? attackTerritories.join(", ") : "No attackable territories"}</p>
        </div>
      </div>
    </div>
  );
};

export default App;