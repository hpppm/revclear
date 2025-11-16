import { TranscribeClient, StartMedicalTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const transcribeClient = new TranscribeClient({ region: "us-east-1" });
const s3Client = new S3Client({ region: "us-east-1" });

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  try {
    const { audioData, fileName, patientId, specialty } = JSON.parse(event.body);
    
    if (!audioData || !patientId || !specialty) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: audioData, patientId, specialty' })
      };
    }

    // Upload audio to S3
    const s3Key = `${specialty}/audio/${patientId}/${fileName || 'audio.wav'}`;
    console.log(`Uploading to S3: ${s3Key}`);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: "arevclear",
      Key: s3Key,
      Body: Buffer.from(audioData, 'base64'),
      ContentType: 'audio/wav'
    }));

    // Start Transcribe Medical job
    const jobName = `${specialty}-${patientId}-${Date.now()}`;
    console.log(`Starting transcription job: ${jobName}`);
    
    const transcribeResponse = await transcribeClient.send(new StartMedicalTranscriptionJobCommand({
      MedicalTranscriptionJobName: jobName,
      LanguageCode: "en-US",
      MediaFormat: "wav",
      Media: { MediaFileUri: `s3://arevclear/${s3Key}` },
      OutputBucketName: "arevclear",
      OutputKey: `${specialty}/transcripts/${patientId}/`,
      Specialty: "PRIMARYCARE",
      Type: "DICTATION"
    }));

    console.log("✅ Transcription job started:", transcribeResponse);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        jobName,
        status: 'IN_PROGRESS',
        patientId,
        specialty,
        message: 'Transcription started successfully. Check back in 2-3 minutes.'
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
