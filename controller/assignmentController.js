// assignment.controller.js

import fs from "fs";

import cloudinary from "../config/cloudinary.js";

import Assignment from "../models/assignmentModel.js";

import createError from "../utils/error.js";

export const createAssignment = async (
    req,
    res,
    next
) => {

    try {

        const {

            course,

            title,

            description,

            dueDate,

            totalMarks,

        } = req.body;

        if (

            !course ||

            !title ||

            !description ||

            !dueDate

        ) {

            return next(

                createError(
                    400,
                    "All fields are required"
                )

            );

        }

        let attachments = [];

        if (req.files?.length > 0) {

            for (const file of req.files) {

                const result =
                    await cloudinary.uploader.upload(
                        file.path,
                        {
                            resource_type: "auto",
                            folder: "lms_assignments"
                        }
                    );

                fs.rmSync(file.path);

                attachments.push({

                    public_id:
                        result.public_id,

                    secure_url:
                        result.secure_url,

                });

            }

        }

        const assignment =
            await Assignment.create({

                course,

                title,

                description,

                dueDate,

                totalMarks,

                attachments,

                createdBy:
                    req.user.id,

            });

        res.status(201).json({

            success: true,

            message:
                "Assignment created successfully",

            assignment,

        });

    } catch (error) {

        return next(
            createError(
                500,
                error.message
            )
        );

    }

};

export const getCourseAssignments =
    async (
        req,
        res,
        next
    ) => {

        try {

            const { courseId } =
                req.params;

            const assignments =
                await Assignment.find({

                    course:
                        courseId,

                    isDeleted:
                        false,

                }).sort({

                    createdAt: -1,

                });

            res.status(200).json({

                success: true,

                assignments,

            });

        } catch (error) {

            return next(

                createError(
                    500,
                    error.message
                )

            );

        }

    };

export const updateAssignment =
    async (
        req,
        res,
        next
    ) => {

        try {

            const { id } =
                req.params;

            const assignment =
                await Assignment.findById(
                    id
                );

            if (!assignment) {

                return next(

                    createError(
                        404,
                        "Assignment not found"
                    )

                );

            }

            let attachments =
                assignment.attachments ||
                [];

            if (req.files?.length > 0) {

                attachments = [];

                for (const oldFile of assignment.attachments) {

                    await cloudinary.uploader.destroy(
                        oldFile.public_id,
                        {
                            resource_type: "auto"
                        }
                    );

                }

                for (const file of req.files) {

                    const result =
                        await cloudinary.uploader.upload(
                            file.path,
                            {
                                resource_type: "auto",
                                folder: "lms_assignments"
                            }
                        );

                    fs.rmSync(file.path);

                    attachments.push({

                        public_id:
                            result.public_id,

                        secure_url:
                            result.secure_url,

                    });

                }

            }

            Object.keys(req.body).forEach(
                (key) => {

                    assignment[key] =
                        req.body[key];

                }
            );

            assignment.attachments =
                attachments;

            await assignment.save();

            res.status(200).json({

                success: true,

                message:
                    "Assignment updated successfully",

                assignment,

            });

        } catch (error) {

            return next(

                createError(
                    500,
                    error.message
                )

            );

        }

    };

export const deleteAssignment =
    async (
        req,
        res,
        next
    ) => {

        try {

            const { id } =
                req.params;

            const assignment =
                await Assignment.findById(
                    id
                );

            if (!assignment) {

                return next(

                    createError(
                        404,
                        "Assignment not found"
                    )

                );

            }

            for (const file of assignment.attachments) {

                await cloudinary.uploader.destroy(
                    file.public_id,
                    {
                        resource_type: "auto"
                    }
                );

            }

            assignment.isDeleted =
                true;

            await assignment.save();

            res.status(200).json({

                success: true,

                message:
                    "Assignment deleted successfully",

            });

        } catch (error) {

            return next(

                createError(
                    500,
                    error.message
                )

            );

        }

    };