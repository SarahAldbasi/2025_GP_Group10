import emailjs from '@emailjs/browser';

// Initialize EmailJS with environment variables
const SERVICE_ID = 'service_yash97x';
//const TEMPLATE_ID = 'template_xwe5nlb'; 
const VERIFICATION_TEMPLATE_ID = 'template_bys2818';
const PUBLIC_KEY = 'aqlx_rnTgtwFJRNHa';

// Log the presence of environment variables (not their values)
console.log('EmailJS Environment Variables Status:', {
  hasServiceId: !!SERVICE_ID,
  hasTemplateId: !!VERIFICATION_TEMPLATE_ID,
  hasPublicKey: !!PUBLIC_KEY,
  timestamp: new Date().toISOString()
});

// export const sendRefereeInvitation = async (
//   firstName: string, 
//   lastName: string, 
//   email: string,
// ): Promise<boolean> => {
//   try {
//     console.log('Sending email invitation to:', {
//       firstName,
//       lastName,
//       email,
//       timestamp: new Date().toISOString()
//     });

//     // Generate a temporary password (in a real app, you might use a more secure method)
//     const tempPassword = Math.random().toString(36).slice(-8);
    
//     // HTML template specifically for welcome emails - blue themed to distinguish from verification emails
//     const welcomeHtml = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="utf-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1">
//       <title>Welcome to Hakkim</title>
//     </head>
//     <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
//       <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
//         <tr>
//           <td style="padding: 20px; background-color: #3b82f6; color: white;">
//             <h1 style="margin: 0; font-size: 24px;">Welcome to Hakkim</h1>
//           </td>
//         </tr>
//         <tr>
//           <td style="padding: 30px 20px;">
//             <p style="margin-top: 0;">Hello ${firstName},</p>
//             <p>Welcome to Hakkim! Your account has been created successfully.</p>
            
//             <div style="background-color: #f0f7ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
//               <p style="margin-top: 0;"><strong>Getting Started:</strong></p>
//               <ul style="padding-left: 20px; margin-bottom: 0;">
//                 <li>Complete your profile</li>
//                 <li>Submit verification documents</li>
//                 <li>Wait for admin approval</li>
//               </ul>
//             </div>
            
//             <p>If you have any questions, please contact our support team.</p>
//             <p style="margin-bottom: 0;">Best regards,<br>Hakkim Team</p>
//           </td>
//         </tr>
//         <tr>
//           <td style="padding: 15px 20px; background-color: #f4f4f4; font-size: 12px; color: #666; text-align: center;">
//             &copy; 2025 Hakkim. All rights reserved.
//           </td>
//         </tr>
//       </table>
//     </body>
//     </html>
//     `;

//     const response = await emailjs.send(
//       SERVICE_ID,
//       TEMPLATE_ID,
//       {
//         to_name: firstName,
//         to_email: email,
//         generated_password: tempPassword,
//         html_message: welcomeHtml,
//         html: welcomeHtml,
//         content: welcomeHtml,
//         template_type: "welcome_email", // Explicitly indicate this is a welcome email
//         subject: "Welcome to Hakkim",
//         from_name: 'Hakkim Team'
//       },
//       PUBLIC_KEY
//     );

//     console.log('Email successfully sent:', {
//       response,
//       timestamp: new Date().toISOString()
//     });

//     return true;
//   } catch (error) {
//     console.error('Error sending email:', {
//       error,
//       timestamp: new Date().toISOString()
//     });
//     return false;
//   }
// };

/**
 * Send a verification status update email to a referee
 * @param firstName The referee's first name
 * @param email The referee's email address
 * @param isApproved Whether the verification was approved or rejected
 * @returns A boolean indicating if the email was sent successfully
 */
export const sendVerificationStatusEmail = async (
  firstName: string,
  email: string,
  isApproved: boolean
): Promise<boolean> => {
  console.log('Sending verification status email to:', {
    firstName,
    email,
    status: isApproved ? 'approved' : 'rejected',
    timestamp: new Date().toISOString()
  });

  // Get verification-specific EmailJS template ID
  //const SERVICE_ID = 'service_yash97x';
  //const VERIFICATION_TEMPLATE_ID = 'template_bys2818';
  //const PUBLIC_KEY = 'aqlx_rnTgtwFJRNHa';
  
  // if (!VERIFICATION_TEMPLATE_ID) {
  //   console.error('Missing required verification template ID');
  //   return false;
  // }
  
  //console.log('Using dedicated verification template ID:', !!VERIFICATION_TEMPLATE_ID);

  // Prepare messages
  const approvalMessage = 'Congratulations! Your verification documents have been approved. You can now access the full features of the Hakkim app.';
  const rejectionMessage = 'Your document was rejected. Please contact the admin on HakkimOfficial@outlook.com for more information or submit updated documentation.';
  
  // Create complete HTML email templates
  const approvalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verification Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 20px; background-color: #6ab100; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Verification Approved</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px;">
        <p style="margin-top: 0;">Hello ${firstName},</p>
        <p>${approvalMessage}</p>
        
        <div style="background-color: #f7f7f7; border-left: 4px solid #6ab100; padding: 15px; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Next Steps:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>Log in to your Hakkim account</li>
            <li>Check your profile to ensure your details are accurate</li>
            <li>Start viewing available matches</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
        <p style="margin-bottom: 0;">Best regards,<br>Hakkim Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 20px; background-color: #f4f4f4; font-size: 12px; color: #666; text-align: center;">
        &copy; 2025 Hakkim. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  const rejectionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verification Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 20px; background-color: #e11d48; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Verification Not Approved</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px;">
        <p style="margin-top: 0;">Hello ${firstName},</p>
        <p>${rejectionMessage}</p>
        
        <div style="background-color: #f7f7f7; border-left: 4px solid #e11d48; padding: 15px; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Possible Reasons:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>Document quality issues (blurry, incomplete)</li>
            <li>Missing required information</li>
            <li>Document expiration</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact our support team for assistance.</p>
        <p style="margin-bottom: 0;">Best regards,<br>Hakkim Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 20px; background-color: #f4f4f4; font-size: 12px; color: #666; text-align: center;">
        &copy; 2025 Hakkim. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Use simplified params with the dedicated verification template
  // Instead of sending complete HTML, send only the necessary variables
  // The template should already have the HTML structure
  // Simplify the parameters to avoid template condition issues
  // EmailJS has trouble with conditional logic, so we'll send different sets of parameters
  const templateParams = {
    to_name: firstName,
    to_email: email,
    email: email,
    message: isApproved ? approvalMessage : rejectionMessage,
    status_text: isApproved ? "Verification Approved" : "Document Rejected",
    color: isApproved ? "#6ab100" : "#e11d48",
    bullet1: isApproved ? "Log in to your Hakkim account" : "Document quality issues (blurry, incomplete)",
    bullet2: isApproved ? "Check your profile to ensure your details are accurate" : "Missing required information",
    bullet3: isApproved ? "Start viewing available matches" : "Document expiration",
    bullets_header: isApproved ? "What to do next:" : "Possible reasons for rejection:",
    subject: isApproved ? 'Verification Approved' : 'Document Rejected',
    from_name: 'Hakkim Team'
  };

  try {
    console.log(`Sending verification email using dedicated template:`, {
      serviceId: !!SERVICE_ID,
      templateId: !!VERIFICATION_TEMPLATE_ID,
      hasParams: !!templateParams,
      timestamp: new Date().toISOString()
    });
    
    const response = await emailjs.send(
      SERVICE_ID,
      VERIFICATION_TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    console.log('Verification status email successfully sent:', {
      response,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error sending verification email:', errorDetails);
    
    // If it's an EmailJSResponseStatus error, log more details
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('EmailJS error status:', {
        status: (error as any).status,
        text: (error as any).text
      });
    }
    
    console.error('Verification email sending failed');
    return false;
  }
};