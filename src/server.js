const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_TEXT = 5000;

const dataDir = path.join(__dirname, "..", "data");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const writeJson = (name, data) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2));

const cleanText = (value, maxLength = 200) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const parseNonNegativeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "RALPH", status: "live" });
});

app.get("/api/deals", (_req, res, next) => {
  try {
    res.json(readJson("deals.json"));
  } catch (error) {
    next(error);
  }
});

app.post("/api/deals", (req, res, next) => {
  try {
    const company = cleanText(req.body.company, 200);
    const title = cleanText(req.body.title, 200);
    const stage = cleanText(req.body.stage, 100) || "New";
    const nextAction = cleanText(req.body.nextAction, 500) || "Review";
    const notes = cleanText(req.body.notes, MAX_TEXT);
    const value = parseNonNegativeNumber(req.body.value);

    if (!company || !title) {
      return res.status(400).json({ error: "company and title are required" });
    }

    if (value === null) {
      return res.status(400).json({ error: "value must be a non-negative number" });
    }

    const deals = readJson("deals.json");
    const nextId = deals.length ? Math.max(...deals.map((d) => Number(d.id) || 0)) + 1 : 1;
    const newDeal = {
      id: nextId,
      company,
      title,
      stage,
      value,
      nextAction,
      notes
    };

    deals.unshift(newDeal);
    writeJson("deals.json", deals);
    return res.status(201).json(newDeal);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/signals", (_req, res, next) => {
  try {
    res.json(readJson("signals.json"));
  } catch (error) {
    next(error);
  }
});

app.get("/api/posts", (_req, res, next) => {
  try {
    res.json(readJson("posts.json"));
  } catch (error) {
    next(error);
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error("RALPH request error", error);
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  console.log(`RALPH running at http://localhost:${PORT}`);
});
