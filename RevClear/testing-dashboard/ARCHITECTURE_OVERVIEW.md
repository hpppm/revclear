# RevClear Architecture Explained

This document explains our project's architecture in simple terms, covering how our system works now and how it can grow in the future.

## Part 1: How We Work on Our Local Computers

When we are developing, we run both the frontend and backend on our own machines. This is the fastest way to build and test new features.

- **`testing-dashboard` (The Frontend):** Runs in your web browser. This is the user interface you see and interact with.
- **`backend` (The Backend Server):** Runs locally on your computer. It listens for requests from the frontend.

The flow is very simple:

`[Your Browser (testing-dashboard)] <--- talks directly to ---> [Your Computer (backend)]`

In this setup, we don't use any AWS cloud services.

---

## Part 2: Our Deployed AWS Setup (The Current Plan)

When we deploy the application to the cloud, we use several AWS services that are automatically set up by our Terraform code. This is the real, scalable architecture.

Here are the key players:

- **Application Load Balancer (ALB):** Think of this as the **Traffic Cop**. It's the main entry point for all user traffic. It directs requests to the correct backend server and manages the load.
- **ECS + Fargate:** This is the **Engine Room**. It's where our main Express `backend` application actually runs. Fargate manages the servers for us so we don't have to.
- **RDS Database:** This is our **Main Library** for data. It's a relational database that stores structured information like user profiles, patient details, and claims.
- **S3 (Simple Storage Service):** This is the **Storage Warehouse**. It's used for storing any kind of file, like uploaded medical documents, images, or audio files.

The flow for a typical request looks like this:

`[User's Browser] ---> [ALB (Traffic Cop)] ---> [ECS Container (Our Backend)] ---> [RDS Database or S3]`

### Anatomy of a Request: A Step-by-Step Example

Let's trace a single request to see how all the pieces work together. Imagine a user clicks a "View Patients" button on our website.

1.  **The Browser (Frontend):** Your browser, running our Next.js application, makes an API call using `fetch` to the public URL of our Application Load Balancer (e.g., `https://api.revclear.com/patients`).

2.  **The ALB (Traffic Cop):** The ALB receives this request from the internet. Its job is to securely pass the request to our backend. It forwards the request to one of the available `backend` containers.

3.  **The ECS Container (Backend):** Our Express.js `backend` server, running inside the container, receives the request. It sees a request for the `/patients` route.

4.  **The Express Route Handler:** The specific function in our code for `/patients` runs. This function knows it needs to get data from the database.

5.  **The AWS SDK:** The route handler uses the AWS SDK (the `pg` library in our case) to securely connect to our **RDS Database** and execute a SQL query, like `SELECT * FROM patients;`.

6.  **The Return Trip:**
    - The **RDS Database** sends the query results back to our `backend` server.
    - The `backend` server formats this data into JSON.
    - The `backend` sends the JSON as a response back to the **ALB**.
    - The **ALB** sends the response back to the user's **Browser**.
    - The frontend application then uses this data to display the list of patients on the screen.

---

## Part 3: Future Possibilities (Powerful Tools We Can Add)

Our current setup is a fantastic and professional foundation. As we grow, we can add even more specialized AWS tools.

### API Gateway: The "Maître d' / Bouncer"

We could add an API Gateway in front of our ALB.

- **What it is:** A service designed specifically to manage APIs.
- **What it does:** It acts like a maître d' at a fancy restaurant. It can check IDs (**Authentication**), enforce a dress code (**Request Validation**), and limit how many people get in (**Rate Limiting & Throttling**).
- **How it would fit:** It would be the new front door.

`[User's Browser] ---> [API Gateway (Bouncer)] ---> [ALB (Traffic Cop)] ---> [Our Backend]`

### AWS Lambda: The "Specialist Helpers"

We can use Lambda functions for specific, isolated jobs.

- **What it is:** A "serverless" function. It's a small piece of code that runs on-demand without needing a server to be running 24/7.
- **What it does:** Think of it as a specialist tool you only pull out when you need it. It's perfect for background tasks.
- **A great example:** Processing a file upload.
  1. A user uploads a document directly to our **S3 Warehouse**.
  2. This upload event automatically triggers a **Lambda function**.
  3. The Lambda function runs, does a single job (like analyzing the document with an AI service), and then shuts down.

This is very efficient and keeps our main `backend` server free to handle other important user requests.

`[User uploads file to S3] ---> (Triggers) ---> [Lambda Function (does one job)]`
