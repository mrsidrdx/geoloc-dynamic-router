import express from "express";
import bodyParser from "body-parser";
import requestIp from "request-ip";
import maxmind, { CityResponse } from "maxmind";
import NodeGeocoder from "node-geocoder";
import { distance } from "./lib/utils";
import path from "path";

require("dotenv").config();

const PORT = process.env.PORT || 3030;

const app = express();

app.use(bodyParser.json());
app.use(requestIp.mw());

// Initialize NodeGeocoder
const geocoder = NodeGeocoder({
  provider: "opencage",
  apiKey: process.env.OPEN_CAGE_API_KEY,
});

// Define list of country codes to restrict search to
const countryCodes = ["in", "us", "uk"];

// Default route
app.get("/", async (req: any, res: any) => {
  try {
    // Load MaxMind database
    const geoIpDatabase = await maxmind.open<CityResponse>(
      process.env.MAXMIND_DB_NAME!
    );
    const clientIp = req.clientIp;
    
    const geoIp = geoIpDatabase.get(clientIp);
    const { latitude, longitude } = geoIp?.location!;

    // Find nearest country code
    const results = await geocoder.reverse({ lat: latitude, lon: longitude });
    
    if (results && results.length > 0) {
      const countryCode = results
        ?.filter((result: any) =>
          countryCodes.includes(result.countryCode.toLowerCase())
        )
        ?.sort((a: any, b: any) => {
          const aDist = distance(latitude, longitude, a.latitude, a.longitude);
          const bDist = distance(latitude, longitude, b.latitude, b.longitude);
          return aDist - bDist;
        })?.[0]
        ?.countryCode?.toLowerCase();

      if (countryCode) {
        res.redirect(`/${countryCode}`);
      } else {
        res.sendStatus(404);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Country routes
app.get("/:countryCode", (req: any, res: any) => {
  const countryCode = req.params.countryCode;
  res.sendFile(path.join(__dirname, `../public/${countryCode}.html`));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Export the Express API
module.exports = app
