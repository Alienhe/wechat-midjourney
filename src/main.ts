import { WechatyBuilder } from "wechaty";
import QRCode from "qrcode";
import { Bot } from "./bot.js";
import { displayMilliseconds } from "./utils.js";
import { downloadImage } from "./mj-api.js";
import { config } from "./config.js";
import Redis from "ioredis";

import express, { Application, Request, Response } from "express";

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 4120;

const bot = new Bot();

const client = WechatyBuilder.build({
  name: "wechat-assistant",
  puppet: "wechaty-puppet-wechat",
  puppetOptions: {
    uos: true
  }
});

const redis = new Redis({
  host: config.redisHost,
  port: Number(config.redisPort),
  password: config.redisPwd,
})


async function main() {
  const initializedAt = Date.now();
  client.on("scan", async (qrcode) => {
    const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
    console.log(`scan qrcode to login: ${url}`);
    console.log(await QRCode.toString(qrcode, { type: "terminal", small: true }));
  }).on("login", async (user) => {
    console.log(`user ${user.name()} login success`);
    bot.setBotName(user.name());
  }).on("message", async (message) => {
    // console.log(message.talker())
    if (message.date().getTime() < initializedAt) {
      return;
    }
    if (message.self()) return;

    if (!message.room()) {
      // 暂不处理私聊信息
      try {
        bot.onMessage(message);
      } catch (e) {
        console.error(`bot on message error: ${e}`);
      }
      return;
    } else {
      try {
        bot.onRoomMessage(message);
      } catch (e) {
        console.error(`bot on message error: ${e}`);
      }
    }
  });
  try {
    await client.start();
  } catch (e) {
    console.error(`wechat client start failed: ${e}`);
  }
}
main();

app.post("/notify", async (req: Request, res: Response): Promise<Response> => {
  try {
    const state = req.body.state;
    const [roomName, talkerId, userName] = state.split(':');
    // const i = state.indexOf(":");
    // const roomName = state.substring(0, i);
    // const userName = state.substring(i + 1);
    let room;
    if (roomName == '私聊') {
      room = await client.Contact.find({ name: userName });
    } else {
      room = await client.Room.find({ topic: roomName });
    }
    console.log('回调内容--------', req.body)
    // 找不到人或房间
    if (!room) {
      return res.status(404).send("room not found");
    }
    
    const action = req.body.action;
    const status = req.body.status;
    const description = req.body.prompt;
    if (status == 'SUBMITTED') {
      if (action == 'IMAGINE') {
        room.say(`@${userName} \n✅ 绘图任务已提交\n✨ Prompt: ${description}\n🚀 正在快速处理中，请稍后`);
      } else if (action == 'VARIATION') {
        room.say(`@${userName} \n✅ 变换任务已提交\n✨ Prompt: ${description}\n🚀 正在快速处理中，请稍后`);
      } else if (action == 'UPSCALE') {
        room.say(`@${userName} \n🔍 变换任务已提交\n✨ Prompt: ${description}\n🚀 正在快速处理中，请稍后`);
      }
      
    } else if (status == 'FAILURE') {
      room.say(`@${userName} \n❌ 任务执行失败\n✨ ${req.body.failReason}`);
      await redis.set(`mj_talker_msg_count_${talkerId}`, 0);
    } else if (status == 'SUCCESS') {
      const time = req.body.finishTime - req.body.submitTime;
      if (action == 'UPSCALE') {
        
        const image =  await downloadImage(req.body.imageUrl);
        await room.say(`@${userName} \n🎨 图片放大，用时: ${displayMilliseconds(time)}\n✨ ${description}`);
        room.say(image);

      } else {
        const taskId = req.body.id;
        const prompt = req.body.prompt;

        const image = await downloadImage(req.body.imageUrl);
        await room.say(`@${userName} \n🎨 ${action == 'IMAGINE' ? '绘图' : '变换'}成功，用时 ${displayMilliseconds(time)}\n✨ Prompt: ${prompt}\n📨 任务ID: ${taskId}\n🪄 放大 U1～U4 ，变换 V1～V4\n✏️ 使用[/up 任务ID 操作]\n/up ${taskId} U1`);
        room.say(image);
      }
      await redis.set(`mj_talker_msg_count_${talkerId}`, 0);
    }
    return res.status(200).send({ code: 1 });
  } catch (e) {
    console.error(`notify callback failed: ${e}`);
    return res.status(500).send({ code: -9, msg: e });
  }
});

try {
  app.listen(port, (): void => {
    console.log(`Notify server start success on port ${port}`);
  });
} catch (e) {
  console.error(`Notify server start failed: ${e}`);
}
