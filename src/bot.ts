import { Message } from "wechaty";
import { isNonsense, isProhibited, formatDateStandard } from "./utils.js";
import { submitTask } from "./mj-api.js";

export class Bot {
    botName: string = "MJBOT";
    setBotName(botName: string) {
        this.botName = botName;
    }

    async onMessage(message: Message) {
        const date = message.date();
        const rawText = message.text();
        const talker = message.talker();
        const room = message.room();
        if (!room) {
            return;
        }
        const topic = await room.topic();
        if (isNonsense(talker, message.type(), rawText)) {
            return;
        }
        if (rawText == '/help') {
            const result = "欢迎使用MJ机器人\n" +
                "------------------------------\n"
                + "🎨 生成图片命令\n"
                + "输入: /imagine prompt\n"
                + "<prompt> 即你向mj提的绘画需求\n"
                + "------------------------------\n"
                + "🌈 变换图片命令\n"
                + "输入: /up 1092785355389943801 U1\n"
                + "输入: /up 1092785355389943801 V1\n"
                + "<1092785355389943801> 代表消息ID，<U>代表放大，<V>代表细致变化，<1>代表第几张图\n"
                + "------------------------------\n"
                + "📕 附加参数 \n"
                + "1.解释：附加参数指的是在prompt后携带的参数，可以使你的绘画更加别具一格\n"
                + "· 输入 /imagine prompt --v 5 --ar 16:9\n"
                + "2.使用：需要使用--key value ，key和value之间需要空格隔开，每个附加参数之间也需要空格隔开\n"
                + "3.详解：上述附加参数解释 <v>版本key <5>版本号 <ar>比例key，<16:9>比例value\n"
                + "------------------------------\n"
                + "📗 附加参数列表\n"
                + "1.(--version) 或 (--v) 《版本》 参数 1，2，3，4，5 默认5，不可与niji同用\n"
                + "2.(--niji)《卡通版本》 参数 空或 5 默认空，不可与版本同用\n"
                + "3.(--aspect) 或 (--ar) 《横纵比》 参数 n:n ，默认1:1 ,不通版本略有差异，具体详见机器人提示\n"
                + "4.(--chaos) 或 (--c) 《噪点》参数 0-100 默认0\n"
                + "5.(--quality) 或 (--q) 《清晰度》参数 .25 .5 1 2 分别代表，一般，清晰，高清，超高清，默认1\n"
                + "6.(--style) 《风格》参数 4a,4b,4c (v4)版本可用，参数 expressive,cute (niji5)版本可用\n"
                + "7.(--stylize) 或 (--s)) 《风格化》参数 1-1000 v3 625-60000\n"
                + "8.(--seed) 《种子》参数 0-4294967295 可自定义一个数值配合(sameseed)使用\n"
                + "9.(--sameseed) 《相同种子》参数 0-4294967295 可自定义一个数值配合(seed)使用\n"
                + "10.(--tile) 《重复模式》参数 空";
            await room.say(result);
            return;
        }
        const talkerName = talker.name();
        console.log(`${formatDateStandard(date)} - [${topic}] ${talkerName}: ${rawText}`);
        if (!rawText.startsWith(`@${this.botName} `) && !rawText.startsWith('/imagine ') && !rawText.startsWith('/up ')) {
            return;
        }
        let text = rawText;
        if (rawText.startsWith(`@${this.botName} `)) {
            text = rawText.substring(this.botName.length + 2);
        }
        if (isProhibited(text)) {
            const content = `@${talkerName} \n❌ 任务被拒绝，可能包含违禁词`;
            await room.say(content);
            console.log(`${formatDateStandard(date)} - [${topic}] ${this.botName}: ${content}`);
            return;
        }
        let errorMsg;
        if (text.startsWith('/imagine ')) {
            const prompt = text.substring(9);
            errorMsg = await submitTask({
                room: topic,
                user: talkerName,
                type: "IMAGINE",
                prompt: prompt
            });
        } else if (text.startsWith('/up ')) {
            const prompt = text.substring(4);
            errorMsg = await submitTask({
                room: topic,
                user: talkerName,
                type: "UP",
                prompt: prompt
            });
        }
        if (errorMsg) {
            const content = `@${talkerName} \n❌ ${errorMsg}`;
            await room.say(content);
            console.log(`${formatDateStandard(date)} - [${topic}] ${this.botName}: ${content}`);
        }
    }

}