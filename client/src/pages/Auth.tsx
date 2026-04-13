import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [, navigate] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign Up form state
  const [signUpForm, setSignUpForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Sign In form state
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
  });

  // tRPC mutations
  const signUpMutation = trpc.customAuth.signup.useMutation();
  const signInMutation = trpc.customAuth.signin.useMutation();

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!signUpForm.username.trim()) {
      setError("Username is required");
      return;
    }
    if (!signUpForm.email.trim()) {
      setError("Email is required");
      return;
    }
    if (signUpForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signUpMutation.mutateAsync({
        username: signUpForm.username,
        email: signUpForm.email,
        password: signUpForm.password,
      });

      toast.success("Account created successfully!");
      window.location.href = "/";
    } catch (err: any) {
      const message = err.message || "Sign up failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!signInForm.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!signInForm.password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      await signInMutation.mutateAsync({
        email: signInForm.email,
        password: signInForm.password,
      });

      toast.success("Signed in successfully!");
      window.location.href = "/";
    } catch (err: any) {
      const message = err.message || "Sign in failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Panel - Welcome Back / Sign In */}
          <div
            className={`bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl transform transition-all duration-500 ${
              isSignUp ? "md:order-2 opacity-75" : "md:order-1 opacity-100"
            }`}
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-3">
                  {isSignUp ? "Already a member?" : "Welcome Back!"}
                </h2>
                <p className="text-blue-100 text-lg">
                  {isSignUp
                    ? "Sign in to access all features"
                    : "Enter your personal details to use all of site features"}
                </p>
              </div>

              <Button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                variant="outline"
                className="w-full md:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-2 px-8 rounded-lg transition-all"
              >
                {isSignUp ? "SIGN IN" : "SIGN UP"}
              </Button>
            </div>
          </div>

          {/* Right Panel - Create Account / Sign Up Form */}
          <div
            className={`bg-white rounded-3xl p-8 md:p-12 shadow-2xl transform transition-all duration-500 ${
              isSignUp ? "md:order-1 opacity-100" : "md:order-2 opacity-75"
            }`}
          >
            <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
                {isSignUp ? "Create Account" : "Sign In"}
              </h3>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={isSignUp ? handleSignUp : handleSignIn}
                className="space-y-4"
              >
                {/* Username field (Sign Up only) */}
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username
                    </label>
                    <Input
                      type="text"
                      placeholder="john_doe"
                      value={signUpForm.username}
                      onChange={(e) =>
                        setSignUpForm({ ...signUpForm, username: e.target.value })
                      }
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={isSignUp ? signUpForm.email : signInForm.email}
                    onChange={(e) => {
                      if (isSignUp) {
                        setSignUpForm({ ...signUpForm, email: e.target.value });
                      } else {
                        setSignInForm({ ...signInForm, email: e.target.value });
                      }
                    }}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={isSignUp ? signUpForm.password : signInForm.password}
                      onChange={(e) => {
                        if (isSignUp) {
                          setSignUpForm({ ...signUpForm, password: e.target.value });
                        } else {
                          setSignInForm({ ...signInForm, password: e.target.value });
                        }
                      }}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password field (Sign Up only) */}
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signUpForm.confirmPassword}
                      onChange={(e) =>
                        setSignUpForm({
                          ...signUpForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pr-12"
                    />
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : (
                    <>{isSignUp ? "SIGN UP" : "SIGN IN"}</>
                  )}
                </Button>
              </form>

              {/* Toggle link */}
              <p className="text-center text-slate-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
