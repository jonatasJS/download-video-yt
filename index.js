const { download, search, getVideoInfo } = require('youtube-dlsr');
const { createWriteStream, readdirSync, existsSync } = require('fs');
const express = require("express");
const { Log } = require("easy-logs-js");
const rateLimit = require("express-rate-limit");
const app = express();

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  statusCode: 429,
  message: {
    message: "Too many requests, please try again later.",
    status: 429
  }
});

app.use(limiter);

app.use(express.static('public'));

(async () => {
  async function fls(dir, type) {
    if(!existsSync(dir)) return { message: `Type '/${type}' doesn't exist` }
    
    const resFiles = await readdirSync(dir, {
      withFileTypes: true,
      encoding: 'utf8'
    });

    return resFiles;
  }

  app.get("/", (req, res) => res.json({
    apis: ['/api/v1']
  }));

  app.get("/api/v1", (req, res) => res.json({
    rotes: [ '/api/v1/video', '/api/v1/download' ]
  }));

  app.get("/api/v1/:type", async (req, res) => {
    const type = req.params.type;
    const obj = await fls(`./public/${type}`, type);

    res.json(obj);
  });

  app.get("/api/v1/download", async (req, res) => {
    const title = req.query.title;

    if(title == undefined) return res.status(404).json({
      message: 'Title/name of video/playlist/channel not defined'
    });

    const type = req.query.type ? req.query.type : 'video';

    const result = await search(title, { type });
    const video = await getVideoInfo(result[0].url);
    const stream2 = video.download(video.formats.find((f) => f.hasAudio));

    stream2.pipe(createWriteStream(`./public/${type}/${title.replaceAll(' ', '_')}.mp4`));

    res.status(200).json({
      message: 'Success'
    });
  });

  app.get("/api/v1/:type/:id", async (req, res) => {
    const id = Number(req.params.id)-1;
    const type = req.params.type;
    const obj = await fls(`./public/${type}`);

    if (id >= obj.length) return res.status(400).json({
      message: 'Invalid ID'
    });

    res.status(200).json({
      id: id++,
      name: obj[id].name,
      directory: `/${type}/${obj[id].name}`
    });
  });
})();

app.listen(process.env.PORT || 3000, () => Log(process.env.PORT || 3000));
