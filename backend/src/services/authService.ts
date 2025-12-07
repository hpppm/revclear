import {
    signUpUser,
    confirmSignUp,
    signInUser,
    adminConfirmSignUp,
    signOutUser,
    refreshAuthTokens,
    forgotPassword,
    confirmForgotPassword,
} from "../config/awsCognito";
import { createUser, updateUserPractitionerInfo } from "../config/db";
import { appConfig } from "../config/appConfig";

export class AuthService {
    private static allowedEmailDomain = appConfig.auth.testEmailDomain.toLowerCase();
    private static autoConfirmSignups = appConfig.auth.autoConfirmSignup;
    private static autoLoginAfterSignup = appConfig.auth.autoLoginAfterSignup;

    /**
     * Validates if the email domain is allowed for testing.
     */
    static isAllowedEmail(email?: string): boolean {
        if (!email) return false;
        return email.toLowerCase().endsWith(this.allowedEmailDomain);
    }

    /**
     * Handles the signup process including DB creation, auto-confirm, and auto-login logic.
     */
    static async signup(email: string, password: string, attributes: any, practitionerType?: string, licenseId?: string) {
        if (!this.isAllowedEmail(email)) {
            throw new Error(`Email must end with ${this.allowedEmailDomain} for testing`);
        }

        // 1. Sign up in Cognito
        const response = await signUpUser(email, password, attributes);

        // 2. Create user in DB
        if (response.UserSub) {
            try {
                await createUser(
                    response.UserSub,
                    email,
                    attributes.name || "Unknown",
                    practitionerType,
                    licenseId
                );
                console.log(`User ${email} stored in DB with Cognito ID ${response.UserSub}`);
            } catch (dbError: any) {
                console.error("Failed to store user in DB:", dbError);
                if (dbError.code === '23505') { // Duplicate key
                    try {
                        await updateUserPractitionerInfo(email, practitionerType, licenseId);
                        console.log(`Updated practitioner info for existing user ${email}`);
                    } catch (updateError) {
                        console.error("Failed to update practitioner info:", updateError);
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
                autoConfirmResult.success = true;
            } catch (confirmError: any) {
                if (confirmError.name === 'NotAuthorizedException' && confirmError.message.includes('Current status is CONFIRMED')) {
                    autoConfirmResult.success = true;
                } else {
                    console.warn("Auto confirm failed:", confirmError);
                    autoConfirmResult.success = false;
                    autoConfirmResult.error = confirmError?.message || "Failed to auto confirm user.";
                }
            }
        }

        if (this.autoLoginAfterSignup) {
            if (!this.autoConfirmSignups || autoConfirmResult.success !== false) {
                try {
                    const loginResponse = await signInUser(email, password);
                    authenticationResult = loginResponse.AuthenticationResult;
                    autoLoginResult.success = true;
                } catch (loginError: any) {
                    console.warn("Auto login failed:", loginError);
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
            response,
        };
    }

    /**
     * Handles signin with auto-confirm retry logic.
     */
    static async signin(email: string, password: string) {
        if (!this.isAllowedEmail(email)) {
            throw new Error(`Email must end with ${this.allowedEmailDomain} for testing`);
        }

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
        if (!this.isAllowedEmail(email)) {
            throw new Error(`Email must end with ${this.allowedEmailDomain} for testing`);
        }
        return confirmSignUp(email, code);
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
}
