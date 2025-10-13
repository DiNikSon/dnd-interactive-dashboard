import { Router } from "express";
import XXH from "xxhashjs";
const router = Router();

let subscribers = Object.create(null);
let data = {
    "background":'/uploads/default-bg.jpg'
};
let hash = hashObject(data)

router.get("/subscribe", function(req, res, next) {
  if(hash!==req.query.hash){
    res.json(data)
    return
  }

  let id = Math.random().toString();

  res.setHeader('Content-Type', 'text/plain;charset=utf-8');
  res.setHeader("Cache-Control", "no-cache, must-revalidate");

  subscribers[id] = res;

  req.on('close', function() {
    delete subscribers[id];
  });
});

router.post("/set", function(req, res, next) {
  data = req.body;
  hash = hashObject(data)
  for (let id in subscribers) {
    let subscriberRes = subscribers[id];
    subscriberRes.json(data);
    // После ответа удаляем подписчика
    delete subscribers[id];
  }
  res.end('OK');
});


// funcs

function hashObject(obj) {
  const ordered = JSON.stringify(obj, Object.keys(obj).sort());
  return XXH.h64(ordered, 0xABCD).toString(16);
}

export default router;
