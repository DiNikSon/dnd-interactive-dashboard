import { Router } from "express";
import * as fs from "fs"; 
const router = Router();

/* GET users listing. */
router.get("/host", function(req, res, next) {
  const c = fs.readFileSync('/etc/resolv.conf', 'utf8');
  const m = c.match(/nameserver\s+([0-9.]+)/);
  if (m) return res.json({ result: m[1] });;
});

export default router;
