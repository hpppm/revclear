// AWS CloudWatch Logging Configuration
import { 
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

const region = process.env.AWS_REGION || 'us-east-1';
const logGroupName = process.env.AWS_LOG_GROUP || '/aws/revclear/production';
const logStreamName = `backend-${new Date().toISOString().split('T')[0]}`;

const cloudWatchClient = new CloudWatchLogsClient({ region });

let sequenceToken: string | undefined;

/**
 * Initialize CloudWatch log stream
 */
async function initializeLogStream() {
  try {
    // Check if stream exists
    const describeCommand = new DescribeLogStreamsCommand({
      logGroupName,
      logStreamNamePrefix: logStreamName,
    });
    
    const response = await cloudWatchClient.send(describeCommand);
    
    if (response.logStreams && response.logStreams.length > 0) {
      sequenceToken = response.logStreams[0].uploadSequenceToken;
    } else {
      // Create new stream
      const createCommand = new CreateLogStreamCommand({
        logGroupName,
        logStreamName,
      });
      await cloudWatchClient.send(createCommand);
    }
  } catch (error) {
    console.error('Error initializing CloudWatch log stream:', error);
  }
}

/**
 * Log message to CloudWatch
 */
export async function logToCloudWatch(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') {
  if (!sequenceToken) {
    await initializeLogStream();
  }

  try {
    const command = new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          message: `[${level}] ${message}`,
          timestamp: Date.now(),
        },
      ],
      sequenceToken,
    });

    const response = await cloudWatchClient.send(command);
    sequenceToken = response.nextSequenceToken;
  } catch (error) {
    console.error('Error logging to CloudWatch:', error);
  }
}

/**
 * Logger wrapper for easy use
 */
export const logger = {
  info: (message: string) => logToCloudWatch(message, 'INFO'),
  error: (message: string) => logToCloudWatch(message, 'ERROR'),
  warn: (message: string) => logToCloudWatch(message, 'WARN'),
};

// Initialize on module load
initializeLogStream();

export { cloudWatchClient };
