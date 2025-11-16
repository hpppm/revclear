import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  try {
    const { transcript, patientId, specialty } = JSON.parse(event.body);
    
    if (!transcript || !patientId || !specialty) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: transcript, patientId, specialty' })
      };
    }

    console.log(`Generating codes for patient ${patientId} in ${specialty}`);
    
    // Call Bedrock Claude to generate CPT codes and SOAP summary
    const prompt = `You are a medical coding assistant. Based on the following medical transcript, generate:
1. Appropriate ICD-10 diagnosis codes
2. Appropriate CPT procedure codes
3. A brief SOAP note summary

Transcript:
${transcript}

Provide your response in JSON format:
{
  "icd10_codes": ["code1", "code2"],
  "cpt_codes": ["code1", "code2"],
  "summary": "brief SOAP note with S/O/A/P sections"
}`;

    const bedrockResponse = await bedrockClient.send(new InvokeModelCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const aiText = responseBody.content[0].text;
    
    // Extract JSON from response (Claude sometimes adds markdown)
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);

    console.log("AI Generated:", aiResponse);

    // Save to DynamoDB with PENDING_REVIEW status
    const tableName = `${specialty}_patients`;
    
    await dynamoClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { patient_id: patientId },
      UpdateExpression: "SET icd10_codes = :icd, cpt_codes = :cpt, soap_summary = :soap, review_status = :status, ai_generated_at = :time, transcript = :transcript",
      ExpressionAttributeValues: {
        ":icd": aiResponse.icd10_codes,
        ":cpt": aiResponse.cpt_codes,
        ":soap": aiResponse.summary,
        ":status": "PENDING_REVIEW",
        ":time": new Date().toISOString(),
        ":transcript": transcript
      }
    }));

    console.log("✅ Saved to DynamoDB");

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ...aiResponse,
        patientId,
        specialty,
        status: "PENDING_REVIEW",
        message: "Codes generated successfully. Awaiting clinician review."
      })
    };

  } catch (error) {
    console.error("❌ Error:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        errorType: error.name 
      })
    };
  }
};
