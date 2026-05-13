// routes/submissionRoutes.js

import { Router } from "express";

import {
    submitAssignment,
    getAssignmentSubmissions,
    gradeSubmission,
    getStudentSubmissions
} from "../controller/submissionController.js";

import {
    isLoggedIn,
    authorizedRole,
    verifySubscription
} from "../middleware/authMiddleware.js";

import upload from "../middleware/multer.js";

const router = Router();

router.post(
    "/:assignmentId",
    isLoggedIn,
    verifySubscription,
    upload.array("files"),
    submitAssignment
);

router.get(
    "/assignment/:assignmentId",
    isLoggedIn,
    authorizedRole("ADMIN"),
    getAssignmentSubmissions
);

router.put(
    "/grade/:submissionId",
    isLoggedIn,
    authorizedRole("ADMIN"),
    gradeSubmission
);

router.get(
    "/my-submissions",
    isLoggedIn,
    verifySubscription,
    getStudentSubmissions
);

export default router;