// models/submission.model.js

import { model, Schema } from "mongoose";

const submissionSchema = new Schema({

    assignment: {
        type: Schema.Types.ObjectId,
        ref: "Assignment",
        required: [true, "Assignment is required"]
    },

    student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Student is required"]
    },

    submissionText: {
        type: String,
        trim: true,
        maxlength: [2000, "Submission too long"]
    },

    files: [
        {
            public_id: {
                type: String
            },

            secure_url: {
                type: String
            }
        }
    ],

    marks: {
        type: Number,
        default: 0,
        min: 0
    },

    feedback: {
        type: String,
        trim: true,
        maxlength: [1000, "Feedback too long"]
    },

    status: {
        type: String,
        enum: ["pending", "reviewed", "late"],
        default: "pending"
    },

    submittedAt: {
        type: Date,
        default: Date.now
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

submissionSchema.index(
    { assignment: 1, student: 1 },
    { unique: true }
);

submissionSchema.index({ student: 1 });

const Submission = model("Submission", submissionSchema);

export default Submission;