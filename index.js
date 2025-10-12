const express = require("express");
const runScraper = require("./scrape-and-upload");

const app = express();

app.get("/", async (req, res) => {
  try {
    await runScraper();
    res.send("✅ Scraper ran successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Scraper failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));