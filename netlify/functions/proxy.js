// netlify/functions/proxy.js
const { URL } = require('url');

exports.handler = async (event, context) => {
  // Allow OPTIONS preflight requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://jander15.github.io", # IMPORTANT: Match your exact GitHub Pages origin
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Include any custom headers your frontend sends
        "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
      },
      body: "",
    };
  }

  // Only allow POST requests for the actual data
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Your Google Apps Script Web App URL
  const APPS_SCRIPT_URL = "https://script.google.com/a/macros/aspenk12.net/s/AKfycbzIalB21jM1-vuBfJTpRjtwMc1jJYe0XL5SqCozJCzyNrpd6SBF0Mh_RXITRY5yC-Po/exec"; // IMPORTANT: Use YOUR Apps Script URL

  // The origin where your frontend is hosted (for CORS response)
  const FRONTEND_ORIGIN = "https://jander15.github.io"; // IMPORTANT: Match your exact GitHub Pages origin

  try {
    const requestBody = JSON.parse(event.body); // Parse the JSON body from the frontend

    // Make the server-to-server POST request to Google Apps Script
    const appsScriptResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No 'Authorization' header needed here unless your Apps Script expects one directly
        // and you're passing a custom token for that
      },
      body: JSON.stringify(requestBody), // Send the entire frontend payload (idToken, action, etc.)
    });

    // Check if the Apps Script response was successful (e.g., 200 OK)
    if (!appsScriptResponse.ok) {
        // If Apps Script returned an error, capture its details
        const errorText = await appsScriptResponse.text();
        console.error(`Apps Script Error Response Status: ${appsScriptResponse.status}, Body: ${errorText}`);
        return {
            statusCode: appsScriptResponse.status,
            headers: {
                "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
                "Content-Type": "application/json", // Assuming your Apps Script errors are JSON
            },
            body: JSON.stringify({ 
                result: "error", 
                error: `Apps Script responded with status ${appsScriptResponse.status}. Details: ${errorText.substring(0, 200)}...` // Truncate long errors
            }),
        };
    }

    const appsScriptData = await appsScriptResponse.json();

    // Send the Apps Script response back to the frontend with CORS headers
    return {
      statusCode: appsScriptResponse.status,
      headers: {
        "Access-Control-Allow-Origin": FRONTEND_ORIGIN, // Crucial for CORS
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Match headers your frontend sends
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appsScriptData),
    };
  } catch (error) {
    console.error("Proxy function caught an error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ result: "error", error: "Internal Proxy Error: " + error.message }),
    };
  }
};