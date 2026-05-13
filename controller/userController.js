import createError from "../utils/error.js";
import User from "../models/userModel.js";
import bcryptjs from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import sendMail from "../utils/sendMail.js";
import crypto from "crypto";

const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
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

export const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return next(
                createError(
                    401,
                    "All input fields required"
                )
            );
        }

        const userExists = await User.findOne({
            email,
        });

        if (userExists) {
            return res.status(401).json({
                success: false,
                message: "Email already exists",
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
                    error.errors[key].message
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
                        "file not uploaded"
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
        const { email, password } =
            req.body;

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
                    "User not found"
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
                "User logout successfully",
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
        const user = await User.findById(
            req.user.id
        );

        res.status(200).json({
            success: true,
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
        try {
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
                        "User not found"
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

            const message = `
                Click below to reset password:
                ${resetPasswordUrl}
            `;

            await sendMail(
                process.env.GMAIL_ID,
                email,
                subject,
                message
            );

            res.status(200).json({
                success: true,
                message:
                    "Reset password mail sent",
            });
        } catch (error) {
            return next(
                createError(500, error.message)
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
                    "Token invalid or expired"
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
                "Password reset successfully",
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

        const user =
            await User.findById(
                req.user.id
            ).select("+password");

        if (!user) {
            return next(
                createError(
                    404,
                    "User not found"
                )
            );
        }

        const isMatch =
            await bcryptjs.compare(
                oldPassword,
                user.password
            );

        if (!isMatch) {
            return next(
                createError(
                    401,
                    "Old password incorrect"
                )
            );
        }

        user.password = newPassword;

        await user.save();

        res.status(200).json({
            success: true,
            message:
                "Password changed successfully",
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

        const user =
            await User.findById(
                req.user.id
            );

        if (!user) {
            return next(
                createError(
                    404,
                    "User not found"
                )
            );
        }

        if (name) {
            user.name = name;
        }

        if (req.file) {
            await cloudinary.uploader.destroy(
                user.avatar.public_id,
                {
                    resource_type:
                        "image",
                }
            );

            const result =
                await streamUpload(
                    req.file.buffer
                );

            user.avatar.public_id =
                result.public_id;

            user.avatar.secure_url =
                result.secure_url;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message:
                "Profile updated successfully",
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
        const user =
            await User.findByIdAndDelete(
                req.user.id
            );

        if (!user) {
            return next(
                createError(
                    404,
                    "User not found"
                )
            );
        }

        await cloudinary.uploader.destroy(
            user.avatar.public_id,
            {
                resource_type:
                    "image",
            }
        );

        res.status(200).json({
            success: true,
            message:
                "Profile deleted successfully",
        });
    } catch (error) {
        return next(
            createError(500, error.message)
        );
    }
};