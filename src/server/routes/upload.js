import { Router } from "express";
import multer, { diskStorage } from "multer";
import { join, extname, basename } from "path";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Базовая директория загрузок
const baseUploadDir = join(__dirname, "../public/uploads");

// 🛠 Создаём базовую директорию, если её нет
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Фабрика хранилищ для разных папок

const makeStorage = (folderName = "") =>
  diskStorage({
    destination: (req, file, cb) => {
      const targetDir = join(baseUploadDir, folderName);
      fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const targetDir = join(baseUploadDir, folderName);
      const customName = req.query?.name;
      const originalExt = extname(file.originalname);

      let baseName;
      let finalExt;

      if (customName) {
        finalExt = extname(customName) || originalExt;
        baseName = basename(customName, extname(customName));
      } else {
        baseName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        finalExt = originalExt;
      }

      // Проверка занятости файла
      let candidate = `${baseName}${finalExt}`;
      let counter = 2;

      while (fs.existsSync(join(targetDir, candidate))) {
        candidate = `${baseName}-${counter}${finalExt}`;
        counter++;
      }

      cb(null, candidate);
    },
  });

// ✅ Маршрут по умолчанию (без папки)
router.post("/", multer({ storage: makeStorage() }).single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ✅ Маршрут с указанием папки
router.post("/:folder", (req, res, next) => {
  const folder = req.params.folder;

  // проверка, чтобы не лезли за пределы uploadDir
  if (folder.includes("..") || folder.includes("/")) {
    return res.status(400).json({ error: "Некорректное имя папки" });
  }

  const upload = multer({ storage: makeStorage(folder) }).single("file");

  upload(req, res, (err) => {
    if (err) return res.status(500).json({ error: "Ошибка при загрузке", details: err.message });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });

    const fileUrl = `/uploads/${folder}/${req.file.filename}`;
    res.json({ url: fileUrl });
  });
});

// ✅ GET /:folder - список файлов в папке
router.get("/:folder", (req, res) => {
  const folder = req.params.folder;

  if (folder.includes("..") || folder.includes("/")) {
    return res.status(400).json({ error: "Некорректное имя папки" });
  }

  const targetDir = join(baseUploadDir, folder);

  if (!fs.existsSync(targetDir)) {
    return res.json([]); // пустой массив, если папки нет
  }

  const files = fs.readdirSync(targetDir)
    .filter(file => fs.statSync(join(targetDir, file)).isFile())
    .map(file => `/uploads/${folder}/${file}`);

  res.json(files);
});

router.delete("/:folder/:file", (req, res) => {
  const { folder, file } = req.params;

  // Проверка, чтобы не лезли за пределы uploadDir
  if (folder.includes("..") || folder.includes("/") || file.includes("..") || file.includes("/")) {
    return res.status(400).json({ error: "Некорректное имя папки или файла" });
  }

  const filePath = path.join(baseUploadDir, folder, file);

  // Проверка, существует ли файл
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: "Файл не найден" });

    fs.unlink(filePath, (err) => {
      if (err) return res.status(500).json({ error: "Ошибка при удалении файла", details: err.message });
      res.json({ message: "Файл успешно удалён" });
    });
  });
});

export default router;