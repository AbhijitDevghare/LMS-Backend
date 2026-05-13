// models/assignment.model.js

import { model, Schema } from "mongoose";

const assignmentSchema = new Schema({

    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: [true, "Course is required"]
    },

    title: {
        type: String,
        required: [true, "Assignment title is required"],
        trim: true,
        minlength: [5, "Title must be at least 5 characters"],
        maxlength: [100, "Title should be less than 100 characters"]
    },

    description: {
        type: String,
        required: [true, "Description is required"],
        minlength: [10, "Description must be at least 10 characters"]
    },

    dueDate: {
        type: Date,
        required: [true, "Due date is required"]
    },

    totalMarks: {
        type: Number,
        default: 100,
        min: [1, "Marks must be greater than 0"]
    },

    attachments: [
        {
            public_id: {
                type: String
            },

            secure_url: {
                type: String
            }
        }
    ],

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ dueDate: 1 });

const Assignment = model("Assignment", assignmentSchema);

export default Assignment;