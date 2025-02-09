import { useState } from 'react';
import axios from 'axios';
import { Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';


// API base URL
const base = "https://dough.collegefootballrisk.com/api";

const App = () => {
  const [team, setTeam] = useState<string>('');  // Team selection
  const [mvpPlayers, setMvpPlayers] = useState<string[]>([]);  // State for MVP players

  // Function to fetch MVP players
  const fetchMvpPlayers = async () => {
    try {
      const response = await axios.get(`${base}/team/players`, {
        params: { team, season: 1, day: 1 } // Modify these params based on your needs
      });
      
      if (response.data.mvp) {
        const players = response.data.player.filter((player: any) => player.mvp);
        setMvpPlayers(players.map((player: any) => player.name)); // Assuming `name` is the player name
      } else {
        setMvpPlayers([]);
      }
    } catch (error) {
      console.error("Error fetching MVP players", error);
    }
  };

  return (
    <div className="App">
      <h1>Fetch MVP Players</h1>
      
      <Form>
        <Form.Group controlId="teamSelect">
          <Form.Label>Select Team</Form.Label>
          <Form.Control
            as="select"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">Select Team</option>
            {/* Add options for teams here */}
            <option value="TeamA">Team A</option>
            <option value="TeamB">Team B</option>
            {/* You can dynamically populate this list based on available teams */}
          </Form.Control>
        </Form.Group>

        <Button onClick={fetchMvpPlayers} disabled={!team}>
          Fetch MVP Players
        </Button>
      </Form>

      {mvpPlayers.length > 0 ? (
        <div>
          <h3>MVP Players:</h3>
          <ul>
            {mvpPlayers.map((player, index) => (
              <li key={index}>{player}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No MVPs found or team not selected.</p>
      )}
    </div>
  );
};

export default App;