const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "..", "data");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const writeJson = (name, data) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "RALPH", status: "live" });
});

app.get("/api/deals", (_req, res) => {
  res.json(readJson("deals.json"));
});

app.post("/api/deals", (req, res) => {
  const deals = readJson("deals.json");
  const nextId = deals.length ? Math.max(...deals.map((d) => d.id)) + 1 : 1;
  const newDeal = {
    id: nextId,
    company: req.body.company || "Unknown Company",
    title: req.body.title || "New Opportunity",
    stage: req.body.stage || "New",
    value: Number(req.body.value || 0),
    nextAction: req.body.nextAction || "Review",
    notes: req.body.notes || ""
  };
  deals.unshift(newDeal);
  writeJson("deals.json", deals);
  res.status(201).json(newDeal);
});

app.get("/api/signals", (_req, res) => {
  res.json(readJson("signals.json"));
});

app.get("/api/posts", (_req, res) => {
  res.json(readJson("posts.json"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`RALPH running at http://localhost:${PORT}`);
});
