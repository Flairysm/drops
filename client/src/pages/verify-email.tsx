import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, CheckCircle } from "lucide-react";

// Email verification schema - only token required
const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

type EmailVerificationData = z.infer<typeof emailVerificationSchema>;

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState<string>("");
  
  const form = useForm<EmailVerificationData>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      token: "",
    },
  });

  // Get email from URL parameters or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (data: EmailVerificationData) => {
      if (!email) {
        throw new Error("Email not found. Please try registering again.");
      }
      return await apiRequest("POST", "/api/auth/verify-email", {
        email,
        token: data.token,
      });
    },
    onSuccess: () => {
      // Clean up localStorage
      localStorage.removeItem('pendingVerificationEmail');
      
      toast({
        title: "Email Verified!",
        description: "Your email has been verified successfully. You can now log in.",
      });
      setIsVerified(true);
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification token.",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error("Email not found. Please try registering again.");
      }
      return await apiRequest("POST", "/api/auth/send-verification", { email });
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent to your email address.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Email",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailVerificationData) => {
    verifyMutation.mutate(data);
  };

  const onResendEmail = () => {
    resendMutation.mutate();
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <Card className="w-full max-w-md bg-gray-900/80 border-green-500/30 shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-gaming text-green-400">Email Verified!</CardTitle>
            <CardDescription className="text-gray-300">
              Your email has been verified successfully. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/80 border-blue-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-gaming text-blue-400">Verify Your Email</CardTitle>
          <CardDescription className="text-gray-300">
            {email ? `Enter the verification code sent to ${email}` : "Enter your verification code to complete registration"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!email && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                Email not found. Please try registering again or check the verification link in your email.
              </p>
            </div>
          )}
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-gray-200">Verification Code</Label>
              <Input
                id="token"
                data-testid="input-token"
                {...form.register("token")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 text-center text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                maxLength={32}
              />
              {form.formState.errors.token && (
                <p className="text-red-400 text-sm">{form.formState.errors.token.message}</p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="button-verify"
              disabled={verifyMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={onResendEmail}
              disabled={resendMutation.isPending}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {resendMutation.isPending ? "Sending..." : "Resend Verification Email"}
            </Button>

            <div className="text-center">
              <p className="text-gray-300">
                Already verified?{" "}
                <Link 
                  href="/login" 
                  className="text-blue-400 hover:text-blue-300 underline"
                  data-testid="link-login"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
