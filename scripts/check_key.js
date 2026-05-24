require("dotenv").config();

async function checkKey() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const response = await fetch("https://api.circle.com/v1/w3s/config/entity/publicKey", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  const json = await response.json();
  console.log("Public Key returned from api.circle.com:");
  console.log(json.data.publicKey);
}

checkKey();
