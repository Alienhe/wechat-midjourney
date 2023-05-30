import * as dotenv from "dotenv";
dotenv.config();

export interface IConfig {
  mjProxyEndpoint: string;
  blockWords: string[];
  httpProxy: string;
  imagesPath: String;
  redisHost: string;
  redisPort: string;
  redisPwd: string;
}

export const config: IConfig = {
  mjProxyEndpoint: process.env.MJ_PROXY_ENDPOINT || "http://localhost:8080/mj",
  blockWords: process.env.BLOCK_WORDS?.split(",") || [],
  httpProxy: process.env.HTTP_PROXY || "",
  imagesPath: process.env.IMAGE_PATH || "",
  redisHost: process.env.REDIS_HOST || "",
  redisPort: process.env.REDIS_PORT || "",
  redisPwd: process.env.REDIS_PASSWORD || "",
};
