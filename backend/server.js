app.use(cors());
app.use(express.json());

// Simple homepage for now
app.get('/', (req, res) => {
  res.send(`
    <h1>🎉 HubSpot Marketing Idea Generator</h1>
    <p>Your API is running successfully!</p>
    <p><strong>Ready for your team to use!</strong></p>
    <h3>Available API endpoints:</h3>
    <ul>
      <li>POST /api/generate-ideas</li>
      <li>POST /api/refine-idea-custom</li>
      <li>POST /api/refine-idea</li>
    </ul>
  `);
});

// HubSpot Conversational Marketing Experiment Library Context
