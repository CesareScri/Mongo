import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sendMail = async (email, code, isReset) => {
  // Create a transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ionos.it", // Replace with your SMTP server
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "info@lexai.me",
      pass: "Qwerty2020!",
    },
  });

  // Determine the template file name based on the type of email
  const templateFileName = isReset ? "reset.html" : "otp.html";
  const templateFilePath = path.join(
    __dirname,
    "emailTemplates",
    isReset ? "reset" : "otp",
    templateFileName
  );

  // Read the HTML content from the file
  const htmlContent = fs.readFileSync(templateFilePath, "utf8");

  // Send the email
  let info = await transporter.sendMail({
    from: `"Lexa'ai" info@lexai.me`, // sender address
    to: email, // list of receivers
    subject: isReset
      ? `Reset Your Password for Lexa'ai`
      : `Verify Your Email for Lexa'ai`, // Subject line
    html: isReset
      ? htmlContent.replace("${temporaryPassword}", code)
      : htmlContent.replace("${code}", code), // html body
  });

  console.log("Message sent:", info.messageId);
};

export default sendMail;
