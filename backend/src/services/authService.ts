import {
    signUpUser,
    confirmSignUp,
    signInUser,
    adminConfirmSignUp,
    signOutUser,
    refreshAuthTokens,
    forgotPassword,
    confirmForgotPassword,
    adminMarkEmailVerified,
    adminAddUserToGroup,
    respondToSoftwareTokenMfa,
    associateSoftwareToken,
    verifySoftwareToken,
    respondToMfaSetup,
} from "../config/awsCognito";
import { createUser, updateUserPractitionerInfo } from "../config/db";
import { appConfig } from "../config/appConfig";
import logger from "../utils/logger";

export class AuthService {
    private static autoConfirmSignups = appConfig.auth.autoConfirmSignup;
    private static autoLoginAfterSignup = appConfig.auth.autoLoginAfterSignup;

    /**
     * Handles the signup process including DB creation, auto-confirm, and auto-login logic.
     */
    static async signup(email: string, password: string, attributes: any, practitionerType?: string, licenseId?: string) {
        // Build full_name from firstName + lastName; send combined as Cognito `name` attribute
        const firstName: string = (attributes?.firstName || "").trim();
        const lastName: string = (attributes?.lastName || "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
        const cognitoAttributes: Record<string, string> = fullName !== "Unknown" ? { name: fullName } : {};

        // 1. Sign up in Cognito
        const response = await signUpUser(email, password, cognitoAttributes);

        // 2. Create user in DB
        if (response.UserSub) {
            try {
                await createUser(
                    response.UserSub,
                    email,
                    fullName,
                    practitionerType,
                    licenseId
                );
                logger.info({ userId: response.UserSub }, 'User stored in DB');
            } catch (dbError: any) {
                logger.error({ err: dbError }, 'Failed to store user in DB');
                if (dbError.code === '23505') { // Duplicate key
                    try {
                        await updateUserPractitionerInfo(email, practitionerType, licenseId);
                        logger.info({ userId: response.UserSub }, 'Updated practitioner info for existing user');
                    } catch (updateError) {
                        logger.error({ err: updateError }, 'Failed to update practitioner info');
                    }
                }
            }
        }

        // 3. Handle Auto-Confirm and Auto-Login
        const autoConfirmResult: { enabled: boolean; success?: boolean; error?: string } = {
            enabled: this.autoConfirmSignups,
        };
        const autoLoginResult: { enabled: boolean; success?: boolean; error?: string } = {
            enabled: this.autoLoginAfterSignup,
        };
        let authenticationResult: any;

        if (this.autoConfirmSignups) {
            try {
                await adminConfirmSignUp(email);
                // Also mark email as verified so password reset works
                await adminMarkEmailVerified(email);
                await adminAddUserToGroup(email, "Users");
                logger.info({ email }, 'User auto-assigned to Users group');
                
                autoConfirmResult.success = true;
            } catch (confirmError: any) {
                if (confirmError.name === 'NotAuthorizedException' && confirmError.message.includes('Current status is CONFIRMED')) {
                    autoConfirmResult.success = true;
                } else {
                    logger.warn({ err: confirmError }, 'Auto confirm failed');
                    autoConfirmResult.success = false;
                    autoConfirmResult.error = confirmError?.message || "Failed to auto confirm user.";
                }
            }
        }

        let mfaChallenge: { challengeName: string; session: string } | undefined;

        if (this.autoLoginAfterSignup) {
            if (!this.autoConfirmSignups || autoConfirmResult.success !== false) {
                try {
                    const loginResponse = await signInUser(email, password);
                    if (
                        loginResponse.ChallengeName === 'SOFTWARE_TOKEN_MFA' ||
                        loginResponse.ChallengeName === 'MFA_SETUP'
                    ) {
                        mfaChallenge = {
                            challengeName: loginResponse.ChallengeName,
                            session: loginResponse.Session!,
                        };
                        autoLoginResult.success = true;
                    } else {
                        authenticationResult = loginResponse.AuthenticationResult;
                        autoLoginResult.success = true;
                    }
                } catch (loginError: any) {
                    logger.warn({ err: loginError }, 'Auto login failed');
                    autoLoginResult.success = false;
                    autoLoginResult.error = loginError?.message || "Failed to auto login user.";
                }
            } else {
                autoLoginResult.success = false;
                autoLoginResult.error = "Skipped auto login because confirmation failed.";
            }
        }

        // 4. Construct Message
        const messages = ["User signed up successfully."];
        if (this.autoConfirmSignups) {
            messages.push(
                autoConfirmResult.success
                    ? "Account auto-confirmed for testing."
                    : "Auto confirmation failed; please confirm manually."
            );
        } else {
            messages.push("Check your inbox for the verification code.");
        }
        if (this.autoLoginAfterSignup && autoLoginResult.success) {
            messages.push("Authentication tokens are included.");
        } else if (this.autoLoginAfterSignup && autoLoginResult.error) {
            messages.push("Automatic login failed; try signing in manually.");
        }

        return {
            message: messages.join(" "),
            autoConfirm: autoConfirmResult,
            autoLogin: autoLoginResult,
            AuthenticationResult: authenticationResult,
            mfaChallenge,
            response,
        };
    }

    /**
     * Handles signin with auto-confirm retry logic.
     */
    static async signin(email: string, password: string) {
        try {
            return await signInUser(email, password);
        } catch (error: any) {
            // Retry with auto-confirm if enabled and user is not confirmed
            if (error.name === "UserNotConfirmedException" && this.autoConfirmSignups) {
                try {
                    await adminConfirmSignUp(email);
                    const response = await signInUser(email, password);
                    return {
                        ...response,
                        _autoConfirmed: true, // Internal flag to indicate auto-confirmation happened
                    };
                } catch (confirmError: any) {
                    if (confirmError.name === 'NotAuthorizedException' && confirmError.message.includes('Current status is CONFIRMED')) {
                        // Already confirmed, retry signin
                        return await signInUser(email, password);
                    }
                    throw confirmError; // Re-throw confirm error if it failed
                }
            }
            throw error; // Re-throw original error
        }
    }

    static async confirmSignup(email: string, code: string) {
        const result = await confirmSignUp(email, code);
        // Add to the Users group so this user has the same group membership
        // as auto-confirmed users. Failure is non-fatal — user can still sign in.
        try {
            await adminAddUserToGroup(email, "Users");
        } catch (err: any) {
            logger.warn({ err: err?.message, email }, "confirmSignup: failed to add user to Users group");
        }
        return result;
    }

    static async signout(accessToken: string) {
        return signOutUser(accessToken);
    }

    static async refreshToken(token: string) {
        return refreshAuthTokens(token);
    }

    static async forgotPassword(email: string) {
        return forgotPassword(email);
    }

    static async confirmForgotPassword(email: string, code: string, newPassword: string) {
        return confirmForgotPassword(email, code, newPassword);
    }

    static async respondToMfaChallenge(email: string, session: string, code: string) {
        return respondToSoftwareTokenMfa(email, session, code);
    }

    static async associateTotp(params: { accessToken: string } | { session: string }) {
        return associateSoftwareToken(params);
    }

    static async verifyTotpSetup(
        params: { accessToken: string } | { session: string },
        code: string,
    ) {
        return verifySoftwareToken(params, code);
    }

    static async completeMfaSetup(email: string, session: string) {
        return respondToMfaSetup(email, session);
    }
}