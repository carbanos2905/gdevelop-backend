const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO;

const githubHeaders = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'GDevelop-Render-Sync'
};

// Vérification de statut
app.get('/api/status', (req, res) => res.json({ status: 'OK' }));

// Lister tous les projets sauvegardés sur GitHub
app.get('/api/projects', async (req, res) => {
  const response = await fetch(`https://github.com{REPO}/contents/`, {
    headers: githubHeaders
  });
  if (!response.ok) return res.json([]);
  const files = await response.json();
  const projects = Array.isArray(files)
    ? files.filter(f => f.name.endsWith('.json')).map(f => f.name.replace('.json', ''))
    : [];
  res.json(projects);
});

// Sauvegarder ou mettre à jour un projet sur GitHub
app.put('/api/projects/:id', async (req, res) => {
  const path = `${req.params.id}.json`;
  const url = `https://github.com{REPO}/contents/${path}`;

  let sha;
  const check = await fetch(url, { headers: githubHeaders });
  if (check.ok) {
    const existing = await check.json();
    sha = existing.sha;
  }

  const content = Buffer.from(JSON.stringify(req.body, null, 2)).toString('base64');
  const save = await fetch(url, {
    method: 'PUT',
    headers: githubHeaders,
    body: JSON.stringify({
      message: `Sauvegarde de ${req.params.id}`,
      content,
      sha
    })
  });

  if (!save.ok) return res.status(500).json({ error: 'Erreur sauvegarde GitHub' });
  res.json({ id: req.params.id, status: 'saved' });
});

// Charger un projet depuis GitHub
app.get('/api/projects/:id', async (req, res) => {
  const url = `https://github.com{REPO}/contents/${req.params.id}.json`;
  const response = await fetch(url, { headers: githubHeaders });

  if (!response.ok) return res.status(404).json({ error: 'Projet introuvable' });
  const file = await response.json();
  const jsonContent = Buffer.from(file.content, 'base64').toString('utf-8');
  res.json(JSON.parse(jsonContent));
});

app.listen(process.env.PORT || 3000, () => console.log('Relais GitHub actif'));
