require("dotenv").config();

async function testSandbox() {
  const apiKey = process.env.CIRCLE_API_KEY;
  console.log("Using API Key:", apiKey);
  
  const response = await fetch("https://api-sandbox.circle.com/v1/w3s/config/entity/publicKey", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  console.log("Status:", response.status);
  console.log("Status Text:", response.statusText);
  const text = await response.text();
  console.log("Body:", text);
}

testSandbox();
