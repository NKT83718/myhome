const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const FILE = path.join(__dirname, "sessions.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db));
}

app.get("/api/auth", function (req, res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  var uid = String(req.query.uid || "");
  var db = load();
  var v = db[uid];
  res.json({ active: v === true || v === 1 || v === "1" });
});

app.post("/api/auth", function (req, res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  var body = req.body || {};
  var uid = String(body.uid || req.query.uid || "");
  var active = !!body.active;
  if (!uid) {
    res.status(400).json({ ok: false });
    return;
  }
  var db = load();
  db[uid] = active;
  save(db);
  res.json({ ok: true, active: active });
});

app.get("/", function (req, res) {
  res.json({ ok: true, service: "myhome-auth" });
});

var port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", function () {
  console.log("auth api on " + port);
});