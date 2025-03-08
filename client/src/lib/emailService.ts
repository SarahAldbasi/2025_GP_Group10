
import emailjs from '@emailjs/browser';

// Initialize EmailJS with your service ID (should be stored in env variables for production)
// For testing purposes they are hardcoded here
const SERVICE_ID = 'service_yash97x';  // Replace with your EmailJS service ID
const TEMPLATE_ID = 'template_xwe5nlb';  // Replace with your EmailJS template ID
const PUBLIC_KEY = 'aqlx_rnTgtwFJRNHa';  // Replace with your EmailJS public key

export const sendRefereeInvitation = async (
  firstName: string, 
  lastName: string, 
  email: string,
): Promise<boolean> => {
  try {
    console.log('Sending email invitation to:', {
      firstName,
      lastName,
      email,
      timestamp: new Date().toISOString()
    });

    // Generate a temporary password (in a real app, you might use a more secure method)
    const tempPassword = Math.random().toString(36).slice(-8);

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name: firstName,
        to_email: email,
        generated_password: tempPassword,
        from_name: 'Hakkim Team'
      },
      PUBLIC_KEY
    );

    console.log('Email successfully sent:', {
      response,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', {
      error,
      timestamp: new Date().toISOString()
    });
    return false;
  }
};
