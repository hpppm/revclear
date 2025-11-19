"use client";

import Card from './ui/Card'; // New import

export default function DynamoDBPanel({ tableName }) {
  return (
    <Card header={<h3>DynamoDB testing console</h3>} className="service-panel">
      <p className="details">
        The backend is configured to use the following DynamoDB table for testing: <code>{tableName || 'Not configured'}</code>.
      </p>
      <small>
        Further functionality to interact with this table can be built out here.
      </small>
    </Card>
  );
}
