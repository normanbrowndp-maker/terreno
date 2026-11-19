import {afterEach,expect,it,vi} from "vitest";
import {inspect} from "node:util";
import {Pool} from "pg";
import {withCatalogDatabase} from "../../src/shared/db/pool";
import {fixtureSecret} from "../fixtures/neon-test";

vi.mock("server-only",()=>({}));
vi.mock("../../src/shared/db/profile-identity",()=>({assertProfileIdentity:vi.fn().mockResolvedValue(undefined)}));
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});

it("exposes only a query capability, never the actual Pool options or credentials",async()=>{
  vi.stubEnv("TRAVEL_DATABASE_PROFILE","local");
  vi.stubEnv("TRAVEL_DATABASE_ID","travel_fixture_owned");
  vi.stubEnv("DATABASE_URL",`postgresql://travel_runtime:${fixtureSecret}@127.0.0.1:55433/travel_dev`);
  const connect=vi.spyOn(Pool.prototype,"connect").mockImplementation(()=>{throw Error("Unexpected socket");});
  const query=vi.spyOn(Pool.prototype,"query").mockResolvedValue({rows:[{value:1}],rowCount:1} as never);
  await withCatalogDatabase(async db=>{
    expect(Object.keys(db)).toEqual(["query"]);
    expect(Object.isFrozen(db)).toBe(true);
    for(const value of [JSON.stringify(db),inspect(db),inspect(db,{showHidden:true,depth:null}),JSON.stringify({...db}),String(db.query)]){expect(value).not.toContain(fixtureSecret);expect(value).not.toContain("postgresql://");}
    expect((await db.query("SELECT 1 AS value")).rows).toEqual([{value:1}]);
  });
  expect(query).toHaveBeenCalledWith("SELECT 1 AS value");
  expect(connect).not.toHaveBeenCalled();
});
