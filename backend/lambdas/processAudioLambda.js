import { TranscribeClient, StartMedicalTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || "us-east-1" });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    
    // Extract tenant and encounterID from S3 key path (format: tenant/audio/encounterID/filename)
    const pathParts = key.split('/');
    const tenant = pathParts[0] || 'default';
    const encounterID = pathParts[2] || `encounter-${Date.now()}`;
    
    // Determine file format from extension
    const fileExtension = key.split('.').pop().toLowerCase();
    const mediaFormat = fileExtension === 'mp3' ? 'mp3' : 
                       fileExtension === 'wav' ? 'wav' :
                       fileExtension === 'flac' ? 'flac' :
                       fileExtension === 'mp4' ? 'mp4' : 'wav';

    const jobName = `revclear-${tenant}-${encounterID}-${Date.now()}`;

    // Use Transcribe Medical for healthcare transcription
    const params = {
      MedicalTranscriptionJobName: jobName,
      LanguageCode: "en-US",
      MediaFormat: mediaFormat,
      Media: { MediaFileUri: `s3://${bucket}/${key}` },
      OutputBucketName: bucket,
      OutputKey: `${tenant}/transcripts/${encounterID}/`,
      Specialty: "PRIMARYCARE",
      Type: "DICTATION"
    };

    console.log("Starting Medical Transcription Job:", params);
    const command = new StartMedicalTranscriptionJobCommand(params);
    const response = await transcribeClient.send(command);

    // Track job in DynamoDB
    await dynamoClient.send(new PutCommand({
      TableName: `${process.env.DYNAMODB_TABLE_PREFIX || 'revclear'}-transcription-jobs`,
      Item: {
        jobName: jobName,
        tenant: tenant,
        encounterID: encounterID,
        s3Key: key,
        s3Bucket: bucket,
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
      }
    }));

    console.log("✅ Medical transcription job started:", response);
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        jobName: jobName,
        status: 'IN_PROGRESS',
        encounterID: encounterID,
        tenant: tenant
      }) 
    };
  } catch (error) {
    console.error("❌ Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: error.message,
        errorType: error.name 
      }) 
    };
  }
};
