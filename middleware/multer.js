import path from "path";
import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },

    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
            console.log("THUMBNAIL")

        if (
            ext !== ".jpg" &&
            ext !== ".png" &&
            ext !== ".webp" &&
            ext !== ".jpeg" &&
            ext !== ".mp4" &&
            ext !== ".pdf" &&
            ext !== ".doc" &&
            ext !== ".docx" &&
            ext !== ".ppt" &&
            ext !== ".pptx" &&
            ext !== ".txt" &&
            ext !== ".zip"
        ) {
            return cb(new Error(`Unsupported file type! ${ext}`), false);
        }

        cb(null, true);
    },
});

export default upload;