const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Always log the email to the console so testing the OTP flow locally doesn't require setting up a real email server!
    console.log(`\n================================`);
    console.log(`[LOCAL MOCK EMAIL INTERCEPTED]`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text}`);
    console.log(`================================\n`);

    // If the user has configured real email credentials in their .env, attempt to send it over SMTP.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail', // Standard configuration for Gmail
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"Farm-Connect Support" <${process.env.EMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                text: options.text
            };

            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("Failed to send real email via Nodemailer:", error);
            // We don't throw an error here to prevent taking down the server during local development if credentials are wrong.
        }
    } else {
        console.log("⚠️ Real email was not fully configured. Configure EMAIL_USER and EMAIL_PASS in your backend .env file to enable live emails.");
    }
};

module.exports = sendEmail;
