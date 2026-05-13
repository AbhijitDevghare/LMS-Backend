import Course from '../models/courseModel.js';
import createError from '../utils/error.js';
import cloudinary from "../config/cloudinary.js";
import streamifier from 'streamifier';
import { myCache } from '../app.js';

const streamUpload = (
    buffer,
    resource_type = "image"
) => {
    return new Promise((resolve, reject) => {
        const stream =
            cloudinary.uploader.upload_stream(
                {
                    resource_type,
                    folder: 'lms',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

        streamifier
            .createReadStream(buffer)
            .pipe(stream);
    });
};

export const getAllCourses = async (
    req,
    res,
    next
) => {
    try {
        let courses;

        if (myCache.has("courses")) {
            courses = JSON.parse(
                myCache.get("courses")
            );
        } else {
            courses = await Course.find({})
                .select('-lectures');

            if (!courses) {
                return next(
                    createError(
                        404,
                        "No courses found"
                    )
                );
            }

            myCache.set(
                "courses",
                JSON.stringify(courses)
            );
        }

        res.status(200).json({
            success: true,
            message: "All courses",
            courses,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const createCourse = async (
    req,
    res,
    next
) => {
    try {
        console.log("COURSE")
        const {
            title,
            description,
            category,
            createdBy,
        } = req.body;

        console.log(req.body)
        if (
            !title ||
            !description ||
            !category ||
            !createdBy
        ) {
            return next(
                createError(
                    400,
                    "Please enter all input fields"
                )
            );
        }

        const newCourse = new Course({
            title,
            description,
            category,
            createdBy,
            thumbnail: {
                public_id: title,
                secure_url: "http",
            },
        });

        if (req.file) {
            try {
                const result =
                    await streamUpload(
                        req.file.buffer,
                        "image"
                    );

                    console.log("STREAM RESULT : ",result)
                newCourse.thumbnail.public_id =
                    result.public_id;

                newCourse.thumbnail.secure_url =
                    result.secure_url;
            } catch (error) {
                console.log("STREAM RESULT : ",error)
                return next(
                    createError(
                        500,
                        error.message
                    )
                );
            }
        }

        await newCourse.save();

        myCache.del("courses");

        res.status(201).json({
            success: true,
            message:
                "course created successfully",
            newCourse,
        });
    } catch (error) {
        console.log("err",error)
        return next(
            createError(500, error.message)
        );
    }
};

export const updateCourse = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const course =
            await Course.findById(id);

        if (!course) {
            return next(
                createError(
                    404,
                    "No courses found"
                )
            );
        }

        Object.keys(req.body).forEach(
            (key) => {
                course[key] =
                    req.body[key];
            }
        );

        if (req.file) {
            try {
                await cloudinary.uploader.destroy(
                    course.thumbnail.public_id,
                    {
                        resource_type:
                            'image',
                    }
                );

                const result =
                    await streamUpload(
                        req.file.buffer,
                        "image"
                    );

                course.thumbnail.public_id =
                    result.public_id;

                course.thumbnail.secure_url =
                    result.secure_url;
            } catch (error) {
                return next(
                    createError(
                        500,
                        error.message
                    )
                );
            }
        }

        await course.save();

        myCache.del("courses");

        res.status(200).json({
            success: true,
            message:
                "course updated successfully",
            course,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const deleteCourse = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        const course =
            await Course.findByIdAndDelete(id);

        if (!course) {
            return next(
                createError(
                    404,
                    "No courses found"
                )
            );
        }

        await cloudinary.uploader.destroy(
            course.thumbnail.public_id,
            {
                resource_type:
                    'image',
            }
        );

        myCache.del("courses");

        res.status(200).json({
            success: true,
            message:
                "Course deleted successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const getLectures = async (
    req,
    res,
    next
) => {
    try {
        const { id } = req.params;

        let lectures;

        if (myCache.has("lectures")) {
            lectures = JSON.parse(
                myCache.get("lectures")
            );
        } else {
            const course =
                await Course.findById(id);

            if (!course) {
                return next(
                    createError(
                        404,
                        "No courses found"
                    )
                );
            }

            lectures = course.lectures;

            myCache.set(
                "lectures",
                JSON.stringify(lectures)
            );
        }

        res.status(200).json({
            success: true,
            message:
                "Lectures fetched successfully",
            lectures,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const addLecturesToCourse =
    async (
        req,
        res,
        next
    ) => {
        try {
            const {
                title,
                description,
            } = req.body;

            const { id } =
                req.params;

            const course =
                await Course.findById(id);

            if (!course) {
                return next(
                    createError(
                        404,
                        "No course found"
                    )
                );
            }

            const lectureData = {
                title,
                description,
                lecture: {
                    public_id: title,
                    secure_url: "http",
                },
            };

            if (req.file) {
                const result =
                    await streamUpload(
                        req.file.buffer,
                        "video"
                    );

                lectureData.lecture.public_id =
                    result.public_id;

                lectureData.lecture.secure_url =
                    result.secure_url;
            }

            course.lectures.push(
                lectureData
            );

            course.numberOfLectures =
                course.lectures.length;

            await course.save();

            myCache.del("lectures");

            res.status(200).json({
                success: true,
                message:
                    "Lecture added successfully",
                lectures:
                    course.lectures,
            });
        } catch (error) {
            return next(
                createError(500, error.message)
            );
        }
    };

export const updateLectures = async (
    req,
    res,
    next
) => {
    try {
        const {
            id,
            lectureId,
        } = req.params;

        const course =
            await Course.findById(id);

        if (!course) {
            return next(
                createError(
                    404,
                    "No course found"
                )
            );
        }

        const lectureToUpdate =
            course.lectures.find(
                (lecture) =>
                    lecture._id.toString() ===
                    lectureId.toString()
            );

        if (!lectureToUpdate) {
            return next(
                createError(
                    404,
                    "No lecture found"
                )
            );
        }

        if (req.body.title) {
            lectureToUpdate.title =
                req.body.title;
        }

        if (req.body.description) {
            lectureToUpdate.description =
                req.body.description;
        }

        if (req.file) {
            await cloudinary.uploader.destroy(
                lectureToUpdate
                    .lecture.public_id,
                {
                    resource_type:
                        'video',
                }
            );

            const result =
                await streamUpload(
                    req.file.buffer,
                    "video"
                );

            lectureToUpdate
                .lecture.public_id =
                result.public_id;

            lectureToUpdate
                .lecture.secure_url =
                result.secure_url;
        }

        await course.save();

        myCache.del("lectures");

        res.status(200).json({
            success: true,
            message:
                "Lecture updated successfully",
            course:
                course.lectures,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const deleteLectures = async (
    req,
    res,
    next
) => {
    try {
        const {
            id,
            lectureId,
        } = req.params;

        const course =
            await Course.findById(id);

        if (!course) {
            return next(
                createError(
                    404,
                    "No course found"
                )
            );
        }

        const lectureIndex =
            course.lectures.findIndex(
                (lecture) =>
                    lecture._id.toString() ===
                    lectureId.toString()
            );

        if (lectureIndex === -1) {
            return next(
                createError(
                    404,
                    "No lecture found"
                )
            );
        }

        await cloudinary.uploader.destroy(
            course.lectures[
                lectureIndex
            ].lecture.public_id,
            {
                resource_type:
                    'video',
            }
        );

        course.lectures.splice(
            lectureIndex,
            1
        );

        course.numberOfLectures =
            course.lectures.length;

        await course.save();

        myCache.del("lectures");

        res.status(200).json({
            success: true,
            message:
                "Lecture deleted successfully",
            lectures:
                course.lectures,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};