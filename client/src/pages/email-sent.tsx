import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function EmailSent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useSupabaseAuth();
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Get pending email from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    if (storedEmail) {
      setPendingEmail(storedEmail);
    }
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check if user is authenticated and email is not verified
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      // Email is already verified, redirect to home
      localStorage.removeItem('pendingVerificationEmail');
      setLocation("/");
    } else if (user && !user.email_confirmed_at) {
      // User exists but email not verified, stay on this page
      setPendingEmail(user.email || null);
    } else if (!user && !pendingEmail) {
      // No user and no pending email, redirect to login
      setLocation("/login");
    }
  }, [user, pendingEmail, setLocation]);

  const handleResendVerification = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      if (user) {
        // User is logged in but not verified, sign out first
        await signOut();
      }
      
      setEmailSent(true);
      setCountdown(60); // 60 second cooldown
      toast({
        title: "📧 Verification Email Sent!",
        description: "A new verification email has been sent to your inbox.",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    setLocation("/login");
  };

  const handleGoBack = () => {
    setLocation("/register");
  };

  if (!user && !pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/80 border-blue-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-green-500/20 rounded-full">
            <Mail className="h-12 w-12 text-green-400" />
          </div>
          <CardTitle className="text-3xl font-gaming text-green-400">
            📧 Email Sent!
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            We've sent a verification link to:
          </CardDescription>
          <p className="text-blue-400 font-medium text-xl mt-2">{user?.email || pendingEmail}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium mb-2 text-green-400">✅ Verification email delivered!</p>
                <p>Click the verification link in your email to activate your account.</p>
                <p className="mt-2 text-xs text-yellow-400 font-medium">
                  ⚠️ Don't see the email? Check your spam/junk folder!
                </p>
              </div>
            </div>
          </div>

          {/* Resend Success Message */}
          {emailSent && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-400">
                  📧 New verification email sent! Please check your inbox.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={isResending || countdown > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <div className="flex space-x-2">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Register
              </Button>

              <Button
                onClick={handleGoToLogin}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Go to Login
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-400">
            <p>
              Already verified?{" "}
              <Link 
                href="/login" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
