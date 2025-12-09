import { JWT } from 'google-auth-library';
import serviceAccount from "./serviceAccountKey.json";

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

async function getAccessToken(): Promise<string> {
  const jwtClient = new JWT(
    serviceAccount.client_email,
    undefined,
    serviceAccount.private_key,
    SCOPES
  );

  const tokens = await jwtClient.authorize();
  if (!tokens.access_token) {
    throw new Error("Failed to retrieve access token");
  }
  return tokens.access_token;
}

export async function sendPushNotification(
  fcmToken: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
) {
  const accessToken = await getAccessToken();

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data || {}, // optional custom data
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/hakkim-database-42b05/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    console.error("Failed to send FCM notification:", await response.text());
  } else {
    console.log("Notification sent successfully!");
  }
}