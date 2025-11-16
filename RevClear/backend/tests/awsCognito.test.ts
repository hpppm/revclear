const mockCognitoSend = jest.fn();
const mockGetSigningKey = jest.fn(
  (kid: string, callback: (err: unknown, key?: { getPublicKey: () => string }) => void) => {
    callback(null, {
      getPublicKey: () => "public-key",
    });
  }
);
const mockJwtVerify = jest.fn(
  (
    token: string,
    getKey: (header: unknown, cb: (err: unknown, key?: string) => void) => void,
    _opts: unknown,
    callback: (err: unknown, decoded?: unknown) => void
  ) => {
    getKey({ kid: "test-kid" }, () => {
      callback(null, { sub: "test-user" });
    });
  }
);

const SignUpCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "SignUpCommand",
  input,
}));
const ConfirmSignUpCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "ConfirmSignUpCommand",
  input,
}));
const InitiateAuthCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "InitiateAuthCommand",
  input,
}));
const AdminCreateUserCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "AdminCreateUserCommand",
  input,
}));
const AdminSetUserPasswordCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "AdminSetUserPasswordCommand",
  input,
}));
const AdminConfirmSignUpCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "AdminConfirmSignUpCommand",
  input,
}));
const DescribeUserPoolClientCommand = jest.fn((input: Record<string, unknown>) => ({
  type: "DescribeUserPoolClientCommand",
  input,
}));

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: mockCognitoSend })),
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  DescribeUserPoolClientCommand,
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

type AwsCognitoModule = typeof import("../src/config/awsCognito");
let awsCognito: AwsCognitoModule;

describe("AWS Cognito helpers", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.AWS_USER_POOL_ID = "pool-123";
    process.env.AWS_CLIENT_ID = "client-abc";
    awsCognito = require("../src/config/awsCognito");
    mockCognitoSend.mockClear();
    mockJwtVerify.mockClear();
    mockGetSigningKey.mockClear();
    SignUpCommand.mockClear();
    ConfirmSignUpCommand.mockClear();
    InitiateAuthCommand.mockClear();
    AdminCreateUserCommand.mockClear();
    AdminSetUserPasswordCommand.mockClear();
    AdminConfirmSignUpCommand.mockClear();
    DescribeUserPoolClientCommand.mockClear();
  });

  it("exposes the configured pool/client identifiers", () => {
    expect(awsCognito.userPoolId).toBe("pool-123");
    expect(awsCognito.clientId).toBe("client-abc");
  });

  it("issues commands for signup, confirmation, and authentication", async () => {
    await awsCognito.signUpUser("test@example.com", "Secret123!");
    expect(SignUpCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "test@example.com",
        ClientId: "client-abc",
      })
    );
    await awsCognito.confirmSignUp("test@example.com", "123456");
    expect(ConfirmSignUpCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "test@example.com",
        ConfirmationCode: "123456",
      })
    );
    await awsCognito.signInUser("test@example.com", "Secret123!");
    expect(InitiateAuthCommand).toHaveBeenCalledWith(
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
    expect(AdminCreateUserCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "admin@example.com",
        TemporaryPassword: "TempPass1!",
      })
    );
    await awsCognito.adminSetUserPassword("admin@example.com", "Secret123!");
    expect(AdminSetUserPasswordCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Username: "admin@example.com",
        Password: "Secret123!",
        Permanent: true,
      })
    );
  });

  it("confirms users via the admin flow", async () => {
    await awsCognito.adminConfirmSignUp("admin@example.com");
    expect(AdminConfirmSignUpCommand).toHaveBeenCalledWith(
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
    expect(DescribeUserPoolClientCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        UserPoolId: "pool-123",
        ClientId: "client-abc",
      })
    );
  });
});
