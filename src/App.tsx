import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// API base URL
const base = "https://dough.collegefootballrisk.com/api";

const App = () => {
  const [seasons, setSeasons] = useState<number[]>([]); // Selected season
  const [season, setSeason] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1); // Selected day
  const [team, setTeam] = useState<string>(''); // Selected team
  const [teams, setTeams] = useState<{ name: string; id: number }[]>([]); // List of teams for the selected season
  const [mvpPlayers, setMvpPlayers] = useState<string[]>([]); // MVP players list

  // Fetch available seasons when component mounts
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get(`${base}/teams`);
        console.log("API Response:", response.data); // Log full API response

        if (response.data && Array.isArray(response.data)) {
          // Extract unique seasons from teams
          const allSeasons = Array.from(
            new Set(
              response.data.flatMap((team: { seasons: number[] }) => {
                console.log("Team seasons:", team.seasons); // Log extracted seasons
                return team.seasons;
              })
            )
          ).sort((a, b) => a - b); // Sort in ascending order

          console.log("Extracted seasons:", allSeasons); // Log the final seasons array
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
    if (!season) return; // Avoid running if no season is selected

    const fetchTeams = async () => {
      try {
        const response = await axios.get(`${base}/teams`);
        
        // Filter teams that belong to the selected season
        if (response.data && Array.isArray(response.data)) {
          const filteredTeams = response.data.filter((team: { seasons: number[] }) => 
            team.seasons.includes(season)
          );
          const teamNames = filteredTeams.map((team: { name: string; id: number }) => ({
            name: team.name,
            id: team.id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sorting alphabetically by team name;
          setTeams(teamNames); // Update available teams
        } else {
          setTeams([]); // Reset if no teams found
        }
      } catch (error) {
        console.error("Error fetching teams", error);
        setTeams([]); // Ensure list clears on failure
      }
    };

    fetchTeams();
  }, [season]); // Runs when `season` changes

  // Fetch MVP players when button is clicked
  const fetchMvpPlayers = async () => {
    try {
      const response = await axios.get(`${base}/team/players`, {
        params: { team, season, day },
      });

      if (response.data && response.data.mvp) {
        const mvpList = response.data.player
          .filter((player: any) => player.mvp)
          .map((player: any) => player.name);
        setMvpPlayers(mvpList);
      } else {
        setMvpPlayers([]);
      }
    } catch (error) {
      console.error("Error fetching MVP players", error);
    }
  };

  return (
    <div className="container mt-3">
      <h1>College Football Risk Dashboard</h1>

      {/* Season Selection (Dynamic) */}
      <Form.Group className="mb-3">
        <Form.Label>Select Season</Form.Label>
        <Form.Control
          as="select"
          value={season ?? ""}
          onChange={(e) => setSeason(Number(e.target.value))}
        >
          <option value="">Select Season</option>
          {seasons.length > 0 ? (
            seasons.map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))
          ) : (
            <option value="">Loading seasons...</option> // Placeholder when seasons are loading
          )}
        </Form.Control>
      </Form.Group>

      {/* Day Selection */}
      <Form.Group className="mb-3">
        <Form.Label>Enter Day</Form.Label>
        <Form.Control
          type="number"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          min={1}
        />
      </Form.Group>

      {/* Team Selection (Dynamically Populated) */}
      <Form.Group className="mb-3">
        <Form.Label>Select Team</Form.Label>
        <Form.Control
          as="select"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          disabled={teams.length === 0} // Disable if no teams available
        >
          <option value="">Select Team</option>
          {teams.length > 0 ? (
            teams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.name}
              </option>
            ))
          ) : (
            <option value="">No teams available</option> // Placeholder when no teams are found for selected season
          )}
        </Form.Control>
      </Form.Group>

      <Button variant="primary" onClick={fetchMvpPlayers} disabled={!team}>
        Fetch MVP Players
      </Button>

      {/* MVP Players List */}
      <h3 className="mt-4">MVP Players:</h3>
      {mvpPlayers.length > 0 ? (
        <ListGroup>
          {mvpPlayers.map((player, index) => (
            <ListGroup.Item key={index}>{player}</ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <p>No MVPs found for this selection.</p>
      )}
    </div>
  );
};

export default App;