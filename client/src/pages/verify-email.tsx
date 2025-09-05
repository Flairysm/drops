import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useSupabaseAuth();
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Get pending email from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    if (storedEmail) {
      setPendingEmail(storedEmail);
    }
  }, []);

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
    setIsResending(true);
    try {
      if (user) {
        // User is logged in but not verified, sign out first
        await signOut();
      }
      
      setEmailSent(true);
      toast({
        title: "Verification Email Sent",
        description: "Please check your email and click the verification link.",
      });
      
      // Redirect to login after a delay
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
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
          <div className="mx-auto mb-4 p-3 bg-blue-500/20 rounded-full">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-gaming text-blue-400">
            📧 Check Your Email
          </CardTitle>
          <CardDescription className="text-gray-300">
            We've sent a verification link to:
          </CardDescription>
          <p className="text-blue-400 font-medium text-lg">{user?.email || pendingEmail}</p>
          <p className="text-gray-400 text-sm mt-2">
            Click the link in the email to activate your account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium mb-1">📬 Check your email inbox</p>
                <p>Click the verification link in the email to activate your account.</p>
                <p className="mt-2 text-xs text-yellow-400 font-medium">
                  ⚠️ Don't see the email? Check your spam/junk folder!
                </p>
              </div>
            </div>
          </div>

          {emailSent && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-400">
                  Verification email sent! Please check your inbox.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <Button
              onClick={handleGoToLogin}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Back to Login
            </Button>
          </div>

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
