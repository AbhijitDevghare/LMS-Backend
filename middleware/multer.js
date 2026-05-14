import path from "path";

import fs from "fs";

import multer from "multer";

const uploadPath = "uploads/";

if (!fs.existsSync(uploadPath)) {

    fs.mkdirSync(uploadPath);

}

const storage = multer.diskStorage({

    destination: function (
        _req,
        _file,
        cb
    ) {

        cb(
            null,
            uploadPath
        );

    },

    filename: function (
        _req,
        file,
        cb
    ) {

        const ext =
            path.extname(
                file.originalname
            );

        const safeName =

            Date.now() +

            "-" +

            Math.round(
                Math.random() * 1E9
            ) +

            ext;

        cb(
            null,
            safeName
        );

    }

});

const upload = multer({

    storage,

    limits: {

        fileSize:
            1024 * 1024 * 500

    },

    fileFilter:
        (_req, file, cb) => {

            const ext =
                path.extname(
                    file.originalname
                ).toLowerCase();

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

                return cb(

                    new Error(
                        `Unsupported file type! ${ext}`
                    ),

                    false

                );

            }

            cb(
                null,
                true
            );

        }

});

export default upload;