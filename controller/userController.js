import createError from "../utils/error.js";
import User from "../models/userModel.js";
import bcryptjs from "bcryptjs";
import { v2 } from "cloudinary";
import streamifier from "streamifier";
import sendMail from "../utils/sendMail.js";
import crypto from "crypto";

const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = v2.uploader.upload_stream(
            {
                resource_type: "image",
                folder: "lms",
                width: 250,
                height: 250,
                gravity: "faces",
                crop: "fill",
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

export const signup = async (
    req,
    res,
    next
) => {
    try {
        const {
            name,
            email,
            password,
        } = req.body;

        if (
            !name ||
            !email ||
            !password
        ) {
            return next(
                createError(
                    401,
                    "All input fields required"
                )
            );
        }

        const userExists =
            await User.findOne({
                email,
            });

        if (userExists) {
            return res.status(401).json({
                success: false,
                message:
                    "Email already exists",
            });
        }

        const user = new User({
            name,
            email,
            password,
            avatar: {
                public_id: email,
                secure_url:
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
            },
        });

        try {
            await user.validate();
        } catch (error) {
            const validationErrors = [];

            for (const key in error.errors) {
                validationErrors.push(
                    error.errors[key]
                        .message
                );
            }

            return res.status(400).json({
                success: false,
                message:
                    validationErrors.join(
                        ", "
                    ),
            });
        }

        if (req.file) {
            try {
                const result =
                    await streamUpload(
                        req.file.buffer
                    );

                if (result) {
                    user.avatar.public_id =
                        result.public_id;

                    user.avatar.secure_url =
                        result.secure_url;
                }
            } catch (error) {
                return next(
                    createError(
                        500,
                        error.message ||
                        "file not uploaded , please try again"
                    )
                );
            }
        }

        await user.save();

        user.password = undefined;

        const token =
            await user.generateToken();

        res.cookie("token", token, {
            httpOnly: true,
            maxAge:
                7 *
                24 *
                60 *
                60 *
                1000,
        });

        res.status(201).json({
            success: true,
            message:
                "User created Successfully",
            user,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const login = async (
    req,
    res,
    next
) => {
    try {
        const {
            email,
            password,
        } = req.body;

        if (!email || !password) {
            return next(
                createError(
                    401,
                    "All input fields required"
                )
            );
        }

        const userData =
            await User.findOne({
                email,
            }).select("+password");

        if (!userData) {
            return next(
                createError(
                    404,
                    "User with this email is not found"
                )
            );
        }

        const comparePassword =
            await bcryptjs.compare(
                password,
                userData.password
            );

        if (!comparePassword) {
            return next(
                createError(
                    401,
                    "Invalid email or password"
                )
            );
        }

        const token =
            await userData.generateToken();

        userData.password = undefined;

        res.cookie("token", token, {
            httpOnly: true,
            maxAge:
                7 *
                24 *
                60 *
                60 *
                1000,
        });

        res.status(200).json({
            success: true,
            message: `Welcome back ${userData.name}`,
            userData,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const logout = (
    req,
    res,
    next
) => {
    try {
        res.cookie("token", null, {
            httpOnly: true,
            maxAge: 0,
        });

        res.status(200).json({
            success: true,
            message:
                "User log out Successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const getProfile = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.user.id;

        const user =
            await User.findById(userId);

        res.status(200).json({
            success: true,
            message: "User details",
            user,
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const forgotPassword =
    async (
        req,
        res,
        next
    ) => {
        const { email } = req.body;

        if (!email) {
            return next(
                createError(
                    400,
                    "Email is required"
                )
            );
        }

        const user =
            await User.findOne({
                email,
            });

        if (!user) {
            return next(
                createError(
                    404,
                    "User with this email is not found"
                )
            );
        }

        const resetToken =
            await user.generateResetToken();

        await user.save();

        const resetPasswordUrl =
            `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const subject =
            "Reset Password";

        const message = `You can reset your password by clicking <a href="${encodeURI(
            resetPasswordUrl
        )}" target="_blank">Reset your password</a>.`;

        try {
            await sendMail(
                process.env.GMAIL_ID,
                email,
                subject,
                message
            );

            res.status(200).json({
                success: true,
                message: `Reset password email has been sent to ${email} successfully`,
            });
        } catch (error) {
            user.forgotPasswordToken =
                undefined;

            user.forgotPasswordExpiry =
                undefined;

            await user.save();

            return next(
                createError(500, error)
            );
        }
    };

export const resetPassword = async (
    req,
    res,
    next
) => {
    try {
        const { resetToken } =
            req.params;

        const { password } =
            req.body;

        const forgotPasswordToken =
            crypto
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");

        const user =
            await User.findOne({
                forgotPasswordToken,
                forgotPasswordExpiry:
                {
                    $gt: Date.now(),
                },
            });

        if (!user) {
            return next(
                createError(
                    400,
                    "Token is invalid or expired"
                )
            );
        }

        user.password = password;

        user.forgotPasswordToken =
            undefined;

        user.forgotPasswordExpiry =
            undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message:
                "password reset successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const changePassword = async (
    req,
    res,
    next
) => {
    try {
        const {
            oldPassword,
            newPassword,
        } = req.body;

        const userId = req.user.id;

        if (
            !oldPassword ||
            !newPassword
        ) {
            return next(
                createError(
                    404,
                    "All fields are required"
                )
            );
        }

        const user =
            await User.findById(
                userId
            ).select("+password");

        if (!user) {
            return next(
                createError(
                    400,
                    "user does not exist"
                )
            );
        }

        const comparePassword =
            await bcryptjs.compare(
                oldPassword,
                user.password
            );

        if (!comparePassword) {
            return next(
                createError(
                    401,
                    "Invalid old password"
                )
            );
        }

        user.password =
            newPassword;

        await user.save();

        user.password = undefined;

        res.status(200).json({
            success: true,
            message:
                "password changed successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const updateProfile = async (
    req,
    res,
    next
) => {
    try {
        const { name } = req.body;

        const userId = req.user.id;

        const user =
            await User.findById(userId);

        if (!name) {
            return next(
                createError(
                    400,
                    "name is required"
                )
            );
        }

        if (!user) {
            return next(
                createError(
                    400,
                    "user does not exist"
                )
            );
        }

        user.name = name;

        if (req.file) {
            await v2.uploader.destroy(
                user.avatar.public_id,
                {
                    resource_type:
                        "image",
                }
            );

            try {
                const result =
                    await streamUpload(
                        req.file.buffer
                    );

                if (result) {
                    user.avatar.public_id =
                        result.public_id;

                    user.avatar.secure_url =
                        result.secure_url;
                }
            } catch (error) {
                return next(
                    createError(
                        500,
                        error.message ||
                        "file not uploaded"
                    )
                );
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message:
                "profile updated successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};

export const deleteProfile = async (
    req,
    res,
    next
) => {
    try {
        const userId = req.user.id;

        const user =
            await User.findByIdAndDelete(
                userId
            );

        if (!user) {
            return next(
                createError(
                    400,
                    "user does not exist"
                )
            );
        }

        await v2.uploader.destroy(
            user.avatar.public_id,
            {
                resource_type:
                    "image",
            }
        );

        res.status(200).json({
            success: true,
            message:
                "profile deleted successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};