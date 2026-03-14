import { Router } from "express";
import XXH from "xxhashjs";
const router = Router();
import fs from "fs";
import path from "path";
import defaultProject from "../public/projects/default.json" with { type: 'json' };

export let subscribers = Object.create(null);
export let data = {
  "project": null,
  "scene":{
    "background":'/src/images/default-bg.jpg',
  },
  "playlists": {"items": []},
  "characters": {"list": []},
  "notifications": {"scene": null, "players": {}},
  "initiative": {"participants": [], "currentTurnId": null, "inCombat": false, "round": 1},
  "widgets": {"topLeft":null,"topCenter":null,"topRight":null,"middleLeft":null,"middleRight":null,"bottomLeft":null,"bottomCenter":null,"bottomRight":null},
};
export let sessions = {}; // { token: { characterId: string|null, connected: boolean } }

let projectsDir = path.join(process.cwd(), "/public/projects/");

function readFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function writeFile(filePath, fileData) {
  fs.writeFileSync(filePath, JSON.stringify(sortObjectKeys(fileData), null, 2), "utf-8");
}

function exists(filePath) {
  return fs.existsSync(filePath)
}

function valueForKey(key) {
  return key.includes('+')
    ? Object.fromEntries(key.split('+').map(k => [k, data[k]]))
    : data[key];
}

export function notifySubscribers(key) {
  for (let id in subscribers) {
    const sub = subscribers[id];
    const subKeys = sub.key.split('+');
    if (!subKeys.includes(key)) continue;
    sub.res.json(valueForKey(sub.key));
    delete subscribers[id];
  }
}

export function persistProject() {
  if (!data.project) return;
  const { project, ...noProjectData } = data;
  writeFile(`${projectsDir}${data.project}.json`, noProjectData);
}

router.get("/projects", function(_req, res) {
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json') && f !== 'default.json');
  res.json(files.map(f => f.replace('.json', '')));
});

router.get("/subscribe/:key", function(req, res, next) {
  let key = req.params.key
  let token = req.query.token || null
  let value = valueForKey(key)
  // undefined means key doesn't exist at all — return null immediately
  if(value === undefined){
    res.json(null)
    return
  }
  let hash = hashObject(value)
  if(hash !== req.query.hash){
    res.json(value)
    return
  }

  let id = Math.random().toString();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Connection', 'keep-alive');

  subscribers[id] = {res, key};

  if (token) {
    if (!sessions[token]) sessions[token] = { characterId: null, connected: false };
    sessions[token].connected = true;
  }

  req.on('close', function() {
    delete subscribers[id];
    if (token && sessions[token]) {
      sessions[token].connected = false;
    }
  });
});

router.post("/load/:key", function(req, res, next) {
  let key = req.params.key
  let fileData = readFile(`${projectsDir}${key}.json`)
  data = {
    ...defaultProject,
    ...fileData,
    project: key,
  }
  for (let id in subscribers) {
    let subscriberRes = subscribers[id];
    subscriberRes.res.json(valueForKey(subscriberRes.key));
    delete subscribers[id];
  }
  res.json(data);
});

router.put("/set/:key", function(req, res, next) {
  let key = req.params.key
  data[key] = req.body;

  for (let id in subscribers) {
    let subscriberRes = subscribers[id];
    if(!subscriberRes.key.split('+').includes(key)) continue;
    subscriberRes.res.json(valueForKey(subscriberRes.key));
    delete subscribers[id];
  }
  if(data.project){
    const {project, ...noProjectData} = data
    writeFile(`${projectsDir}${data.project}.json`, noProjectData)
  }
  res.end('OK');
});

router.post("/unload", function(_req, res) {
  data.project = null;
  for (let id in subscribers) {
    let subscriberRes = subscribers[id];
    subscriberRes.res.json(valueForKey(subscriberRes.key));
    delete subscribers[id];
  }
  res.end('OK');
});

router.post("/new", function(req, res, next) {
  if(!req.body.name){
    res.status(400).json({code: 'no_name_provided', message: 'No name provided'})
    return
  }
  let projectName = req.body.name.toLowerCase().split(' ').join('-')
  if(exists(`${projectsDir}${projectName}.json`)){
    res.status(400).json({code: 'name_already_exists', message: 'Name already exists'})
    return
  }
  const { name, ...rest } = req.body;
  data = {
    ...defaultProject,
    ...rest,
    project: projectName,
  };
  writeFile(`${projectsDir}${projectName}.json`, data)
  for (let id in subscribers) {
    let subscriberRes = subscribers[id];
    subscriberRes.res.json(valueForKey(subscriberRes.key));
    delete subscribers[id];
  }
  res.end(projectName);
});


// funcs

function hashObject(obj) {
  const ordered = JSON.stringify(sortObjectKeys(obj));
  return XXH.h64(ordered, 0xABCD).toString(16);
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

export default router;
