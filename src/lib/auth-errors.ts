export interface AuthErrorInfo {
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Maps any auth error (Clerk error object, OAuth query parameter, network failure, or exception)
 * into a clear, friendly, human-readable message.
 *
 * Never exposes raw error objects, stack traces, or internal error codes to users.
 */
export function getAuthErrorMessage(
  error: unknown,
  context: "sign-in" | "sign-up" = "sign-in"
): AuthErrorInfo {
  if (!error) {
    return {
      title: "Sign-in Error",
      message: "Something went wrong while signing in. Please try again.",
    };
  }

  // 1. Check if error is a string (e.g. query param `?error=...` or raw code)
  let code = "";
  let rawMessage = "";

  if (typeof error === "string") {
    code = error.toLowerCase();
    rawMessage = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;

    // Handle Clerk API Response Error format: { errors: [{ code, message, longMessage }] }
    if (Array.isArray(errObj.errors) && errObj.errors.length > 0) {
      const firstErr = errObj.errors[0] as Record<string, unknown>;
      code = String(firstErr.code || "").toLowerCase();
      rawMessage = String(firstErr.longMessage || firstErr.message || "");
    } else {
      code = String(errObj.code || errObj.status || "").toLowerCase();
      rawMessage = String(errObj.message || "");
    }
  }

  const normalized = (code + " " + rawMessage).toLowerCase();

  // 2. Offline / Network error (browser only)
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return {
      title: "No Internet Connection",
      message: "Network problem. Please check your internet connection and try again.",
    };
  }

  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("connection") ||
    code === "network_error"
  ) {
    return {
      title: "Connection Problem",
      message: "Network problem. Please check your internet connection and try again.",
    };
  }

  // 3. Popup window blocked
  if (
    normalized.includes("popup_blocked") ||
    normalized.includes("blocked_by_client") ||
    normalized.includes("window was blocked")
  ) {
    return {
      title: "Popup Window Blocked",
      message: "Your browser blocked the sign-in window. Please allow popups for this site and try again.",
    };
  }

  // 4. Popup closed / cancelled by the user
  if (
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("popup_closed") ||
    normalized.includes("user_cancelled") ||
    normalized.includes("closed by user") ||
    code === "oauth_cancelled" ||
    code === "access_denied" && normalized.includes("cancel")
  ) {
    return {
      title: "Sign-in Cancelled",
      message: "Sign-in was cancelled. Please try again.",
    };
  }

  // 5. Access denied / permissions refused
  if (
    code === "oauth_access_denied" ||
    code === "access_denied" ||
    normalized.includes("permission") ||
    normalized.includes("consent_denied") ||
    normalized.includes("denied access")
  ) {
    return {
      title: "Permission Denied",
      message: "Google sign-in permission was denied. Please try again and allow access.",
    };
  }

  // 6. Account disabled / locked
  if (
    code === "account_disabled" ||
    code === "user_locked" ||
    normalized.includes("disabled") ||
    normalized.includes("banned") ||
    normalized.includes("suspended")
  ) {
    return {
      title: "Account Disabled",
      message: "This account has been disabled. Please contact support.",
    };
  }

  // 7. Rate limiting / too many attempts
  if (
    code === "too_many_attempts" ||
    code === "too_many_requests" ||
    code === "rate_limit_exceeded" ||
    normalized.includes("too many attempts") ||
    normalized.includes("too many requests") ||
    normalized.includes("rate limit")
  ) {
    return {
      title: "Too Many Attempts",
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  // 8. Sign-up specific: Account already exists
  if (context === "sign-up") {
    if (
      code === "form_identifier_exists" ||
      code === "identifier_already_signed_in" ||
      code === "external_account_exists" ||
      normalized.includes("already exists") ||
      normalized.includes("taken") ||
      normalized.includes("already registered")
    ) {
      return {
        title: "Account Already Exists",
        message: "This Google account already has an account. Please sign in instead.",
        action: {
          label: "Sign in",
          href: "/sign-in",
        },
      };
    }
  }

  // 9. Sign-in specific: Account not found / user not registered
  if (context === "sign-in") {
    if (
      code === "form_identifier_not_found" ||
      code === "account_not_found" ||
      code === "external_account_not_found" ||
      code === "user_not_found" ||
      normalized.includes("no account found") ||
      normalized.includes("user not found") ||
      normalized.includes("identifier not found") ||
      normalized.includes("not registered")
    ) {
      return {
        title: "No Account Found",
        message: "No account found with this Google email. Please create an account first, then sign in.",
        action: {
          label: "Create account",
          href: "/sign-up",
        },
        secondaryAction: {
          label: "Try another account",
        },
      };
    }

    // 10. Email/password: Wrong password or combination
    if (
      code === "form_password_incorrect" ||
      code === "form_password_pwned" ||
      normalized.includes("password incorrect") ||
      normalized.includes("invalid password") ||
      normalized.includes("credentials")
    ) {
      return {
        title: "Incorrect Credentials",
        message: "Incorrect email or password.",
      };
    }

    // 11. Email registered with different method (e.g. signed up with password, trying with Google, or vice versa)
    if (
      code === "form_identifier_exists" ||
      code === "strategy_mismatch" ||
      code === "oauth_email_already_exists" ||
      normalized.includes("different method") ||
      normalized.includes("different sign-in") ||
      normalized.includes("already registered with password")
    ) {
      return {
        title: "Different Sign-in Method",
        message: "This email is already registered using a different method. Please sign in with your email and password.",
      };
    }
  }

  // 12. Fallback friendly error
  return {
    title: "Sign-in Error",
    message: "Something went wrong while signing in. Please try again.",
  };
}
