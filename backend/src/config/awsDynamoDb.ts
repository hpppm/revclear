import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const testTableName = process.env.DYNAMODB_TEST_TABLE_NAME;

if (!testTableName) {
  console.warn("DYNAMODB_TEST_TABLE_NAME is not set. DynamoDB test operations will not be available.");
}

const dynamoDBClient = new DynamoDBClient({ region });
const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);

export const createItem = async (item: Record<string, any>) => {
  if (!testTableName) throw new Error("DynamoDB test table name not configured.");
  const command = new PutCommand({
    TableName: testTableName,
    Item: item,
  });
  return dynamoDBDocumentClient.send(command);
};

export const getItem = async (key: Record<string, any>) => {
  if (!testTableName) throw new Error("DynamoDB test table name not configured.");
  const command = new GetCommand({
    TableName: testTableName,
    Key: key,
  });
  const { Item } = await dynamoDBDocumentClient.send(command);
  return Item;
};

export const updateItem = async (key: Record<string, any>, updates: Record<string, any>) => {
  if (!testTableName) throw new Error("DynamoDB test table name not configured.");

  const UpdateExpression =
    "SET " + Object.keys(updates).map((k) => `#${k} = :${k}`).join(", ");
  const ExpressionAttributeNames = Object.keys(updates).reduce(
    (acc, k) => ({ ...acc, [`#${k}`]: k }),
    {}
  );
  const ExpressionAttributeValues = Object.keys(updates).reduce(
    (acc, k) => ({ ...acc, [`:${k}`]: updates[k] }),
    {}
  );

  const command = new UpdateCommand({
    TableName: testTableName,
    Key: key,
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: "ALL_NEW",
  });
  const { Attributes } = await dynamoDBDocumentClient.send(command);
  return Attributes;
};

export const deleteItem = async (key: Record<string, any>) => {
  if (!testTableName) throw new Error("DynamoDB test table name not configured.");
  const command = new DeleteCommand({
    TableName: testTableName,
    Key: key,
  });
  return dynamoDBDocumentClient.send(command);
};

export const queryItems = async (
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, any>
) => {
  if (!testTableName) throw new Error("DynamoDB test table name not configured.");
  const command = new QueryCommand({
    TableName: testTableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
  });
  const { Items } = await dynamoDBDocumentClient.send(command);
  return Items;
};

export { dynamoDBClient, dynamoDBDocumentClient, testTableName };
