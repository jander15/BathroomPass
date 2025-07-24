// netlify/functions/proxy.js
const { URL } = require('url');

// Define your frontend origin as a constant to avoid repetition and errors
const FRONTEND_ORIGIN = "https://jander15.github.io";

exports.handler = async (event, context) => {
  // Create a reusable object for the CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS", // Only allow POST and OPTIONS
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // The browser sends an OPTIONS request first to check permissions (pre-flight)
  // We must respond to this correctly.
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // 204 No Content is the standard for a successful pre-flight
      headers: corsHeaders,
      body: "",
    };
  }

  // Block any requests that are not POST, but send the CORS header with the error
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // 405 Method Not Allowed
      headers: corsHeaders, 
      body: "Method Not Allowed",
    };
  }

  // Your Apps Script URL
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIalB21jM1-vuBfJTpRjtwMc1jJYe0XL5SqCozJCzyNrpd6SBF0Mh_RXITRY5yC-Po/exec";

  try {
    const requestBody = JSON.parse(event.body);

    const appsScriptResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!appsScriptResponse.ok) {
        const errorText = await appsScriptResponse.text();
        console.error(`Apps Script Error: ${errorText}`);
        // Ensure even the error response from Apps Script gets CORS headers
        return {
            statusCode: appsScriptResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ result: "error", error: `Apps Script Error: ${errorText}` }),
        };
    }

    const appsScriptData = await appsScriptResponse.json();

    // The successful response
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(appsScriptData),
    };

  } catch (error) {
    console.error("Proxy function caught an error:", error);
    // Ensure any internal proxy errors also get CORS headers
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ result: "error", error: "Internal Proxy Error: " + error.message }),
    };
  }
};