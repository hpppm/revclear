import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const mockCognitoSend = jest.fn();
const mockGetSigningKey = jest.fn(
  (_kid: string, callback: (err: unknown, key?: { getPublicKey: () => string }) => void) => {
    callback(null, { getPublicKey: () => "public-key" });
  }
);
const mockJwtVerify = jest.fn(
  (_token: string, getKey: any, _opts: any, callback: (err: unknown, payload?: any) => void) => {
    getKey({ kid: "test-kid" }, () => {
      callback(null, { sub: "test-user" });
    });
  }
);

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: mockCognitoSend })),
  SignUpCommand: jest.fn((input) => ({ type: "SignUpCommand", input })),
  ConfirmSignUpCommand: jest.fn((input) => ({ type: "ConfirmSignUpCommand", input })),
  InitiateAuthCommand: jest.fn((input) => ({ type: "InitiateAuthCommand", input })),
  AdminCreateUserCommand: jest.fn((input) => ({ type: "AdminCreateUserCommand", input })),
  AdminSetUserPasswordCommand: jest.fn((input) => ({ type: "AdminSetUserPasswordCommand", input })),
  AdminConfirmSignUpCommand: jest.fn((input) => ({ type: "AdminConfirmSignUpCommand", input })),
  DescribeUserPoolClientCommand: jest.fn((input) => ({
    type: "DescribeUserPoolClientCommand",
    input,
  })),
}));

jest.mock("jwks-rsa", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: mockGetSigningKey,
  })),
}));

jest.mock("jsonwebtoken", () => ({
  verify: mockJwtVerify,
}));

const mockSignUpCommand = SignUpCommand as jest.Mock;
const mockConfirmSignUpCommand = ConfirmSignUpCommand as jest.Mock;
const mockInitiateAuthCommand = InitiateAuthCommand as jest.Mock;
const mockAdminCreateUserCommand = AdminCreateUserCommand as jest.Mock;
const mockAdminSetUserPasswordCommand = AdminSetUserPasswordCommand as jest.Mock;
const mockAdminConfirmSignUpCommand = AdminConfirmSignUpCommand as jest.Mock;
const mockDescribeUserPoolClientCommand =
  DescribeUserPoolClientCommand as jest.Mock;

describe("AWS Cognito helpers (TypeScript)", () => {
  let awsCognito: typeof import("../src/config/awsCognito");

  beforeEach(() => {
    jest.resetModules();
    process.env.AWS_USER_POOL_ID = "pool-123";
    process.env.AWS_CLIENT_ID = "client-abc";
    awsCognito = require("../src/config/awsCognito");
    mockCognitoSend.mockClear();
    mockJwtVerify.mockClear();
    mockGetSigningKey.mockClear();
    mockSignUpCommand.mockClear();
    mockConfirmSignUpCommand.mockClear();
    mockInitiateAuthCommand.mockClear();
    mockAdminCreateUserCommand.mockClear();
    mockAdminSetUserPasswordCommand.mockClear();
    mockAdminConfirmSignUpCommand.mockClear();
    mockDescribeUserPoolClientCommand.mockClear();
  });

  it("exposes the configured pool/client identifiers", () => {
    expect(awsCognito.userPoolId).toBe("pool-123");
    expect(awsCognito.clientId).toBe("client-abc");
  });

  it("issues commands for signup, confirmation, and authentication", async () => {
    await awsCognito.signUpUser("test@example.com", "Secret123!");
    expect(mockSignUpCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "test@example.com",
        ClientId: "client-abc",
      })
    );

    await awsCognito.confirmSignUp("test@example.com", "123456");
    expect(mockConfirmSignUpCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "test@example.com",
        ConfirmationCode: "123456",
      })
    );

    await awsCognito.signInUser("test@example.com", "Secret123!");
    expect(mockInitiateAuthCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        AuthParameters: expect.objectContaining({
          USERNAME: "test@example.com",
          PASSWORD: "Secret123!",
        }),
      })
    );
  });

  it("creates admin users and sets permanent passwords", async () => {
    await awsCognito.adminCreateUser("admin@example.com", "TempPass1!");
    expect(mockAdminCreateUserCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "admin@example.com",
        TemporaryPassword: "TempPass1!",
      })
    );

    await awsCognito.adminSetUserPassword("admin@example.com", "Secret123!");
    expect(mockAdminSetUserPasswordCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "admin@example.com",
        Password: "Secret123!",
        Permanent: true,
      })
    );
  });

  it("confirms users via the admin flow", async () => {
    await awsCognito.adminConfirmSignUp("admin@example.com");
    expect(mockAdminConfirmSignUpCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "admin@example.com",
        UserPoolId: "pool-123",
      })
    );
  });

  it("verifies tokens against the JWKS endpoint", async () => {
    await expect(awsCognito.verifyToken("dummy-token")).resolves.toEqual(
      expect.objectContaining({ sub: "test-user" })
    );
    expect(mockJwtVerify).toHaveBeenCalled();
    expect(mockGetSigningKey).toHaveBeenCalledWith("test-kid", expect.any(Function));
  });

  it("describes the configured user pool client", async () => {
    await awsCognito.checkCognitoConnectivity();
    expect(mockDescribeUserPoolClientCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        UserPoolId: "pool-123",
        ClientId: "client-abc",
      })
    );
  });
});
