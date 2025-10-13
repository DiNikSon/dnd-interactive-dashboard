import { Router } from "express";
const router = Router();

/* GET users listing. */
router.get("/users", function(req, res, next) {
  console.log('get "users" route hit');
  res.json({ users: ["joe", "bernie", "tulsi", "donald", "bill"] });
});

export default router;
