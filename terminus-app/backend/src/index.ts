import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import axios from "axios";
import web3 from "web3";
import * as fs from 'fs';
import * as path from 'path';


const app = new Koa();
const router = new Router();
const corsConfiguration = cors({ allowMethods: "GET" });

const TERMINUS_APPLICATION_PORT = process.env.TERMINUS_APPLICATION_PORT || 14601;
const TERMINUS_APPLICATION_ID = process.env.TERMINUS_APPLICATION_ID || "";
const BROOD_AUTH_URL = process.env.BROOD_AUTH_URL || "https://auth.bugout.dev";


export type BugoutUser = {
  id: string
  username: string
  first_name?: string
  last_name?: string
  email?: string
  normalized_email?: string
  verified?: string
  autogenerated?: string
  application_id?: string
  created_at?: string
  updated_at?: string
}

export function userUnpacker(response: any): BugoutUser {
  return {
      id: response.user_id,
      username: response.username,
      first_name: response.first_name,
      last_name: response.last_name,
      email: response.email,
      normalized_email: response.normalized_email,
      application_id: response.application_id,
      verified: response.verified,
      created_at: response.created_at,
      updated_at: response.updated_at
  } as BugoutUser
}

interface Customer {
  id: string // primary key we use to refer to customer in DB
  name: string // name of customer
  notes: string // human-readable/writeable notes about customer
}

interface Contract {
  id: string // primary key we use to refer to contract in DB
  blockchain: string // chain which Terminus contract is deployed
  address: string // address of the contract on that blockchain
  customer_id: string // foreign key to Customer.id
  controller: string // address of Terminus controller
  name: string // human friendly name for contract
  notes: string // human friendly notes about contract
}

interface PoolAuthorization {
  id: string // primary key
  pool_id: string // foreign key into Pool.id
  address: string // authorized address for pool
}

interface PoolOwner {
  id: string // primary key
  pool_id: string // foreign key into Pool.id
  address: string // address of token owner
  num_tokens: string // number of tokens they own
}

interface AddressAnnotation {
  address: string
  annotator: string // address of account that created annotation
  name: string // name for address
  notes: string // notes for address
}

interface StatusResponse {
  lastRefresh: number;
  nextRefresh: number;
}

interface CountAddressesResponse {
  addresses: number;
}

interface CountUNIMResponse {
  balance: number;
}

interface QuartilesResponse {
  persent_25: LeaderboardItem;
  persent_50: LeaderboardItem;
  persent_75: LeaderboardItem;
}

interface LeaderboardItem {
  address: string;
  balance: number;
}

interface LeaderboardResponse {
  blockNumber: number;
  blockTimestamp: number;
  leaderboard: Array<LeaderboardItem>;
  offset: number;
  limit: number;
}

const toTimestamp = (strDate: string) => {
  const dt = Date.parse(strDate);
  return dt / 1000;
};

async function checkAuth(ctx: Koa.BaseContext, next: ()=>Promise<any>) {
  


  if (ctx.headers["authorization"]) {
    const user_token_list = ctx.headers["authorization"].split(" ");
    if (user_token_list.length != 2) {
      ctx.status = 403;
      ctx.body = {"error": "Wrong authorization header"};
    } else {
      try{

        let url = `${BROOD_AUTH_URL}/user`

        const response = await axios.get(url, {
          headers: { authorization: `Bearer ${user_token_list[1]}` },
        });


        const user = userUnpacker(response.data)


        if (!user.verified) {

          console.log(`Attempted journal access by unverified Brood account: ${user.id}`)
          ctx.status = 403;
          ctx.body = {"error": "Wrong authorization header"};

        } else {
          if (user.application_id != TERMINUS_APPLICATION_ID) {

            ctx.status = 403;
            ctx.body = {"error": "User does not belong to this application"};
          } else {
            await next();
          }


        }


      } catch(Error: any) {
        console.log(Error);
        ctx.status = 404;
        ctx.body = {"error": `Credential not found`};

      }
    }
  } else {
    ctx.status = 404;
    ctx.body = {"error": "Authorization header not found"};
  }
}

router.use(["/update"], checkAuth);



async function syncBucket(app: any) {
  // Request data update
  let url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/IMDEX_FILE.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  let response = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
  });

  app.context.index_data = await response.data;

  // Request data update
  url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/FULL_LIST.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  response = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
  });

  app.context.full_data = await response.data;
  app.context.last_modified = response.headers["last-modified"];
  console.log("synchronized");
}

syncBucket(app);



router.get("/terminus/:DiamondAddress", async (ctx) => {
  /*

  GET /terminus/${DiamondAddress} -> (TerminusContract):

  terminus_contract_resource_id: BugoutResource = bc.list_resources(
                  params = { "contract_address": DiamondAddress }
              )[0]
  terminus_resource = bc.get_resource( resource_id = terminus_contract_resource_id)

  1. Update resource from web3 provider
  2. Return resource

  Case if terminus_contract not found:
  Check web3 -> if contract exists and payment service conditions are met - create resource and set up crawler

  */

});


router.get("/terminus/:DiamondAddress/pools/:poolId", async (ctx) => {
  /*

  GET /terminus/${DiamondAddress}/pools/${poolId} -> (TerminusPool): 
  terminus_pool: BugoutResource = bc.get_resource(
                  resource_id=terminus_contract[poolId],
              )
  1. Update resource from web3 provider
  2. Return resource

  Case if resource not found: 
  If payment service conditions are met - create resource and set up crawler.
    For each address found in crawler:
      add TerminusIdentity. 

  */

});


router.get("/terminus/:DiamondAddress/pools/:poolId/:address", async (ctx) => {
  /*

  GET /terminus/${DiamondAddress}/pools/${poolId}/${address} -> (TerminusIdentity)
  terminus_pool_resource: BugoutResource = bc.get_resource(
                  resource_id=terminus_pool.identities[],
              )
  if address in terminus_pool_resource.identities
      terminus_identity_resource: BugoutResource = bc.get_resource(
                  resource_id=address,
              )
      terminus_identity_record_resource: BugoutResource = bc.get_pool_resource(
                  resource_id=web3.sha(DiamondAddress + poolId + address),
              )
 

  */

});



router.get("/status", async (ctx) => {
  const nowEpoch = toTimestamp(ctx.last_modified);
  const response: StatusResponse = {
    lastRefresh: nowEpoch,
    nextRefresh: nowEpoch + 10800,
  };
  ctx.body = response;
});





router.get("/position", async (ctx) => {
  const windowSizeRaw = ctx.query.window_size ? ctx.query.window_size[0] : "1";
  const windowSize = parseInt(windowSizeRaw);
  if (ctx.query.address && ctx.index_data["data"].includes(web3.utils.toChecksumAddress(ctx.query.address.toString()))) {
    const address = web3.utils.toChecksumAddress(ctx.query.address.toString());
    const position = ctx.index_data["data"][address]["position"];
    const response = ctx.full_data["data"].slice(
      position - windowSize,
      position + windowSize + 1
    );
    ctx.body = response;
  } else {
    ctx.body = {};
  }
});

router.get("/leaderboard", async (ctx) => {
  if (ctx.query.offset && ctx.query.offset.toString() != ctx.query.offset) {
    ctx.query.offset = ctx.query.offset[0];
  }
  if (ctx.query.limit && ctx.query.limit.toString() != ctx.query.limit) {
    ctx.query.limit = ctx.query.limit[0];
  }
  const offset: number = parseInt(ctx.query.offset || "0");
  const limit: number = parseInt(ctx.query.limit || "10");

  const response: LeaderboardResponse = {
    blockNumber: ctx.full_data["block_number"],
    blockTimestamp: ctx.full_data["block_timestamp"],
    leaderboard: ctx.full_data.data.slice(offset, offset + limit),
    offset: offset,
    limit: limit,
  };
  ctx.body = response;
});

router.post("/update", async (ctx) => {
  syncBucket(app);
  ctx.body = "Updating";
});

app.use(corsConfiguration).use(router.routes());

app.listen(TERMINUS_APPLICATION_PORT, () => {
  console.log(
    `UNIM Leaderboard server listening on port ${TERMINUS_APPLICATION_PORT}`
  );
});
