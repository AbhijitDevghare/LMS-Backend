import nodemailer from 'nodemailer'

const sendMail = async (fromMail, toMail, subject, message) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })

    await transporter.sendMail({
        from: fromMail,
        to: toMail,
        subject: subject,
        html: message
    })
}

export default sendMail
