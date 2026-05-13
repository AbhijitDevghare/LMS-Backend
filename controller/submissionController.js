// controllers/submissionController.js

import fs from "fs";

import cloudinary from "cloudinary";

import Submission from "../models/submissionModel.js";

import Assignment from "../models/assignmentModel.js";

import createError from "../utils/error.js";

export const submitAssignment = async (
    req,
    res,
    next
) => {

    try {

        const { assignmentId } =
            req.params;

        const {
            submissionText
        } = req.body;

        const assignment =
            await Assignment.findById(
                assignmentId
            );

        if (!assignment) {

            return next(
                createError(
                    404,
                    "Assignment not found"
                )
            );

        }

        const alreadySubmitted =
            await Submission.findOne({

                assignment: assignmentId,
                student: req.user.id

            });

        if (alreadySubmitted) {

            return next(
                createError(
                    400,
                    "Assignment already submitted"
                )
            );

        }

        let status = "pending";

        if (
            new Date() >
            new Date(
                assignment.dueDate
            )
        ) {

            status = "late";

        }

        let uploadedFiles = [];

        if (req.files?.length > 0) {

            for (const file of req.files) {

                const result =
                    await cloudinary.v2.uploader.upload(
                        file.path,
                        {
                            resource_type: "auto",
                            folder: "lms_submissions"
                        }
                    );

                uploadedFiles.push({

                    public_id:
                        result.public_id,

                    secure_url:
                        result.secure_url

                });

                fs.rmSync(file.path);

            }

        }

        const submission =
            await Submission.create({

                assignment:
                    assignmentId,

                student:
                    req.user.id,

                submissionText,

                files:
                    uploadedFiles,

                status

            });

        res.status(201).json({

            success: true,
            message:
                "Assignment submitted successfully",

            submission

        });

    } catch (error) {

        return next(
            createError(500, error.message)
        );

    }

};

export const getAssignmentSubmissions =
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                assignmentId
            } = req.params;

            const submissions =
                await Submission.find({

                    assignment:
                        assignmentId,

                    isDeleted: false

                })
                    .populate(
                        "student",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.status(200).json({

                success: true,
                submissions

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

export const gradeSubmission =
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                submissionId
            } = req.params;

            const {
                marks,
                feedback
            } = req.body;

            const submission =
                await Submission.findById(
                    submissionId
                );

            if (!submission) {

                return next(
                    createError(
                        404,
                        "Submission not found"
                    )
                );

            }

            submission.marks =
                marks;

            submission.feedback =
                feedback;

            submission.status =
                "reviewed";

            await submission.save();

            res.status(200).json({

                success: true,
                message:
                    "Submission graded successfully",

                submission

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

export const getStudentSubmissions =
    async (
        req,
        res,
        next
    ) => {

        try {

            const submissions =
                await Submission.find({

                    student:
                        req.user.id,

                    isDeleted: false

                })
                    .populate(
                        "assignment"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.status(200).json({

                success: true,
                submissions

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