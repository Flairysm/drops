import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

// Registration schema
const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

type RegistrationData = z.infer<typeof registrationSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signUp, loading } = useSupabaseAuth();
  
  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      phoneNumber: "",
    },
  });

  const handleSubmit = async (data: RegistrationData) => {
    try {
      console.log('🚀 Starting registration for:', data.email);
      
      const { data: signUpData, error } = await signUp(data.email, data.password, {
        username: data.username,
        phoneNumber: data.phoneNumber
      });

      console.log('📧 Registration result:', { signUpData, error });

      if (error) {
        console.error('❌ Registration error:', error);
        toast({
          title: "Registration Failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if email verification is required
      if (signUpData.user && !signUpData.user.email_confirmed_at) {
        console.log('📧 Email verification required, redirecting to email-sent');
        // Store the email for the email sent page
        localStorage.setItem('pendingVerificationEmail', data.email);
        
        // Add a small delay to ensure the redirect happens
        setTimeout(() => {
          console.log('🚀 Redirecting to /email-sent');
          setLocation("/email-sent");
        }, 100);
      } else if (signUpData.user && signUpData.user.email_confirmed_at) {
        console.log('✅ Email already verified, redirecting to home');
        // Email already verified, redirect to home
        toast({
          title: "Account Created!",
          description: "Welcome to Drops!",
        });
        setTimeout(() => {
          setLocation("/");
        }, 100);
      } else {
        console.log('🔄 Fallback: redirecting to email-sent');
        // Fallback
        localStorage.setItem('pendingVerificationEmail', data.email);
        setTimeout(() => {
          setLocation("/email-sent");
        }, 100);
      }
    } catch (error: any) {
      console.error('💥 Registration exception:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: RegistrationData) => {
    handleSubmit(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/80 border-blue-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-gaming text-blue-400">Join the Arcade</CardTitle>
          <CardDescription className="text-gray-300">
            Create your account to start collecting cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-200">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                {...form.register("username")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="Choose a username"
              />
              {form.formState.errors.username && (
                <p className="text-red-400 text-sm">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                {...form.register("email")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="your@email.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-400 text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                {...form.register("password")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="Create a secure password"
              />
              {form.formState.errors.password && (
                <p className="text-red-400 text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-200">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                data-testid="input-phone"
                {...form.register("phoneNumber")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="+60 12-345 6789"
                required
              />
              {form.formState.errors.phoneNumber && (
                <p className="text-red-400 text-sm">{form.formState.errors.phoneNumber.message}</p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="button-register"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="text-blue-400 hover:text-blue-300 underline"
                data-testid="link-login"
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