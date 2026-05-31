import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// Vite environment variables (prefixed with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Setup the raw supabase client
const rawSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Track in-flight requests to reuse their promises and prevent duplicate network calls
const inFlightRequests = new Map<string, Promise<any>>();

// Graceful rate limit (429) handler
const handleRateLimitError = (error: any) => {
  const errMsg = error?.message || "Too many requests. Please try again later.";
  toast.error("Rate Limit Exceeded", {
    description: errMsg,
  });
  console.error("[Supabase 429 Rate Limit Error]", error);
};

// Get clean calling source line for debugging duplicate requests
const getSourceLine = (): string => {
  const stack = new Error().stack || "";
  const lines = stack.split("\n");
  const source = lines.find(
    (line) => line.includes("/src/") && !line.includes("supabase.ts") && !line.includes("node_modules")
  );
  return source ? source.trim() : "unknown origin";
};

// Proxy to intercept PostgrestBuilder chains dynamically
const createBuilderProxy = (builder: any, queryParts: string[] = []): any => {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === "then") {
        return function (onfulfilled: any, onrejected: any) {
          const queryKey = queryParts.join(".");
          const source = getSourceLine();

          if (inFlightRequests.has(queryKey)) {
            console.warn(
              `[Supabase Duplicate Request Prevented] Simultaneous query blocked and reused for key: ${queryKey}. Source: ${source}`
            );
            return inFlightRequests.get(queryKey)!.then(onfulfilled, onrejected);
          }

          const promise = new Promise((resolve, reject) => {
            target.then(
              (res: any) => {
                inFlightRequests.delete(queryKey);
                // Intercept rate limit errors
                if (
                  res &&
                  (res.status === 429 ||
                    (res.error &&
                      (res.error.status === 429 ||
                        String(res.error.message).includes("rate limit") ||
                        String(res.error.message).includes("429"))))
                ) {
                  handleRateLimitError(res.error || res);
                }
                resolve(res);
              },
              (err: any) => {
                inFlightRequests.delete(queryKey);
                reject(err);
              }
            );
          });

          inFlightRequests.set(queryKey, promise);
          return promise.then(onfulfilled, onrejected);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return function (...args: any[]) {
          const argStr = args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
            .join(",");
          const newParts = [...queryParts, `${String(prop)}(${argStr})`];
          const result = value.apply(target, args);

          if (result && typeof result === "object" && typeof result.then === "function") {
            return createBuilderProxy(result, newParts);
          }
          return result;
        };
      }

      return value;
    },
  });
};

// Proxy to intercept auth client operations
const createAuthProxy = (auth: any): any => {
  return new Proxy(auth, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return function (...args: any[]) {
          const methodName = String(prop);

          // Intercept and throttle critical auth requests
          if (
            [
              "signInWithPassword",
              "signUp",
              "resetPasswordForEmail",
              "signOut",
              "updateUser",
              "getUser",
            ].includes(methodName)
          ) {
            const argStr = args
              .map((a) => {
                if (typeof a === "object") {
                  const safeObj = { ...a };
                  if ("password" in safeObj) safeObj.password = "***";
                  return JSON.stringify(safeObj);
                }
                return String(a);
              })
              .join(",");
            const queryKey = `auth.${methodName}(${argStr})`;
            const source = getSourceLine();

            if (inFlightRequests.has(queryKey)) {
              console.warn(
                `[Supabase Duplicate Auth Request Prevented] Simultaneous request blocked and reused for key: ${queryKey}. Source: ${source}`
              );
              return inFlightRequests.get(queryKey)!;
            }

            // Implement client-side 30-second cooldown throttle for resetPasswordForEmail
            if (methodName === "resetPasswordForEmail") {
              const lastResetTime = localStorage.getItem("last_password_reset_time");
              if (lastResetTime) {
                const elapsed = Date.now() - Number(lastResetTime);
                if (elapsed < 30000) {
                  const remaining = Math.ceil((30000 - elapsed) / 1000);
                  const rateLimitErr = {
                    status: 429,
                    message: `Please wait ${remaining} seconds before requesting another reset email.`,
                  };
                  toast.error("Rate limit exceeded", { description: rateLimitErr.message });
                  return Promise.resolve({ data: null, error: rateLimitErr });
                }
              }
              localStorage.setItem("last_password_reset_time", String(Date.now()));
            }

            const promise = value.apply(target, args).then(
              (res: any) => {
                inFlightRequests.delete(queryKey);
                if (
                  res &&
                  (res.status === 429 ||
                    (res.error &&
                      (res.error.status === 429 ||
                        String(res.error.message).includes("rate limit") ||
                        String(res.error.message).includes("429"))))
                ) {
                  handleRateLimitError(res.error || res);
                }
                return res;
              },
              (err: any) => {
                inFlightRequests.delete(queryKey);
                throw err;
              }
            );

            inFlightRequests.set(queryKey, promise);
            return promise;
          }

          return value.apply(target, args);
        };
      }
      return value;
    },
  });
};

// Wrap core Supabase client in a Proxy to redirect queries and auth through our loggers and deduplicators
export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return function (table: string) {
        const originalBuilder = target.from(table);
        return createBuilderProxy(originalBuilder, [`from("${table}")`]);
      };
    }
    if (prop === "auth") {
      const originalAuth = target.auth;
      return createAuthProxy(originalAuth);
    }
    return Reflect.get(target, prop, receiver);
  },
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return false;

  return (
    url !== "https://placeholder-url.supabase.co" &&
    url !== "https://your-project-id.supabase.co" &&
    !url.includes("your-project-id") &&
    key !== "placeholder-anon-key" &&
    !key.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
  );
};

