require("dotenv").config();
const crypto = require("crypto");

async function fetchPublicKey(url, apiKey) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });
  return response;
}

async function generateCiphertext() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error("Error: Please make sure CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are set in your .env file.");
    process.exit(1);
  }

  const sandboxUrl = "https://api-sandbox.circle.com/v1/w3s/config/entity/publicKey";
  const productionUrl = "https://api.circle.com/v1/w3s/config/entity/publicKey";

  let response = null;
  let usedUrl = "";

  console.log("Trying to fetch Entity Public Key from Circle Sandbox API...");
  try {
    response = await fetchPublicKey(sandboxUrl, apiKey);
    usedUrl = sandboxUrl;
    
    if (!response.ok && response.status === 401) {
      console.log("Sandbox API returned 401 Unauthorized. Trying Production API URL instead...");
      response = await fetchPublicKey(productionUrl, apiKey);
      usedUrl = productionUrl;
    }
  } catch (err) {
    console.log("Sandbox request failed. Trying Production URL...");
    try {
      response = await fetchPublicKey(productionUrl, apiKey);
      usedUrl = productionUrl;
    } catch (prodErr) {
      console.error("Both network requests failed:", prodErr.message);
      process.exit(1);
    }
  }

  if (!response || !response.ok) {
    const errStatus = response ? response.status : "Unknown";
    const errText = response ? await response.text() : "No response";
    console.error(`\nFailed to fetch public key from both endpoints!`);
    console.error(`Last URL tried: ${usedUrl}`);
    console.error(`Status: ${errStatus}`);
    console.error(`Response: ${errText}`);
    console.error(`\nPlease double check if the API key in your .env file is correct and fully active.`);
    process.exit(1);
  }

  try {
    const json = await response.json();
    const publicKey = json.data.publicKey;
    
    console.log(`Successfully fetched Entity Public Key from ${usedUrl}!`);
    console.log("Encrypting Entity Secret with RSA-OAEP (SHA-256)...");

    const entitySecretBuffer = Buffer.from(entitySecret, "hex");
    
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
        mgf1Hash: "sha256"
      },
      entitySecretBuffer
    );

    const ciphertext = encrypted.toString("base64");
    
    console.log("\n======================================================================");
    console.log("YOUR ENTITY SECRET CIPHERTEXT (Copy and Paste into the Circle Console):");
    console.log("======================================================================");
    console.log(ciphertext);
    console.log("======================================================================\n");

  } catch (error) {
    console.error("Error generating ciphertext:", error.message);
  }
}

generateCiphertext();
