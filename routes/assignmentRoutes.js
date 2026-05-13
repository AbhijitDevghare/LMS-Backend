// routes/assignmentRoutes.js

import { Router } from "express";

import {
    createAssignment,
    getCourseAssignments,
    updateAssignment,
    deleteAssignment
} from "../controller/assignmentController.js";

import {
    isLoggedIn,
    authorizedRole,
    verifySubscription
} from "../middleware/authMiddleware.js";

import upload from "../middleware/multer.js";

const router = Router();

router.post(
    "/create",
    isLoggedIn,
    authorizedRole("ADMIN"),
    upload.array("attachments"),
    createAssignment
);

router.get(
    "/course/:courseId",
    isLoggedIn,
    verifySubscription,
    getCourseAssignments
);

router.put(
    "/:id",
    isLoggedIn,
    authorizedRole("ADMIN"),
    upload.array("attachments"),
    updateAssignment
);

router.delete(
    "/:id",
    isLoggedIn,
    authorizedRole("ADMIN"),
    deleteAssignment
);

export default router;