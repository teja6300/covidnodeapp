const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const databasePath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let database = null;
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(5000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB Error:${err.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
  SELECT * FROM state;`;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertStateDbObjectToResponseObject(eachState));
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateIdQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  const state = await database.get(stateIdQuery);
  response.send({
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  });
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES(?,?,?,?,?,?);`;
  await database.run(
    postDistrictQuery,
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths
  );

  response.send("District Successfully Added");
});

app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const districtQuery = `SELECT * FROM district WHERE district_id=${districtId};`;
  const district = await database.get(districtQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const deleteDistrict = `DELETE FROM district WHERE district_id=${districtId};`;
  await database.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;

  const updateQuery = `UPDATE district
                      SET district_name = ?,
                          state_id = ?,
                          cases = ?,
                          cured = ?,
                          active = ?,
                          deaths = ?
                      WHERE district_id = ?;`;

  await database.run(
    updateQuery,
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
    districtId
  );

  response.send("District Details Updated");
});

app.get(" /states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `SELECT SUM(cases),SUM(cured),SUM(active),SUM(deaths) FROM district 
  WHERE state_id=${stateId};`;
  const stats = await database.get(getStatsQuery);
  console.log(stats);
  response.send({
    totalCases: stats["SUM(cases"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
select state_id from district
where district_id = ${districtId};
`; 
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery);

  const getStateNameQuery = `
select state_name as stateName from state
where state_id = ${getDistrictIdQueryResponse.state_id};
`; 
  const getStateNameQueryResponse = await database.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
}); 

module.exports = app;
