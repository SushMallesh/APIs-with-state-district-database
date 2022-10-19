const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let database = null;
const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    // process.exit(1);
  }
};
initializeDBAndServer();

//db conversion into response
const convertStateTable = (stateOb) => {
  return {
    stateId: stateOb.state_id,
    stateName: stateOb.state_name,
    population: stateOb.population,
  };
};
const convertDistrictTable = (districtOb) => {
  return {
    districtId: districtOb.district_id,
    districtName: districtOb.district_name,
    stateId: districtOb.state_id,
    cases: districtOb.cases,
    cured: districtOb.cured,
    active: districtOb.active,
    deaths: districtOb.deaths,
  };
};

//API to get list of all states
app.get("/states/", async (request, response) => {
  const getStateListQuery = `
    SELECT * FROM state;`;
  const stateList = await database.all(getStateListQuery);
  response.send(stateList.map((state) => convertStateTable(state)));
});

//API to get state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId}`;
  const state = await database.get(getStateQuery);
  response.send(convertStateTable(state));
});

//API to create a district in the district table
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getCreateQuery = `
   INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
   VALUES ('${districtName}',
            ${stateId},
            ${cases},
             ${cured},
              ${active},
               ${deaths});`;
  await database.run(getCreateQuery);
  response.send("District Successfully Added");
});

// API to get district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDistrictTable(district));
});

// API to Delete a district based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDeleteQuery = `
    DELETE FROM district WHERE district_id = ${districtId};`;
  await database.run(getDeleteQuery);
  response.send("District Removed");
});

// API to update a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getUpdateQuery = `UPDATE district 
    SET district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
         deaths = ${deaths}
         WHERE district_id = ${districtId};`;

  await database.run(getUpdateQuery);
  response.send("District Details Updated");
});

// API to get state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
  SELECT state_name
  FROM state INNER JOIN district ON state.state_id = district.state_id 
  WHERE district.district_id = ${districtId};`;
  const stateName = await database.get(getStateNameQuery);
  response.send({ stateName: stateName.state_name });
});

//API to get statistics of state
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    SELECT cases,cured,active,deaths 
    FROM district 
    WHERE state_id = ${stateId};`;
  let statsOb = {
    totalCases: 0,
    totalCured: 0,
    totalActive: 0,
    totalDeaths: 0,
  };
  const statsArray = await database.all(getStatsQuery);
  for (let stats of statsArray) {
    statsOb.totalCases += stats.cases;
    statsOb.totalCured += stats.cured;
    statsOb.totalActive += stats.active;
    statsOb.totalDeaths += stats.deaths;
  }
  response.send(statsOb);
});

module.exports = app;
